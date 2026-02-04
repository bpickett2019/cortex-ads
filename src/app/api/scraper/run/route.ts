// =============================================
// Manual Scraper Trigger
// Start competitor ad scraping on-demand
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { startScraperRun } from '@/lib/scraper/apify';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const triggerSchema = z.object({
  competitorId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitorId } = triggerSchema.parse(body);

    const supabase = await createClient();
    
    // Get clinic ID from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get competitor details
    const { data: competitor } = await supabase
      .from('competitors')
      .select('*, clinics!inner(owner_id)')
      .eq('id', competitorId)
      .maybeSingle();

    if (!competitor) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if ((competitor.clinics as any).owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build Meta Ad Library URL
    const metaLibraryUrl = competitor.meta_page_id
      ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${competitor.meta_page_id}`
      : null;

    if (!metaLibraryUrl) {
      return NextResponse.json(
        { error: 'Competitor missing Meta page ID' },
        { status: 400 }
      );
    }

    // Start scraper
    const { runId, datasetId } = await startScraperRun(
      [metaLibraryUrl],
      competitor.clinic_id,
      competitorId
    );

    return NextResponse.json({
      success: true,
      runId,
      datasetId,
      status: 'running',
      estimatedCompletion: '2-5 minutes',
    });

  } catch (error) {
    console.error('Scraper trigger error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
