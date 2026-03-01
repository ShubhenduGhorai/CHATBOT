import { NextRequest } from 'next/server';
import { getAuthCookieToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

export async function requireAuth(request: NextRequest) {
  const token = getAuthCookieToken(request);
  if (!token) {
    return null;
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireWorkspaceOwnership(request: NextRequest, workspaceId?: string) {
  const auth = await requireAuth(request);
  if (!auth?.sub) {
    return null;
  }

  const targetWorkspaceId =
    workspaceId ?? request.headers.get('x-workspace-id') ?? auth.workspaceId ?? null;

  if (!targetWorkspaceId) {
    return null;
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: targetWorkspaceId,
      ownerId: String(auth.sub)
    },
    select: {
      id: true,
      name: true,
      ownerId: true
    }
  });

  if (!workspace) {
    return null;
  }

  return {
    auth,
    workspace
  };
}
