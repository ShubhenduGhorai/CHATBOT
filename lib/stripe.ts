import Stripe from 'stripe';
import { env } from '@/lib/config/env';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (stripeClient) {
    return stripeClient;
  }

  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: {
      name: 'chatbot-saas',
      version: '0.1.0'
    }
  });

  return stripeClient;
}
