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

        // Get clinic to verify ownership
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!clinic) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // Get the concept
        const { data: concept } = await supabase
            .from('ad_concepts')
            .select('*')
            .eq('id', conceptId)
            .eq('clinic_id', clinic.id)
            .single()

        if (!concept) {
            return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
        }

        // Verify compliance allows approval
        if (concept.compliance_status === 'rejected') {
            return NextResponse.json(
                { error: 'Cannot approve concept with critical compliance violations' },
                { status: 400 }
            )
        }

        // Update approval status
        const { error: updateError } = await supabase
            .from('ad_concepts')
            .update({
                approval_status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', conceptId)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to approve concept' }, { status: 500 })
        }

        // Audit log
        await auditLog({
            clinicId: clinic.id,
            action: 'approve',
            entityType: 'ad_concept',
            entityId: conceptId,
            actor: 'owner'
        })

        return NextResponse.json({ success: true, status: 'approved' })

    } catch (error) {
        console.error('Approve API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}