import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { setAuthCookie } from '@/lib/auth/cookies';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/validators';
import { signAccessToken } from '@/lib/auth/jwt';
import { createWorkspaceBillingProfile } from '@/lib/services/subscription.service';
import { handleApiError } from '@/lib/http/error-handler';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = registerSchema.parse(json);
    const passwordHash = await hashPassword(payload.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: passwordHash,
          role: 'USER'
        }
      });

      const workspace = await tx.workspace.create({
        data: {
          name: payload.workspaceName,
          ownerId: user.id
        }
      });

      return { user, workspace };
    });

    await createWorkspaceBillingProfile({
      workspaceId: result.workspace.id,
      workspaceName: result.workspace.name,
      ownerEmail: result.user.email,
      ownerName: result.user.name
    });

    const accessToken = await signAccessToken({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      workspaceId: result.workspace.id
    });

    const response = NextResponse.json(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name
        }
      },
      { status: 201 }
    );
    setAuthCookie(response, accessToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
