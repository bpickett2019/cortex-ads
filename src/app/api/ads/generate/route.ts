import { createClient } from '@/lib/supabase/server'
import { generateAdConcepts } from '@/lib/ai/generate-ads'
import { checkRateLimit, checkGenerationLimit, TIER_RATE_LIMITS } from '@/lib/utils/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Input validation schema with sanitization
const generateSchema = z.object({
    angleMix: z.record(z.number().min(0).max(1)).optional(),
    conceptsRequested: z.number().min(1).max(20).default(10),
})

// Sanitize string inputs to prevent prompt injection
function sanitizeInput(input: string): string {
    return input
        .replace(/[{}]/g, '') // Remove braces that could break JSON
        .replace(/["']/g, '') // Remove quotes
        .substring(0, 500) // Limit length
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { angleMix, conceptsRequested } = generateSchema.parse(body)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get clinic with subscription info
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('*, subscription_tier, subscription_status')
            .eq('owner_id', user.id)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // Check subscription status
        if (clinic.subscription_status !== 'active') {
            return NextResponse.json(
                { error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' },
                { status: 403 }
            )
        }

        // Check hourly rate limit
        const rateLimitKey = `generate:${clinic.id}`
        const tier = clinic.subscription_tier || 'starter'
        const hourlyLimit = TIER_RATE_LIMITS[tier as keyof typeof TIER_RATE_LIMITS]?.generatePerHour || 5

        const rateCheck = await checkRateLimit(rateLimitKey, hourlyLimit)
        if (!rateCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    limit: rateCheck.limit,
                    resetAt: rateCheck.resetAt.toISOString(),
                },
                { status: 429 }
            )
        }

        // Check weekly generation limit
        const genLimit = await checkGenerationLimit(clinic.id, tier)
        if (!genLimit.allowed) {
            return NextResponse.json(
                { error: genLimit.message, code: 'WEEKLY_LIMIT_REACHED' },
                { status: 403 }
            )
        }

        // Enforce max concepts based on tier
        const allowedCount = Math.min(conceptsRequested, genLimit.limit - genLimit.current)
        if (allowedCount <= 0) {
            return NextResponse.json(
                { error: 'Weekly generation limit reached', code: 'LIMIT_REACHED' },
                { status: 403 }
            )
        }

        // Sanitize clinic data before passing to AI
        const sanitizedClinic = {
            ...clinic,
            name: sanitizeInput(clinic.name),
            services: (clinic.services || []).map((s: string) => sanitizeInput(s)),
            doctor_info: (clinic.doctor_info || []).map((d: any) => ({
                ...d,
                name: sanitizeInput(d.name || ''),
                credentials: sanitizeInput(d.credentials || ''),
            })),
        }

        // Create generation batch
        const { data: batch, error: batchError } = await supabase
            .from('generation_batches')
            .insert({
                clinic_id: clinic.id,
                triggered_by: 'manual',
                angle_mix: angleMix,
                concepts_requested: allowedCount,
                status: 'generating'
            })
            .select('id')
            .single()

        if (batchError || !batch) {
            return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
        }

        // Create queue entry for progress tracking
        await supabase.from('generation_queue').insert({
            clinic_id: clinic.id,
            batch_id: batch.id,
            status: 'processing',
            total: allowedCount,
            progress: 0,
        })

        // Start generation (async with progress updates)
        generateAdConceptsWithProgress(sanitizedClinic, batch.id, allowedCount, angleMix)
            .catch(error => {
                console.error('Ad generation failed:', error)
                // Update queue status on failure
                supabase.from('generation_queue')
                    .update({ status: 'failed', error_message: error.message })
                    .eq('batch_id', batch.id)
                    .then()
            })

        return NextResponse.json({
            batchId: batch.id,
            message: 'Generation started',
            conceptsRequested: allowedCount,
            rateLimit: {
                remaining: rateCheck.remaining,
                resetAt: rateCheck.resetAt.toISOString(),
            },
            weeklyLimit: {
                current: genLimit.current,
                limit: genLimit.limit,
                remaining: genLimit.limit - genLimit.current - allowedCount,
            }
        })

    } catch (error) {
        console.error('API error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            )
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Wrapper to update progress as concepts are generated
async function generateAdConceptsWithProgress(
    clinic: any,
    batchId: string,
    count: number,
    angleMix?: Record<string, number>
) {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')

    // Generate concepts
    await generateAdConcepts(clinic, batchId, count, angleMix)

    // Mark queue as completed
    await supabaseAdmin
        .from('generation_queue')
        .update({ status: 'completed', progress: count })
        .eq('batch_id', batchId)
}