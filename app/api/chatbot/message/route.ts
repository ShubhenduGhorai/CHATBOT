import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  appendAssistantMessage,
  appendUserMessage,
  createOpenAIResponseStream
} from '@/lib/ai';
import { handleApiError } from '@/lib/http/error-handler';
import { buildCorsHeaders } from '@/lib/security/cors';

const messageSchema = z.object({
  apiKey: z.string().min(1),
  message: z.string().min(1).max(8000),
  visitorId: z.string().min(1).max(255)
});

function jsonWithCors(request: NextRequest, payload: unknown, status: number) {
  const corsHeaders = buildCorsHeaders(request, 'POST, OPTIONS');
  return NextResponse.json(payload, {
    status,
    headers: corsHeaders
  });
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request, 'POST, OPTIONS');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCors(
      request,
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid message payload'
        }
      },
      400
    );
  }

  const conversationContext = await appendUserMessage(parsed.data);
  if (conversationContext.type === 'invalid_api_key') {
    return jsonWithCors(
      request,
      {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Chatbot API key is invalid'
        }
      },
      401
    );
  }

  if (conversationContext.type === 'inactive_subscription') {
    return jsonWithCors(
      request,
      {
        success: false,
        error: {
          code: 'SUBSCRIPTION_INACTIVE',
          message: 'Subscription is inactive'
        }
      },
      402
    );
  }

  if (conversationContext.type === 'usage_limit_exceeded') {
    return jsonWithCors(
      request,
      {
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          message: `Plan limit reached for ${conversationContext.plan}`,
          limit: conversationContext.limit
        }
      },
      402
    );
  }

  try {
    const upstream = await createOpenAIResponseStream(conversationContext.messages);
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';
    let assistantText = '';

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.getReader();

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) {
                continue;
              }

              const payload = trimmed.slice(5).trim();
              if (payload === '[DONE]') {
                continue;
              }

              try {
                const parsedChunk = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const chunkText = parsedChunk.choices?.[0]?.delta?.content;

                if (!chunkText) {
                  continue;
                }

                assistantText += chunkText;
                controller.enqueue(encoder.encode(chunkText));
              } catch {
                continue;
              }
            }
          }
        } finally {
          if (assistantText.length > 0) {
            await appendAssistantMessage(conversationContext.conversationId, assistantText);
          }

          controller.close();
          reader.releaseLock();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        ...buildCorsHeaders(request, 'POST, OPTIONS'),
        'Access-Control-Expose-Headers': 'X-Conversation-Id, X-Workspace-Id',
        'X-Conversation-Id': conversationContext.conversationId,
        'X-Workspace-Id': conversationContext.chatbot.workspaceId
      }
    });
  } catch (error) {
    return handleApiError(error, { defaultStatus: 502 });
  }
}
