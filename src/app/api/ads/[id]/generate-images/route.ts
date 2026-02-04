import { createClient } from '@/lib/supabase/server'
import { generateAllAspectRatios, TemplateId } from '@/lib/templates/render'
import { supabaseAdmin } from '@/lib/supabase/admin'
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
            .select('id, name, location, brand_assets')
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

        // Verify concept is approved
        if (concept.approval_status !== 'approved') {
            return NextResponse.json(
                { error: 'Concept must be approved before generating images' },
                { status: 400 }
            )
        }

        // Get doctor info if available
        const { data: clinicData } = await supabase
            .from('clinics')
            .select('doctor_info')
            .eq('id', clinic.id)
            .single()

        const doctor = clinicData?.doctor_info?.[0] || {}

        // Generate images
        const primaryColor = clinic.brand_assets?.primary_color || '#3B82F6'
        const secondaryColor = clinic.brand_assets?.secondary_color || '#10B981'

        const { square, portrait, landscape } = await generateAllAspectRatios(
            (concept.template_id as TemplateId) || 'headline-hero',
            {
                headline: concept.headline,
                primaryText: concept.primary_text,
                cta: concept.cta,
                clinicName: clinic.name,
                clinicCity: clinic.location?.city || '',
                primaryColor,
                secondaryColor,
                doctorName: doctor.name,
                doctorCredentials: doctor.credentials,
            }
        )

        // Upload to Supabase Storage
        const uploadImage = async (buffer: Buffer, filename: string) => {
            const { data, error } = await supabaseAdmin.storage
                .from('ad-images')
                .upload(`${clinic.id}/${conceptId}/${filename}`, buffer, {
                    contentType: 'image/png',
                    upsert: true,
                })

            if (error) throw error

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('ad-images')
                .getPublicUrl(data.path)

            return publicUrl
        }

        const [squareUrl, portraitUrl, landscapeUrl] = await Promise.all([
            uploadImage(square, 'square.png'),
            uploadImage(portrait, 'portrait.png'),
            uploadImage(landscape, 'landscape.png'),
        ])

        // Update concept with image URLs
        await supabase
            .from('ad_concepts')
            .update({
                image_urls: {
                    square: squareUrl,
                    portrait: portraitUrl,
                    landscape: landscapeUrl,
                },
            })
            .eq('id', conceptId)

        // Audit log
        await auditLog({
            clinicId: clinic.id,
            action: 'image_generate',
            entityType: 'ad_concept',
            entityId: conceptId,
            actor: 'system',
        })

        return NextResponse.json({
            success: true,
            images: {
                square: squareUrl,
                portrait: portraitUrl,
                landscape: landscapeUrl,
            },
        })

    } catch (error) {
        console.error('Image generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate images' },
            { status: 500 }
        )
    }
}