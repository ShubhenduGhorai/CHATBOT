import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSchema } from '@/lib/validators';
import { requireWorkspaceOwnership } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getStripe } from '@/lib/stripe';
import { handleApiError } from '@/lib/http/error-handler';
import { env } from '@/lib/config/env';

const PRICE_ID_BY_PLAN: Record<'PRO' | 'BUSINESS', string | undefined> = {
  PRO: env.STRIPE_PRICE_ID_PRO,
  BUSINESS: env.STRIPE_PRICE_ID_BUSINESS
};

function getCheckoutUrls() {
  return {
    successUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=success`,
    cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=cancel`
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid checkout payload' }, { status: 400 });
    }

    const access = await requireWorkspaceOwnership(request, parsed.data.workspaceId);
    if (!access) {
      return NextResponse.json({ error: 'Workspace access denied' }, { status: 403 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: parsed.data.workspaceId },
      select: { stripeCustomerId: true }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription profile not found' }, { status: 404 });
    }

    const priceId = PRICE_ID_BY_PLAN[parsed.data.plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price is not configured for plan' }, { status: 500 });
    }

    const stripe = getStripe();
    const urls = getCheckoutUrls();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: subscription.stripeCustomerId,
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      metadata: {
        workspaceId: parsed.data.workspaceId,
        plan: parsed.data.plan
      },
      subscription_data: {
        metadata: {
          workspaceId: parsed.data.workspaceId,
          plan: parsed.data.plan
        }
      }
    });

    return NextResponse.json({
      checkout: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
