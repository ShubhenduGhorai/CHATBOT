import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireWorkspaceOwnership } from '@/lib/auth/guards';
import { handleApiError } from '@/lib/http/error-handler';

export async function GET(request: NextRequest) {
  try {
    const access = await requireWorkspaceOwnership(request);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: access.workspace.id },
      include: {
        subscription: true,
        chatbots: {
          select: {
            id: true,
            name: true,
            apiKey: true,
            createdAt: true
          }
        }
      }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
        subscription: workspace.subscription
          ? {
              id: workspace.subscription.id,
              plan: workspace.subscription.plan,
              status: workspace.subscription.status,
              createdAt: workspace.subscription.createdAt
            }
          : null,
        chatbots: workspace.chatbots
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
