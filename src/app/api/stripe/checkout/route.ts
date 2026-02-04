// =============================================
// Stripe Checkout Session
// Create subscription checkout
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  tier: z.enum(['starter', 'growth', 'full_stack']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier } = checkoutSchema.parse(body);

    const supabase = await createClient();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, stripe_customer_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    let customerId = clinic.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: clinic.name,
        metadata: {
          clinic_id: clinic.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store customer ID
      await supabase
        .from('clinics')
        .update({ stripe_customer_id: customerId })
        .eq('id', clinic.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: SUBSCRIPTION_TIERS[tier].priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=subscription_active`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`,
      subscription_data: {
        metadata: {
          clinic_id: clinic.id,
          tier,
        },
      },
      metadata: {
        clinic_id: clinic.id,
        tier,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
