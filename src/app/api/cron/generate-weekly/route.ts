// =============================================
// Step 13: Weekly Ad Generation Cron
// Automatically generate new ads weekly
// =============================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAdConcepts } from '@/lib/ai/generate-ads';
import { auditLog } from '@/lib/utils/audit';

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const results: any[] = [];

    // Get all clinics with completed onboarding
    const { data: clinics } = await supabase
      .from('clinics')
      .select('*')
      .eq('onboarding_completed', true);

    if (!clinics || clinics.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clinics ready for generation',
        processed: 0,
      });
    }

    for (const clinic of clinics) {
      try {
        // Check weekly generation limit based on tier
        const tier = clinic.subscription_tier || 'starter';
        const limits: Record<string, number> = {
          starter: 10,
          growth: 25,
          full_stack: 50,
        };
        const maxConcepts = limits[tier] || 10;

        // Check how many generated this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { count } = await supabase
          .from('ad_concepts')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id)
          .gte('created_at', weekAgo.toISOString());

        if ((count || 0) >= maxConcepts) {
          results.push({
            clinic_id: clinic.id,
            status: 'skipped',
            reason: 'weekly_limit_reached',
            limit: maxConcepts,
            generated_this_week: count,
          });
          continue;
        }

        // Calculate how many to generate
        const toGenerate = Math.min(10, maxConcepts - (count || 0));

        // Get competitor insights for angle mix
        const { data: competitorAds } = await supabase
          .from('competitor_ads')
          .select('ai_analysis')
          .eq('clinic_id', clinic.id)
          .order('estimated_days_running', { ascending: false })
          .limit(20);

        // Build angle mix based on competitor performance
        const angleMix = buildAngleMix(competitorAds || []);

        // Create batch record first
        const { data: batch } = await supabase
          .from('generation_batches')
          .insert({
            clinic_id: clinic.id,
            triggered_by: 'scheduled',
            angle_mix: angleMix,
            concepts_requested: toGenerate,
            status: 'generating',
          })
          .select()
          .single();

        if (!batch) {
          throw new Error('Failed to create generation batch');
        }

        // Generate concepts
        const result = await generateAdConcepts(
          {
            id: clinic.id,
            name: clinic.name,
            services: clinic.services || [],
            location: clinic.location || { city: '', state: '' },
            brand_assets: clinic.brand_assets || {},
            doctor_info: clinic.doctor_info || [],
          },
          batch.id,
          toGenerate,
          angleMix
        );

        results.push({
          clinic_id: clinic.id,
          status: 'success',
          batch_id: batch.id,
          concepts_generated: result.count,
          concepts_passed: result.count,
          angle_mix: angleMix,
        });

        // Audit log
        await auditLog({
          clinicId: clinic.id,
          action: 'weekly_generation_completed',
          entityType: 'generation_batch',
          entityId: batch.id,
          actor: 'system',
          details: {
            concepts_generated: result.count,
            angle_mix: angleMix,
          },
        });

      } catch (error) {
        console.error(`Error generating for clinic ${clinic.id}:`, error);
        results.push({
          clinic_id: clinic.id,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      clinics_processed: clinics.length,
      results,
    });

  } catch (error) {
    console.error('Weekly generation cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildAngleMix(competitorAds: any[]): Record<string, number> {
  if (competitorAds.length === 0) {
    // Default mix
    return {
      pain_point: 0.3,
      trust_building: 0.25,
      educational: 0.2,
      competitor_inspired: 0.15,
      social_proof: 0.1,
    };
  }

  // Count angles from successful competitor ads
  const angleCounts: Record<string, number> = {};
  let total = 0;

  for (const ad of competitorAds) {
    const angle = ad.ai_analysis?.angle_type || 'educational';
    angleCounts[angle] = (angleCounts[angle] || 0) + 1;
    total++;
  }

  // Convert to percentages with minimums
  const mix: Record<string, number> = {};
  const angles = ['pain_point', 'trust_building', 'educational', 'competitor_inspired', 'social_proof'];
  
  for (const angle of angles) {
    mix[angle] = Math.max(0.1, (angleCounts[angle] || 0) / total);
  }

  // Normalize to 1.0
  const sum = Object.values(mix).reduce((a, b) => a + b, 0);
  for (const angle of angles) {
    mix[angle] = Math.round((mix[angle] / sum) * 100) / 100;
  }

  return mix;
}

export const POST = GET;
