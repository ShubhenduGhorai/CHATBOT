import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/config/env';

const PRICE_TO_PLAN: Record<string, SubscriptionPlan> = {
  [env.STRIPE_PRICE_ID_PRO ?? '']: 'PRO',
  [env.STRIPE_PRICE_ID_BUSINESS ?? '']: 'BUSINESS'
};

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'incomplete':
      return 'INCOMPLETE';
    case 'incomplete_expired':
      return 'INCOMPLETE_EXPIRED';
    case 'unpaid':
      return 'UNPAID';
    default:
      return 'INCOMPLETE';
  }
}

function inferPlanFromStripeSubscription(subscription: Stripe.Subscription): SubscriptionPlan {
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && PRICE_TO_PLAN[priceId]) {
    return PRICE_TO_PLAN[priceId];
  }

  const planFromMetadata = subscription.metadata?.plan;
  if (planFromMetadata === 'PRO' || planFromMetadata === 'BUSINESS') {
    return planFromMetadata;
  }

  return 'FREE';
}

async function updateFromSubscriptionObject(subscription: Stripe.Subscription) {
  const stripeCustomerId = String(subscription.customer);

  await prisma.subscription.updateMany({
    where: { stripeCustomerId },
    data: {
      stripeSubscriptionId: subscription.id,
      status: mapStripeStatus(subscription.status),
      plan: inferPlanFromStripeSubscription(subscription)
    }
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeCustomerId = session.customer ? String(session.customer) : null;
  const stripeSubscriptionId = session.subscription ? String(session.subscription) : null;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    return;
  }

  const planFromMetadata = session.metadata?.plan;
  const plan: SubscriptionPlan =
    planFromMetadata === 'PRO' || planFromMetadata === 'BUSINESS' ? planFromMetadata : 'FREE';

  await prisma.subscription.updateMany({
    where: { stripeCustomerId },
    data: {
      stripeSubscriptionId,
      status: 'ACTIVE',
      plan
    }
  });
}

export async function POST(request: Request) {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret is missing' }, { status: 500 });
  }

  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await updateFromSubscriptionObject(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
