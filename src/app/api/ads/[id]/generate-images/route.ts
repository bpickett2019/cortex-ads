// =============================================
// Generate Images API Route
// Uses Flux AI generation with Satori fallback
// =============================================

import { createClient } from '@/lib/supabase/server';
import { generateAllAspectRatios as generateSatoriImages, TemplateId } from '@/lib/templates/render';
import { generateAdCreative, generateVariants } from '@/lib/image-gen';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/utils/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conceptId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get clinic to verify ownership
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id, name, location, brand_assets, services')
            .eq('owner_id', user.id)
            .single();

        if (!clinic) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
        }

        // Get the concept
        const { data: concept } = await supabase
            .from('ad_concepts')
            .select('*')
            .eq('id', conceptId)
            .eq('clinic_id', clinic.id)
            .single();

        if (!concept) {
            return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
        }

        // Verify concept is approved
        if (concept.approval_status !== 'approved') {
            return NextResponse.json(
                { error: 'Concept must be approved before generating images' },
                { status: 400 }
            );
        }

        // Get request options
        const body = await request.json().catch(() => ({}));
        const useAI = body.useAI !== false; // Default to AI generation
        const generateVariants = body.variants === true; // A/B/C variants

        const primaryColor = clinic.brand_assets?.primary_color || '#3B82F6';
        const secondaryColor = clinic.brand_assets?.secondary_color || '#10B981';

        let imageUrls: {
            square?: string;
            portrait?: string;
            landscape?: string;
        } = {};

        let generationMethod = 'satori';
        let aiResults: {
            a?: any;
            b?: any;
            c?: any;
        } = {};

        // Try AI generation first (if enabled)
        if (useAI) {
            console.log(`[GenerateImages] Attempting AI generation for concept ${conceptId}`);

            // Determine clinic type from services
            const clinicType = determineClinicType(clinic.services || []);

            // Determine target gender from concept
            const targetGender = extractGenderFromConcept(concept);
            const targetAgeRange = extractAgeRangeFromConcept(concept);

            if (generateVariants) {
                // Generate A/B/C variants
                const variants = await generateVariants({
                    conceptId,
                    clinicId: clinic.id,
                    angleType: concept.angle_type || 'lifestyle',
                    headline: concept.headline,
                    primaryText: concept.primary_text,
                    visualDirection: concept.visual_direction,
                    clinicType,
                    targetGender,
                    targetAgeRange,
                    brandConfig: {
                        primaryColor,
                        secondaryColor,
                        fontFamily: 'Inter',
                    },
                    aspectRatio: 'all',
                });

                aiResults = {
                    a: variants.a,
                    b: variants.b,
                    c: variants.c,
                };

                // Use variant A as primary
                if (variants.a.success && variants.a.imageUrls) {
                    imageUrls = variants.a.imageUrls;
                    generationMethod = 'flux';
                }
            } else {
                // Generate single image with all aspect ratios
                const result = await generateAdCreative({
                    conceptId,
                    clinicId: clinic.id,
                    angleType: concept.angle_type || 'lifestyle',
                    headline: concept.headline,
                    primaryText: concept.primary_text,
                    visualDirection: concept.visual_direction,
                    clinicType,
                    targetGender,
                    targetAgeRange,
                    brandConfig: {
                        primaryColor,
                        secondaryColor,
                        fontFamily: 'Inter',
                    },
                    aspectRatio: 'all',
                });

                if (result.success && result.imageUrls) {
                    imageUrls = result.imageUrls;
                    generationMethod = 'flux';
                } else {
                    console.log(`[GenerateImages] AI generation failed, will fallback: ${result.error}`);
                }
            }
        }

        // Fallback to Satori templates if AI generation failed
        if (!imageUrls.square) {
            console.log(`[GenerateImages] Using Satori fallback for concept ${conceptId}`);

            // Get doctor info if available
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('doctor_info')
                .eq('id', clinic.id)
                .single();

            const doctor = clinicData?.doctor_info?.[0] || {};

            const satoriImages = await generateSatoriImages(
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
            );

            // Upload Satori images
            const uploadImage = async (buffer: Buffer, filename: string) => {
                const { data, error } = await supabaseAdmin.storage
                    .from('ad-images')
                    .upload(`${clinic.id}/${conceptId}/${filename}`, buffer, {
                        contentType: 'image/png',
                        upsert: true,
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('ad-images')
                    .getPublicUrl(data.path);

                return publicUrl;
            };

            const [squareUrl, portraitUrl, landscapeUrl] = await Promise.all([
                uploadImage(satoriImages.square, 'square-satori.png'),
                uploadImage(satoriImages.portrait, 'portrait-satori.png'),
                uploadImage(satoriImages.landscape, 'landscape-satori.png'),
            ]);

            imageUrls = {
                square: squareUrl,
                portrait: portraitUrl,
                landscape: landscapeUrl,
            };

            generationMethod = 'satori';
        } else {
            // Store Satori versions as backup (for comparison)
            try {
                const { data: clinicData } = await supabase
                    .from('clinics')
                    .select('doctor_info')
                    .eq('id', clinic.id)
                    .single();

                const doctor = clinicData?.doctor_info?.[0] || {};

                const satoriImages = await generateSatoriImages(
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
                );

                // Upload Satori backup images
                const uploadBackup = async (buffer: Buffer, filename: string) => {
                    await supabaseAdmin.storage
                        .from('ad-images')
                        .upload(`${clinic.id}/${conceptId}/${filename}`, buffer, {
                            contentType: 'image/png',
                            upsert: true,
                        });
                };

                await Promise.all([
                    uploadBackup(satoriImages.square, 'square-satori.png'),
                    uploadBackup(satoriImages.portrait, 'portrait-satori.png'),
                    uploadBackup(satoriImages.landscape, 'landscape-satori.png'),
                ]);
            } catch (e) {
                // Non-critical, just log
                console.log('[GenerateImages] Satori backup generation skipped');
            }
        }

        // Update concept with image URLs
        await supabaseAdmin
            .from('ad_concepts')
            .update({
                image_urls: imageUrls,
                image_generation_method: generationMethod,
                image_generated_at: new Date().toISOString(),
            })
            .eq('id', conceptId);

        // Audit log
        await auditLog({
            clinicId: clinic.id,
            action: 'image_generate',
            entityType: 'ad_concept',
            entityId: conceptId,
            actor: 'system',
            details: {
                method: generationMethod,
                ai_variants: generateVariants ? Object.keys(aiResults) : undefined,
            },
        });

        return NextResponse.json({
            success: true,
            method: generationMethod,
            images: imageUrls,
            ai_variants: generateVariants ? aiResults : undefined,
        });

    } catch (error) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate images' },
            { status: 500 }
        );
    }
}

/**
 * Determine clinic type from services
 */
function determineClinicType(services: string[]): 'TRT' | 'HRT' | 'wellness' | 'medspa' {
    const serviceStr = services.join(' ').toLowerCase();
    
    if (serviceStr.includes('trt') || serviceStr.includes('testosterone')) {
        return 'TRT';
    }
    if (serviceStr.includes('hrt') || serviceStr.includes('hormone')) {
        return 'HRT';
    }
    if (serviceStr.includes('medspa') || serviceStr.includes('aesthetic')) {
        return 'medspa';
    }
    return 'wellness';
}

/**
 * Extract target gender from concept
 */
function extractGenderFromConcept(concept: any): 'male' | 'female' | 'all' {
    // Try to get from target_audience JSON
    if (concept.target_audience?.gender) {
        const gender = concept.target_audience.gender.toLowerCase();
        if (gender === 'male') return 'male';
        if (gender === 'female') return 'female';
    }
    
    // Default based on angle type
    if (concept.angle_type === 'trt' || concept.angle_type === 'masculine') {
        return 'male';
    }
    
    return 'all';
}

/**
 * Extract age range from concept
 */
function extractAgeRangeFromConcept(concept: any): [number, number] {
    if (concept.target_audience?.age_min && concept.target_audience?.age_max) {
        return [
            parseInt(concept.target_audience.age_min),
            parseInt(concept.target_audience.age_max),
        ];
    }
    
    // Default range for TRT/wellness
    return [30, 55];
}
