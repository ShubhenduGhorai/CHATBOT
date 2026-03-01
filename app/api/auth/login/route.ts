import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { setAuthCookie } from '@/lib/auth/cookies';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validators';
import { signAccessToken } from '@/lib/auth/jwt';
import { createWorkspaceBillingProfile } from '@/lib/services/subscription.service';
import { handleApiError } from '@/lib/http/error-handler';

function getDefaultWorkspaceName(name: string) {
  return `${name}'s Workspace`;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = loginSchema.parse(json);

    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(payload.password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let workspace = await prisma.workspace.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'asc' }
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          ownerId: user.id,
          name: getDefaultWorkspaceName(user.name)
        }
      });

      await createWorkspaceBillingProfile({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        ownerEmail: user.email,
        ownerName: user.name
      });
    }

    const existingSubscription = await prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
      select: { id: true }
    });

    if (!existingSubscription) {
      await createWorkspaceBillingProfile({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        ownerEmail: user.email,
        ownerName: user.name
      });
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: workspace.id
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      workspace: {
        id: workspace.id,
        name: workspace.name
      }
    });
    setAuthCookie(response, accessToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
