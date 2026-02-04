// =============================================
// Stripe Client-Side Helpers
// =============================================

import { loadStripe, Stripe as StripeType } from '@stripe/stripe-js';

let stripePromise: Promise<StripeType | null>;

export function getStripe(): Promise<StripeType | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
