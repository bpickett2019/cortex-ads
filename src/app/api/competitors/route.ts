// =============================================
// Competitor Management API
// Add, list, and manage competitors
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { startScraperRun } from '@/lib/scraper/apify';

// GET: List competitors
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('*, competitor_ads(count)')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      competitors: competitors || [],
    });

  } catch (error) {
    console.error('List competitors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    );
  }
}

// POST: Add new competitor
const addSchema = z.object({
  name: z.string().min(1).max(100),
  metaPageId: z.string().optional(),
  location: z.object({
    city: z.string(),
    state: z.string(),
  }).optional(),
  runScraper: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, metaPageId, location, runScraper } = addSchema.parse(body);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Check tier limits
    const { data: existingCount } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinic.id);

    const tierLimits: Record<string, number> = {
      starter: 3,
      growth: 10,
      full_stack: 25,
    };

    const { data: clinicTier } = await supabase
      .from('clinics')
      .select('subscription_tier')
      .eq('id', clinic.id)
      .maybeSingle();

    const tier = (clinicTier?.subscription_tier || 'starter') as string;
    const limit = tierLimits[tier] || 3;

    if ((existingCount?.length || 0) >= limit) {
      return NextResponse.json(
        { error: `Competitor limit reached for ${tier} tier (${limit})` },
        { status: 403 }
      );
    }

    // Create competitor
    const { data: competitor, error } = await supabase
      .from('competitors')
      .insert({
        clinic_id: clinic.id,
        name,
        meta_page_id: metaPageId,
        location: location || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Optionally start scraper
    let scraperJob = null;
    if (runScraper && metaPageId) {
      try {
        const { runId, datasetId } = await startScraperRun(
          [`https://www.facebook.com/ads/library/?view_all_page_id=${metaPageId}`],
          clinic.id,
          competitor.id
        );
        scraperJob = { runId, datasetId, status: 'running' };
      } catch (scraperError) {
        console.error('Scraper start error:', scraperError);
        // Don't fail the request if scraper fails
      }
    }

    return NextResponse.json({
      success: true,
      competitor,
      scraper_job: scraperJob,
    });

  } catch (error) {
    console.error('Add competitor error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add competitor' },
      { status: 500 }
    );
  }
}
