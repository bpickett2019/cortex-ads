// =============================================
// Meta OAuth Callback
// Handle OAuth redirect from Meta
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getAdAccounts,
  storeMetaTokens,
} from '@/lib/meta/auth';
import { auditLog } from '@/lib/utils/audit';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state'); // Contains clinicId

    // Handle OAuth errors
    if (error) {
      console.error('Meta OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=meta_auth_denied&reason=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=invalid_oauth_response', request.url)
      );
    }

    const clinicId = state;

    // Exchange code for token
    const { accessToken, expiresIn } = await exchangeCodeForToken(code);

    // Get long-lived token
    const longLivedToken = await getLongLivedToken(accessToken);

    // Get available ad accounts
    const adAccounts = await getAdAccounts(longLivedToken);
    
    if (adAccounts.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=no_ad_accounts', request.url)
      );
    }

    // Use first active ad account (or let user select in full implementation)
    const activeAccount = adAccounts.find(a => a.accountStatus === 1) || adAccounts[0];

    // Store tokens
    await storeMetaTokens(
      clinicId,
      longLivedToken,
      expiresIn * 2, // Long-lived tokens last ~60 days
      activeAccount.id
    );

    // Audit log
    await auditLog({
      clinicId: clinicId,
      action: 'meta_connected',
      entityType: 'clinic',
      entityId: clinicId,
      actor: 'owner',
      details: { ad_account_id: activeAccount.id },
    });

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=meta_connected', request.url)
    );

  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=oauth_processing_failed', request.url)
    );
  }
}
