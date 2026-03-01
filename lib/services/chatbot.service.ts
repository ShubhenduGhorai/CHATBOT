import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/config/env';

const API_KEY_PREFIX = 'cb_live_';
const MAX_API_KEY_RETRY = 3;

function generateApiKey() {
  return `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export async function createChatbot(input: { workspaceId: string; name: string }) {
  for (let attempt = 0; attempt < MAX_API_KEY_RETRY; attempt += 1) {
    try {
      return await prisma.chatbot.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          apiKey: generateApiKey()
        }
      });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (!isUniqueViolation || attempt === MAX_API_KEY_RETRY - 1) {
        throw error;
      }
    }
  }

  throw new Error('Could not generate a unique API key');
}

export async function listChatbots(workspaceId: string) {
  return prisma.chatbot.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      apiKey: true,
      workspaceId: true,
      createdAt: true
    }
  });
}

export async function deleteChatbot(input: { workspaceId: string; chatbotId: string }) {
  const deleted = await prisma.chatbot.deleteMany({
    where: {
      id: input.chatbotId,
      workspaceId: input.workspaceId
    }
  });

  return deleted.count > 0;
}

export function buildEmbedConfig(apiKey: string) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  return {
    scriptUrl: `${appUrl}/api/widget/${apiKey}`,
    widgetUrl: `${appUrl}/api/chatbot/message`,
    snippet: `<script src="${appUrl}/api/widget/${apiKey}" defer></script>`
  };
}
