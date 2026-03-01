import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createWorkspaceSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/guards';
import { createWorkspaceBillingProfile } from '@/lib/services/subscription.service';
import { handleApiError } from '@/lib/http/error-handler';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const payload = createWorkspaceSchema.parse(json);

    const workspace = await prisma.$transaction(async (tx) => {
      const createdWorkspace = await tx.workspace.create({
        data: {
          name: payload.name,
          ownerId: String(auth.sub)
        }
      });

      return createdWorkspace;
    });

    const owner = await prisma.user.findUnique({
      where: { id: String(auth.sub) },
      select: { email: true, name: true }
    });

    if (!owner) {
      return NextResponse.json({ error: 'Workspace owner not found' }, { status: 404 });
    }

    await createWorkspaceBillingProfile({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerEmail: owner.email,
      ownerName: owner.name
    });

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          ownerId: workspace.ownerId,
          createdAt: workspace.createdAt
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
