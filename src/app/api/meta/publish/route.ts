// =============================================
// Meta Ad Publishing API
// Publish approved ads to Meta
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { publishAd, hasMetaAuth } from '@/lib/meta/auth';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { auditLog } from '@/lib/utils/audit';

const publishSchema = z.object({
  adConceptId: z.string().uuid(),
  dailyBudget: z.number().min(5).max(1000).default(50),
  status: z.enum(['ACTIVE', 'PAUSED']).default('PAUSED'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adConceptId, dailyBudget, status } = publishSchema.parse(body);

    const supabase = await createClient();
    
    // Get user and clinic
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

    // Check Meta auth
    const hasAuth = await hasMetaAuth(clinic.id);
    if (!hasAuth) {
      return NextResponse.json(
        { error: 'Meta authentication required', code: 'META_AUTH_REQUIRED' },
        { status: 403 }
      );
    }

    // Get ad concept
    const { data: concept } = await supabase
      .from('ad_concepts')
      .select('*')
      .eq('id', adConceptId)
      .eq('clinic_id', clinic.id)
      .maybeSingle();

    if (!concept) {
      return NextResponse.json(
        { error: 'Ad concept not found' },
        { status: 404 }
      );
    }

    // Verify approval status
    if (concept.approval_status !== 'approved') {
      return NextResponse.json(
        { error: 'Ad must be approved before publishing' },
        { status: 400 }
      );
    }

    // Verify compliance
    if (concept.compliance_status === 'rejected') {
      return NextResponse.json(
        { error: 'Ad failed compliance check and cannot be published' },
        { status: 400 }
      );
    }

    // Publish to Meta
    const result = await publishAd(clinic.id, adConceptId, {
      dailyBudget,
      status,
    });

    // Audit log
    await auditLog({
      clinicId: clinic.id,
      action: 'ad_published',
      entityType: 'ad_concept',
      entityId: adConceptId,
      actor: 'owner',
      details: {
        meta_campaign_id: result.campaignId,
        meta_ad_id: result.adId,
        daily_budget: dailyBudget,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ad published successfully',
      meta: result,
      status: 'published',
    });

  } catch (error) {
    console.error('Ad publish error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to publish ad', message: (error as Error).message },
      { status: 500 }
    );
  }
}
