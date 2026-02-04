// =============================================
// Creative Generation Orchestrator
// Main pipeline: Flux → Sharp → Storage
// =============================================

import { generateFluxImage, isFluxConfigured, checkImageBudget, logGeneration } from './together-client';
import { buildFluxPrompt, buildFallbackPrompt, ImagePromptInput } from './prompt-builder';
import { compositeAdCreative, selectCompositeStyle, generateAllAspectRatios } from './compositor';
import { renderTemplate, generateAllAspectRatios as generateSatoriImages } from '@/lib/templates/render';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TemplateId } from '@/lib/templates/render';

// Aspect ratios we generate for Meta Ads
const DEFAULT_ASPECT_RATIOS: ('1:1' | '4:5' | '1.91:1')[] = ['1:1', '4:5', '1.91:1'];

export interface CreativeGenerationInput {
  concept: {
    id: string;
    headline: string;
    primary_text: string;
    angle_type: string;
    cta?: string;
    template_id?: string;
    image_prompt?: string;
    visual_direction?: string;
  };
  clinic: {
    id: string;
    name: string;
    city?: string;
    services?: string[];
    brand_assets?: {
      primary_color?: string;
      secondary_color?: string;
    };
    doctor_info?: Array<{
      name?: string;
      credentials?: string;
    }>;
  };
  batchId?: string;
  aspectRatios?: ('1:1' | '4:5' | '1.91:1')[];
  compositeStyle?: string;
  skipStorage?: boolean; // For testing
}

export interface GeneratedCreative {
  aspectRatio: string;
  imageBuffer: Buffer;
  storageUrl: string;
  fluxPromptUsed: string;
  compositeStyle: string;
  generationTimeMs: number;
  fallbackUsed: boolean;
}

/**
 * Generate creatives for all aspect ratios
 */
export async function generateCreatives(
  input: CreativeGenerationInput
): Promise<GeneratedCreative[]> {
  const startTime = Date.now();
  const results: GeneratedCreative[] = [];
  const aspectRatios = input.aspectRatios || DEFAULT_ASPECT_RATIOS;
  
  // Determine clinic type
  const clinicType = determineClinicType(input.clinic.services || []);
  
  // Determine target audience
  const targetGender = 'male'; // Default for TRT - should come from concept
  const targetAgeRange: [number, number] = [35, 55]; // Default - should come from concept
  
  // Build the Flux prompt
  const promptInput: ImagePromptInput = {
    angle_type: input.concept.angle_type,
    headline: input.concept.headline,
    primary_text: input.concept.primary_text,
    visual_direction: input.concept.visual_direction,
    image_prompt_hint: input.concept.image_prompt,
    clinic_type: clinicType,
    target_gender: targetGender,
    target_age_range: targetAgeRange,
    brand_colors: {
      primary: input.clinic.brand_assets?.primary_color || '#1E40AF',
    },
  };

  const fluxPrompt = buildFluxPrompt(promptInput);
  
  // Auto-select composite style if not provided
  const compositeStyle = input.compositeStyle || selectCompositeStyle(input.concept.angle_type);
  
  // Check budget
  const budgetOk = await checkImageBudget(input.clinic.id, supabaseAdmin);
  
  // Try Flux generation if configured and within budget
  let fluxSuccess = false;
  let fluxImageBuffer: Buffer | null = null;
  
  if (isFluxConfigured() && budgetOk) {
    console.log(`[GenerateCreatives] Attempting Flux generation for concept ${input.concept.id}`);
    
    // Generate at 1:1 first (largest resolution)
    const fluxResult = await generateFluxImage(fluxPrompt, '1:1');
    
    if (fluxResult) {
      fluxSuccess = true;
      fluxImageBuffer = fluxResult.imageBuffer;
      
      // Log successful generation
      await logGeneration(
        supabaseAdmin,
        input.clinic.id,
        input.concept.id,
        fluxPrompt,
        fluxResult.generationTimeMs,
        fluxResult.model,
        true
      );
      
      console.log(`[GenerateCreatives] Flux generation succeeded in ${fluxResult.generationTimeMs}ms`);
    } else {
      console.log(`[GenerateCreatives] Flux generation failed, will use fallback`);
      
      // Log failed generation
      await logGeneration(
        supabaseAdmin,
        input.clinic.id,
        input.concept.id,
        fluxPrompt,
        0,
        'flux-fallback',
        false
      );
    }
  } else {
    if (!isFluxConfigured()) {
      console.log(`[GenerateCreatives] Flux not configured, using Satori fallback`);
    } else {
      console.log(`[GenerateCreatives] Budget exceeded, using Satori fallback`);
    }
  }

  // Prepare compositor input
  const compositorInput = {
    headline: input.concept.headline,
    primaryText: input.concept.primary_text,
    cta: input.concept.cta || 'Learn More',
    clinicName: input.clinic.name,
    clinicCity: input.clinic.city || '',
    primaryColor: input.clinic.brand_assets?.primary_color || '#1E40AF',
    secondaryColor: input.clinic.brand_assets?.secondary_color || '#F59E0B',
    style: compositeStyle as any,
    disclaimerText: 'Individual results may vary.',
  };

  // Generate for each aspect ratio
  for (const aspectRatio of aspectRatios) {
    try {
      let imageBuffer: Buffer;
      let fallbackUsed = false;
      let generationTimeMs = Date.now() - startTime;

      if (fluxSuccess && fluxImageBuffer) {
        // Use Flux-generated image with Sharp compositing
        imageBuffer = await compositeAdCreative({
          ...compositorInput,
          baseImage: fluxImageBuffer,
          aspectRatio,
        });
      } else {
        // Fallback to Satori template
        fallbackUsed = true;
        
        const doctor = input.clinic.doctor_info?.[0] || {};
        const satoriImages = await generateSatoriImages(
          (input.concept.template_id as TemplateId) || 'headline-hero',
          {
            headline: input.concept.headline,
            primaryText: input.concept.primary_text,
            cta: input.concept.cta || 'Learn More',
            clinicName: input.clinic.name,
            clinicCity: input.clinic.city || '',
            primaryColor: input.clinic.brand_assets?.primary_color || '#1E40AF',
            secondaryColor: input.clinic.brand_assets?.secondary_color || '#F59E0B',
            doctorName: doctor.name,
            doctorCredentials: doctor.credentials,
          }
        );

        // Get the right aspect ratio from Satori
        imageBuffer = satoriImages[
          aspectRatio === '1:1' ? 'square' : 
          aspectRatio === '4:5' ? 'portrait' : 
          'landscape'
        ];
      }

      // Upload to storage (unless skipped for testing)
      let storageUrl = '';
      if (!input.skipStorage) {
        storageUrl = await uploadToStorage(
          imageBuffer,
          input.clinic.id,
          input.batchId || 'direct',
          input.concept.id,
          aspectRatio,
          fallbackUsed
        );
      }

      results.push({
        aspectRatio,
        imageBuffer,
        storageUrl,
        fluxPromptUsed: fluxPrompt,
        compositeStyle,
        generationTimeMs: Date.now() - startTime,
        fallbackUsed,
      });

    } catch (error) {
      console.error(`[GenerateCreatives] Failed to generate ${aspectRatio}:`, error);
      // Continue with other aspect ratios
    }
  }

  // Update database with image URLs
  if (!input.skipStorage && results.length > 0) {
    await updateConceptImages(input.concept.id, results, fluxPrompt, compositeStyle, !fluxSuccess);
  }

  return results;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
  imageBuffer: Buffer,
  clinicId: string,
  batchId: string,
  conceptId: string,
  aspectRatio: string,
  isFallback: boolean
): Promise<string> {
  try {
    const filename = `ad-creatives/${clinicId}/${batchId}/${conceptId}_${aspectRatio}${isFallback ? '_satori' : ''}.png`;

    const { error } = await supabaseAdmin.storage
      .from('ad-images')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('ad-images')
      .getPublicUrl(filename);

    return publicUrl;

  } catch (error) {
    console.error('[GenerateCreatives] Upload failed:', error);
    throw error;
  }
}

/**
 * Update ad_concepts table with image data
 */
async function updateConceptImages(
  conceptId: string,
  results: GeneratedCreative[],
  fluxPrompt: string,
  compositeStyle: string,
  fallbackUsed: boolean
): Promise<void> {
  try {
    const imageUrls: Record<string, string> = {};
    for (const result of results) {
      if (result.storageUrl) {
        imageUrls[result.aspectRatio] = result.storageUrl;
      }
    }

    await supabaseAdmin
      .from('ad_concepts')
      .update({
        image_urls: imageUrls,
        image_prompt: fluxPrompt,
        composite_style: compositeStyle,
        image_gen_fallback: fallbackUsed,
        image_generated_at: new Date().toISOString(),
      })
      .eq('id', conceptId);

    console.log(`[GenerateCreatives] Updated concept ${conceptId} with ${results.length} images`);

  } catch (error) {
    console.error('[GenerateCreatives] Failed to update concept:', error);
    // Non-critical - images are still in storage
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
 * Generate A/B/C test variants
 */
export async function generateVariantCreatives(
  input: CreativeGenerationInput
): Promise<{
  a: GeneratedCreative[];
  b: GeneratedCreative[];
  c: GeneratedCreative[];
}> {
  // This would generate 3 different creative sets with different:
  // - Flux prompts (aspirational vs authentic vs professional)
  // - Composite styles
  // For now, just generate the same 3 times
  
  const [a, b, c] = await Promise.all([
    generateCreatives({ ...input, compositeStyle: 'overlay-gradient' }),
    generateCreatives({ ...input, compositeStyle: 'minimal-bar' }),
    generateCreatives({ ...input, compositeStyle: 'overlay-bottom' }),
  ]);

  return { a, b, c };
}

/**
 * Quick check if image generation is available
 */
export async function getGenerationStatus(): Promise<{
  fluxConfigured: boolean;
  model: string;
  monthlyLimit: number;
  dailyLimit: number;
}> {
  return {
    fluxConfigured: isFluxConfigured(),
    model: 'black-forest-labs/FLUX.1-schnell-Free',
    monthlyLimit: 100,
    dailyLimit: 30,
  };
}
