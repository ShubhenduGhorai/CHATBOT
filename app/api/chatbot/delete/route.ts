import { NextRequest, NextResponse } from 'next/server';
import { deleteChatbotSchema } from '@/lib/validators';
import { requireWorkspaceOwnership } from '@/lib/auth/guards';
import { deleteChatbot } from '@/lib/services/chatbot.service';
import { handleApiError } from '@/lib/http/error-handler';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = deleteChatbotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid delete payload'
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

    const deleted = await deleteChatbot({
      workspaceId: parsed.data.workspaceId,
      chatbotId: parsed.data.chatbotId
    });

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Chatbot not found in workspace'
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        chatbotId: parsed.data.chatbotId,
        deleted: true
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
