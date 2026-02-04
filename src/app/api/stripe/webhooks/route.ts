// =============================================
// Stripe Webhook Handler
// Process subscription events
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe/config';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const clinicId = session.metadata?.clinic_id;
        const tier = session.metadata?.tier;
        const subscriptionId = session.subscription as string;

        if (clinicId && subscriptionId) {
          await supabaseAdmin
            .from('clinics')
            .update({
              stripe_subscription_id: subscriptionId,
              subscription_tier: tier,
            })
            .eq('id', clinicId);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        // Update subscription status if needed
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const clinicId = subscription.metadata.clinic_id;

          if (clinicId) {
            await supabaseAdmin
              .from('clinics')
              .update({
                subscription_status: 'active',
              })
              .eq('id', clinicId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const clinicId = subscription.metadata.clinic_id;

          if (clinicId) {
            await supabaseAdmin
              .from('clinics')
              .update({
                subscription_status: 'past_due',
              })
              .eq('id', clinicId);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clinicId = subscription.metadata.clinic_id;

        if (clinicId) {
          await supabaseAdmin
            .from('clinics')
            .update({
              subscription_tier: 'starter',
              stripe_subscription_id: null,
            })
            .eq('id', clinicId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const clinicId = subscription.metadata.clinic_id;

        if (clinicId) {
          // Get tier from product metadata
          const price = await stripe.prices.retrieve(
            subscription.items.data[0].price.id
          );
          const product = await stripe.products.retrieve(
            price.product as string
          );
          const tier = product.metadata.tier;

          if (tier) {
            await supabaseAdmin
              .from('clinics')
              .update({
                subscription_tier: tier,
              })
              .eq('id', clinicId);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
