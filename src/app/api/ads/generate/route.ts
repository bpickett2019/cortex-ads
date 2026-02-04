import { createClient } from '@/lib/supabase/server'
import { generateAdConcepts } from '@/lib/ai/generate-ads'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { angleMix, conceptsRequested } = await request.json()
        
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get clinic
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('*')
            .eq('owner_id', user.id)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // Create generation batch
        const { data: batch, error: batchError } = await supabase
            .from('generation_batches')
            .insert({
                clinic_id: clinic.id,
                triggered_by: 'manual',
                angle_mix: angleMix,
                concepts_requested: conceptsRequested,
                status: 'generating'
            })
            .select('id')
            .single()

        if (batchError || !batch) {
            return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
        }

        // Start generation (async)
        generateAdConcepts(clinic, batch.id, conceptsRequested, angleMix)
            .catch(error => {
                console.error('Ad generation failed:', error)
            })

        return NextResponse.json({ 
            batchId: batch.id,
            message: 'Generation started'
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}