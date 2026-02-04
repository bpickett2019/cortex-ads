import Anthropic from '@anthropic-ai/sdk'
import { AD_GENERATION_PROMPT } from './prompts'
import { checkCompliance } from '@/lib/compliance/checker'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { auditLog } from '@/lib/utils/audit'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
})

export interface GeneratedConcept {
    angle_type: 'competitor_inspired' | 'pain_point' | 'trust_building' | 'educational' | 'social_proof'
    headline: string
    primary_text: string
    description: string
    cta: string
    target_audience: {
        age_min: number
        age_max: number
        gender: 'male' | 'female' | 'all'
        interests: string[]
    }
    visual_direction: string
    template_id: 'headline-hero' | 'doctor-trust' | 'stat-callout' | 'split-comparison' | 'testimonial-card'
}

interface ClinicProfile {
    id: string
    name: string
    services: string[]
    location: { city: string; state: string }
    brand_assets: { primary_color?: string; secondary_color?: string }
    doctor_info: Array<{ name: string; credentials: string }>
}

export async function generateAdConcepts(
    clinic: ClinicProfile,
    batchId: string,
    count: number = 10,
    angleMix: Record<string, number> = {
        competitor_inspired: 0.2,
        pain_point: 0.3,
        trust_building: 0.2,
        educational: 0.2,
        social_proof: 0.1
    }
) {
    // Fetch competitor analysis
    const { data: competitorAds } = await supabaseAdmin
        .from('competitor_ads')
        .select('headline, body_text, ai_analysis')
        .eq('clinic_id', clinic.id)
        .order('estimated_days_running', { ascending: false })
        .limit(5)

    const competitorAnalysis = competitorAds?.map(ad => ({
        headline: ad.headline,
        body: ad.body_text,
        analysis: ad.ai_analysis
    })) || []

    const prompt = AD_GENERATION_PROMPT
        .replace('{{clinicProfile}}', JSON.stringify({
            name: clinic.name,
            services: clinic.services,
            location: clinic.location,
            doctors: clinic.doctor_info
        }))
        .replace('{{competitorAnalysis}}', JSON.stringify(competitorAnalysis))
        .replace('{{count}}', count.toString())
        .replace('{{angleMix}}', JSON.stringify(angleMix))

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            temperature: 0.7,
            system: 'You are an expert healthcare advertising copywriter. Respond with valid JSON only.',
            messages: [{ role: 'user', content: prompt }]
        })

        const content = response.content[0].type === 'text' ? response.content[0].text : ''

        // Extract JSON array from response
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
            throw new Error('No JSON array found in LLM response')
        }

        const concepts: GeneratedConcept[] = JSON.parse(jsonMatch[0])

        // Run compliance check on each concept
        const doctorCredentials = clinic.doctor_info.map(d => d.credentials)

        for (const concept of concepts) {
            const compliance = await checkCompliance(
                concept.headline,
                concept.primary_text,
                concept.description,
                concept.cta,
                clinic.services,
                clinic.location.state,
                doctorCredentials
            )

            // Insert into database
            const { data: conceptRecord, error } = await supabaseAdmin
                .from('ad_concepts')
                .insert({
                    clinic_id: clinic.id,
                    batch_id: batchId,
                    angle_type: concept.angle_type,
                    headline: concept.headline,
                    primary_text: concept.primary_text,
                    description: concept.description,
                    cta: concept.cta,
                    target_audience: concept.target_audience,
                    visual_direction: concept.visual_direction,
                    template_id: concept.template_id,
                    compliance_status: compliance.status,
                    compliance_issues: compliance.issues,
                    compliance_checked_at: compliance.checkedAt
                })
                .select('id')
                .single()

            if (error) {
                console.error('Failed to insert concept:', error)
                continue
            }

            // Audit log
            await auditLog({
                clinicId: clinic.id,
                action: 'compliance_check',
                entityType: 'ad_concept',
                entityId: conceptRecord.id,
                actor: 'ai',
                details: { status: compliance.status, issues_count: compliance.issues.length }
            })
        }

        // Update batch status
        const passedCount = concepts.length // All are inserted, compliance tracked separately
        await supabaseAdmin
            .from('generation_batches')
            .update({
                status: 'ready',
                concepts_generated: concepts.length,
                concepts_passed: passedCount
            })
            .eq('id', batchId)

        return { success: true, count: concepts.length }

    } catch (error) {
        console.error('Ad generation failed:', error)

        // Update batch with error
        await supabaseAdmin
            .from('generation_batches')
            .update({
                status: 'error',
                error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', batchId)

        throw error
    }
}