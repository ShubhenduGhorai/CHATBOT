import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceOwnership } from '@/lib/auth/guards';
import { listChatbots } from '@/lib/services/chatbot.service';
import { handleApiError } from '@/lib/http/error-handler';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? '';

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'workspaceId is required'
          }
        },
        { status: 400 }
      );
    }

    const access = await requireWorkspaceOwnership(request, workspaceId);
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

    const chatbots = await listChatbots(workspaceId);

    return NextResponse.json({
      success: true,
      data: {
        workspaceId,
        chatbots
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
