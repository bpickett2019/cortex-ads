import { createClient } from '@/lib/supabase/server'
import { auditLog } from '@/lib/utils/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conceptId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { feedback } = await request.json()

        // Get clinic to verify ownership
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!clinic) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // Update rejection status
        const { error: updateError } = await supabase
            .from('ad_concepts')
            .update({
                approval_status: 'rejected',
                owner_feedback: feedback || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', conceptId)
            .eq('clinic_id', clinic.id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to reject concept' }, { status: 500 })
        }

        // Audit log
        await auditLog({
            clinicId: clinic.id,
            action: 'reject',
            entityType: 'ad_concept',
            entityId: conceptId,
            actor: 'owner',
            details: { feedback }
        })

        return NextResponse.json({ success: true, status: 'rejected' })

    } catch (error) {
        console.error('Reject API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}