// =============================================
// Apify Webhook Handler
// Receives scraper completion notifications
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { fetchScraperResults, processScrapedAds } from '@/lib/scraper/apify';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/utils/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook secret
    const webhookSecret = request.headers.get('x-apify-webhook-secret');
    if (webhookSecret !== process.env.APIFY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      eventType, 
      resource, 
      clinicId, 
      competitorId 
    } = body;

    // Only process successful runs
    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      console.log(`Apify run ${resource?.id} did not succeed: ${eventType}`);
      return NextResponse.json({ status: 'ignored' });
    }

    const datasetId = resource?.defaultDatasetId;
    const runId = resource?.id;

    if (!datasetId || !clinicId || !competitorId) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Fetch results
    const ads = await fetchScraperResults(datasetId);
    
    // Process and store
    const { stored, analyzed } = await processScrapedAds(
      ads, 
      clinicId, 
      competitorId
    );

    // Update job status
    await supabaseAdmin
      .from('scraping_jobs')
      .update({
        status: 'completed',
        ads_found: ads.length,
        ads_stored: stored,
        completed_at: new Date().toISOString(),
      })
      .eq('apify_run_id', runId);

    // Audit log
    await auditLog({
      clinicId: clinicId,
      action: 'scraper_completed',
      entityType: 'scraping_job',
      entityId: runId,
      actor: 'system',
      details: { ads_found: ads.length, ads_stored: stored },
    });

    return NextResponse.json({
      success: true,
      ads_found: ads.length,
      ads_stored: stored,
      ads_analyzed: analyzed,
    });

  } catch (error) {
    console.error('Apify webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
