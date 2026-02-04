import { supabaseAdmin } from '@/lib/supabase/admin'

export async function auditLog({
    clinicId,
    action,
    entityType,
    entityId,
    actor,
    details = {}
}: {
    clinicId?: string
    action: string
    entityType: string
    entityId: string
    actor: 'system' | 'owner' | 'ai'
    details?: Record<string, unknown>
}) {
    try {
        await supabaseAdmin.from('audit_log').insert({
            clinic_id: clinicId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            actor,
            details
        })
    } catch (error) {
        console.error('Failed to write audit log:', error)
        // Don't throw - audit logging should not break the main flow
    }
}