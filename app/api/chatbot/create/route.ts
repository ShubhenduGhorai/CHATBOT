import { NextRequest, NextResponse } from 'next/server';
import { createChatbotSchema } from '@/lib/validators';
import { requireWorkspaceOwnership } from '@/lib/auth/guards';
import { buildEmbedConfig, createChatbot } from '@/lib/services/chatbot.service';
import { handleApiError } from '@/lib/http/error-handler';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createChatbotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid chatbot payload'
        }
      },
      { status: 400 }
    );
  }

  const access = await requireWorkspaceOwnership(request, parsed.data.workspaceId);
  if (!access) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Workspace access denied'
        }
      },
      { status: 403 }
    );
  }

  try {
    const chatbot = await createChatbot({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          chatbot: {
            id: chatbot.id,
            name: chatbot.name,
            apiKey: chatbot.apiKey,
            workspaceId: chatbot.workspaceId,
            createdAt: chatbot.createdAt
          },
          embed: buildEmbedConfig(chatbot.apiKey)
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
