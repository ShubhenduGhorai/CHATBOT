import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/config/env';

const FREE_PLAN_MESSAGE_LIMIT = env.FREE_PLAN_MESSAGE_LIMIT;
const PRO_PLAN_MESSAGE_LIMIT = 1000;

type CreateWorkspaceBillingInput = {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  ownerName: string;
};

function getBillingStatusForPlan(plan: SubscriptionPlan): SubscriptionStatus {
  if (plan === 'FREE') {
    return 'ACTIVE';
  }

  return 'TRIALING';
}

export async function createWorkspaceBillingProfile(input: CreateWorkspaceBillingInput) {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email: input.ownerEmail,
    name: input.ownerName,
    metadata: {
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName
    }
  });

  return prisma.subscription.create({
    data: {
      workspaceId: input.workspaceId,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: null,
      status: getBillingStatusForPlan('FREE'),
      plan: 'FREE'
    }
  });
}

export function getPlanMessageLimit(plan: SubscriptionPlan): number | null {
  if (plan === 'FREE') {
    return FREE_PLAN_MESSAGE_LIMIT;
  }

  if (plan === 'PRO') {
    return PRO_PLAN_MESSAGE_LIMIT;
  }

  return null;
}

export function isSubscriptionUsable(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'TRIALING';
}

export function startOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}
