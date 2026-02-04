// =============================================
// Step 12: Stripe Billing Integration
// Subscription management with Stripe
// =============================================

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

export { STRIPE_WEBHOOK_SECRET };

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    monthlyPrice: 997,
    adSpendLimit: 5000,
    features: ['10 ad concepts/month', 'Basic compliance', 'Email support'],
  },
  growth: {
    name: 'Growth',
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    monthlyPrice: 1497,
    adSpendLimit: 15000,
    features: ['25 ad concepts/month', 'Advanced compliance', 'Priority support', 'Competitor tracking'],
  },
  full_stack: {
    name: 'Full Stack',
    priceId: process.env.STRIPE_FULL_STACK_PRICE_ID!,
    monthlyPrice: 1997,
    adSpendLimit: 50000,
    features: ['Unlimited ad concepts', 'White-glove compliance', 'Dedicated support', 'API access'],
  },
};

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
