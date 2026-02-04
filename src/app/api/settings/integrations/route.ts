// =============================================
// Settings API - Integrations Status
// =============================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasMetaAuth } from '@/lib/meta/auth';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, meta_ad_account_id, subscription_tier, stripe_subscription_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Check Meta auth status
    const metaConnected = await hasMetaAuth(clinic.id);

    const integrations = [
      {
        id: 'meta',
        name: 'Meta Ads',
        description: 'Connect your Meta Business account to publish ads directly',
        connected: metaConnected,
        accountInfo: clinic.meta_ad_account_id || undefined,
        connectUrl: '/api/meta/oauth',
      },
    ];

    return NextResponse.json({
      success: true,
      integrations,
    });

  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
