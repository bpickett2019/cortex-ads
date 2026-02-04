// =============================================
// Settings API - Subscription Status
// =============================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('subscription_tier, subscription_status, stripe_subscription_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: clinic.subscription_tier,
        status: clinic.subscription_status,
        stripeSubscriptionId: clinic.stripe_subscription_id,
      },
    });

  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
