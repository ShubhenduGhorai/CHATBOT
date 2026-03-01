import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/config/env';
import {
  getPlanMessageLimit,
  isSubscriptionUsable,
  startOfCurrentMonth
} from '@/lib/services/subscription.service';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = env.OPENAI_MODEL;

function parseConversationMessages(input: Prisma.JsonValue): ConversationMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const parsed: ConversationMessage[] = [];

  for (const rawItem of input) {
    if (typeof rawItem !== 'object' || rawItem === null || Array.isArray(rawItem)) {
      continue;
    }

    const roleValue = Reflect.get(rawItem, 'role');
    const contentValue = Reflect.get(rawItem, 'content');
    const createdAtValue = Reflect.get(rawItem, 'createdAt');

    if (typeof contentValue !== 'string' || contentValue.length === 0) {
      continue;
    }

    parsed.push({
      role: roleValue === 'assistant' ? 'assistant' : 'user',
      content: contentValue,
      createdAt: typeof createdAtValue === 'string' ? createdAtValue : new Date().toISOString()
    });
  }

  return parsed;
}

async function getOrCreateConversation(
  tx: Prisma.TransactionClient,
  chatbotId: string,
  visitorId: string
) {
  const existing = await tx.conversation.findFirst({
    where: { chatbotId, visitorId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return existing;
  }

  return tx.conversation.create({
    data: {
      chatbotId,
      visitorId,
      messages: []
    }
  });
}

async function persistConversationMessages(
  tx: Prisma.TransactionClient,
  conversationId: string,
  messages: ConversationMessage[]
) {
  await tx.conversation.update({
    where: { id: conversationId },
    data: { messages: messages as unknown as Prisma.InputJsonValue }
  });
}

export async function appendUserMessage(input: {
  apiKey: string;
  visitorId: string;
  message: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const chatbot = await tx.chatbot.findUnique({
      where: { apiKey: input.apiKey },
      include: { workspace: { include: { subscription: true } } }
    });

    if (!chatbot) {
      return { type: 'invalid_api_key' } as const;
    }

    const subscription = chatbot.workspace.subscription;
    if (!subscription || !isSubscriptionUsable(subscription.status)) {
      return { type: 'inactive_subscription' } as const;
    }

    const currentMonth = startOfCurrentMonth();
    const shouldResetUsage = chatbot.usageResetAt < currentMonth;
    const currentUsage = shouldResetUsage ? 0 : chatbot.messageCountMonth;
    const limit = getPlanMessageLimit(subscription.plan);

    if (limit !== null && currentUsage >= limit) {
      return {
        type: 'usage_limit_exceeded',
        plan: subscription.plan,
        limit
      } as const;
    }

    const conversation = await getOrCreateConversation(tx, chatbot.id, input.visitorId);
    const existingMessages = parseConversationMessages(conversation.messages);
    const userMessage: ConversationMessage = {
      role: 'user',
      content: input.message,
      createdAt: new Date().toISOString()
    };
    const nextMessages = [...existingMessages, userMessage];

    await persistConversationMessages(tx, conversation.id, nextMessages);
    await tx.chatbot.update({
      where: { id: chatbot.id },
      data: {
        messageCountMonth: currentUsage + 1,
        usageResetAt: shouldResetUsage ? currentMonth : chatbot.usageResetAt
      }
    });

    return {
      type: 'ok',
      chatbot: {
        id: chatbot.id,
        workspaceId: chatbot.workspaceId,
        name: chatbot.name
      },
      conversationId: conversation.id,
      messages: nextMessages
    } as const;
  });

  if (result.type === 'ok') {
    return result;
  }

  return result;
}

export async function appendAssistantMessage(conversationId: string, assistantText: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { messages: true }
  });

  if (!conversation) {
    return;
  }

  const existingMessages = parseConversationMessages(conversation.messages);
  const assistantMessage: ConversationMessage = {
    role: 'assistant',
    content: assistantText,
    createdAt: new Date().toISOString()
  };

  await prisma.$transaction(async (tx) => {
    await persistConversationMessages(tx, conversationId, [...existingMessages, assistantMessage]);
  });
}

export async function createOpenAIResponseStream(messages: ConversationMessage[]) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openAIMessages = messages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      messages: openAIMessages,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  return response.body;
}
