import { SubscriptionPlan } from '@prisma/client';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { getPlanMessageLimit } from '@/lib/services/subscription.service';

export type WorkspaceDashboardData = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  plan: SubscriptionPlan;
  status: string;
  chatbots: Array<{
    id: string;
    name: string;
    apiKey: string;
    createdAt: Date;
    messageCountMonth: number;
  }>;
  usage: {
    used: number;
    limit: number | null;
    resetAt: string | null;
  };
};

function formatNextResetDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function getWorkspaceDashboardData(): Promise<WorkspaceDashboardData | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  let auth: Awaited<ReturnType<typeof verifyAccessToken>>;
  try {
    auth = await verifyAccessToken(token);
  } catch {
    return null;
  }

  if (!auth.sub || !auth.workspaceId) {
    return null;
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: String(auth.workspaceId),
      ownerId: String(auth.sub)
    },
    include: {
      subscription: true,
      chatbots: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          apiKey: true,
          createdAt: true,
          messageCountMonth: true
        }
      }
    }
  });

  if (!workspace || !workspace.subscription) {
    return null;
  }

  const used = workspace.chatbots.reduce((total, chatbot) => total + chatbot.messageCountMonth, 0);
  const limit = getPlanMessageLimit(workspace.subscription.plan);

  return {
    userId: String(auth.sub),
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    plan: workspace.subscription.plan,
    status: workspace.subscription.status,
    chatbots: workspace.chatbots,
    usage: {
      used,
      limit,
      resetAt: formatNextResetDate()
    }
  };
}
