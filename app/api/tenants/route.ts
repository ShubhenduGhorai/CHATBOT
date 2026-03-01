import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError } from '@/lib/http/error-handler';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: String(auth.sub) },
      include: { subscription: true }
    });

    return NextResponse.json({
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        plan: workspace.subscription?.plan ?? null,
        status: workspace.subscription?.status ?? null
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
