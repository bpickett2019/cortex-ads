// =============================================
// Meta OAuth Initiation
// Start OAuth flow for Meta Ads connection
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { getMetaOAuthUrl } from '@/lib/meta/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=unauthorized', request.url)
      );
    }

    // Get user's clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.redirect(
        new URL('/dashboard/onboarding?error=no_clinic', request.url)
      );
    }

    // Generate OAuth URL
    const oauthUrl = getMetaOAuthUrl(clinic.id);
    
    return NextResponse.redirect(oauthUrl);

  } catch (error) {
    console.error('Meta OAuth initiation error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=oauth_failed', request.url)
    );
  }
}
