// =============================================
// Step 11: Performance Tracking Cron
// Pull metrics from Meta Marketing API daily
// =============================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getMetaAccessToken, getAdInsights } from '@/lib/meta/auth';

// Cron secret for authorization
const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any[] = [];

    // Get all clinics with Meta auth and published ads
    const { data: clinics } = await supabaseAdmin
      .from('clinics')
      .select('id, meta_ad_account_id, meta_access_token_encrypted')
      .not('meta_ad_account_id', 'is', null)
      .not('meta_access_token_encrypted', 'is', null);

    if (!clinics || clinics.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clinics with Meta auth found',
        processed: 0,
      });
    }

    const today = new Date().toISOString().split('T')[0];

    for (const clinic of clinics) {
      try {
        // Get access token
        const accessToken = await getMetaAccessToken(clinic.id);
        if (!accessToken) {
          results.push({
            clinic_id: clinic.id,
            status: 'skipped',
            reason: 'no_access_token',
          });
          continue;
        }

        // Get published ad concepts for this clinic
        const { data: ads } = await supabaseAdmin
          .from('ad_concepts')
          .select('id, meta_ad_id')
          .eq('clinic_id', clinic.id)
          .not('meta_ad_id', 'is', null);

        if (!ads || ads.length === 0) {
          results.push({
            clinic_id: clinic.id,
            status: 'skipped',
            reason: 'no_published_ads',
          });
          continue;
        }

        const adIds = ads.map(a => a.meta_ad_id!).filter(Boolean);

        // Fetch insights from Meta
        const insights = await getAdInsights(
          clinic.meta_ad_account_id!,
          accessToken,
          adIds,
          'yesterday'
        );

        // Store performance data
        let stored = 0;
        for (const insight of insights) {
          const adConcept = ads.find(a => a.meta_ad_id === insight.ad_id);
          if (!adConcept) continue;

          // Calculate derived metrics
          const impressions = parseInt(insight.impressions) || 0;
          const clicks = parseInt(insight.clicks) || 0;
          const spend = parseFloat(insight.spend) || 0;
          const ctr = impressions > 0 ? clicks / impressions : 0;
          const cpc = clicks > 0 ? spend / clicks : 0;

          // Count leads from actions
          let leads = 0;
          if (insight.actions) {
            const leadAction = insight.actions.find(
              (a: any) => a.action_type === 'lead' || a.action_type === 'submit_application'
            );
            leads = leadAction ? parseInt(leadAction.value) : 0;
          }
          const cpl = leads > 0 ? spend / leads : 0;

          // Upsert performance record
          const { error } = await supabaseAdmin
            .from('ad_performance')
            .upsert(
              {
                ad_concept_id: adConcept.id,
                clinic_id: clinic.id,
                date: today,
                impressions,
                clicks,
                spend,
                leads,
                ctr,
                cpc,
                cpl,
                raw_insights: insight,
              },
              {
                onConflict: 'ad_concept_id,date',
              }
            );

          if (!error) stored++;
        }

        results.push({
          clinic_id: clinic.id,
          status: 'success',
          ads_checked: ads.length,
          insights_found: insights.length,
          records_stored: stored,
        });

      } catch (error) {
        console.error(`Error processing clinic ${clinic.id}:`, error);
        results.push({
          clinic_id: clinic.id,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      clinics_processed: clinics.length,
      results,
    });

  } catch (error) {
    console.error('Performance pull cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export const POST = GET;
