// =============================================
// Image Generation Orchestrator
// Main entry point for AI ad creative generation
// =============================================

import { generateFluxImage, isFluxConfigured, FluxImageResult } from './together-client';
import { buildFluxPrompt, buildVariantPrompts, ImagePromptInput, validatePrompt } from './prompt-builder';
import { compositeImage, generateAllAspectRatios, BrandConfig } from './compositor';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface GenerateImageOptions {
  conceptId: string;
  clinicId: string;
  angleType: string;
  headline: string;
  primaryText: string;
  visualDirection?: string;
  clinicType: 'TRT' | 'HRT' | 'wellness' | 'medspa';
  targetGender: 'male' | 'female' | 'all';
  targetAgeRange: [number, number];
  brandConfig: BrandConfig;
  aspectRatio: '1:1' | '4:5' | '1.91:1' | 'all';
  variant?: 'a' | 'b' | 'c';
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  imageUrls?: {
    square?: string;
    portrait?: string;
    landscape?: string;
  };
  error?: string;
  fallback?: boolean;
  generationTimeMs?: number;
  model?: string;
  prompt?: string;
}

interface RateLimitEntry {
  key: string;
  count: number;
  reset_at: string;
}

const MAX_CONCURRENT = 5;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

/**
 * Check and update rate limit for clinic
 */
async function checkRateLimit(clinicId: string): Promise<boolean> {
  const key = `image_gen:${clinicId}`;
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  try {
    // Get current count
    const { data: entry } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .gte('reset_at', windowStart)
      .maybeSingle();

    if (!entry) {
      // Create new entry
      await supabaseAdmin
        .from('rate_limits')
        .insert({
          key,
          count: 1,
          reset_at: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString(),
        });
      return true;
    }

    if ((entry as RateLimitEntry).count >= MAX_CONCURRENT) {
      return false;
    }

    // Increment count
    await supabaseAdmin
      .from('rate_limits')
      .update({ count: (entry as RateLimitEntry).count + 1 })
      .eq('key', key);

    return true;

  } catch (error) {
    console.error('[ImageGen] Rate limit check failed:', error);
    // Allow request on error (fail open for reliability)
    return true;
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
  imageBuffer: Buffer,
  clinicId: string,
  conceptId: string,
  variant: string,
  aspectRatio: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const filename = `${clinicId}/${conceptId}/${variant}-${aspectRatio}-${timestamp}.png`;

    const { error } = await supabaseAdmin.storage
      .from('ad-images')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('[ImageGen] Upload failed:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('ad-images')
      .getPublicUrl(filename);

    return publicUrl;

  } catch (error) {
    console.error('[ImageGen] Upload error:', error);
    return null;
  }
}

/**
 * Generate a single ad creative image
 */
export async function generateAdCreative(
  options: GenerateImageOptions
): Promise<GenerationResult> {
  const startTime = Date.now();

  // Check if Flux is configured
  if (!isFluxConfigured()) {
    return {
      success: false,
      error: 'Together AI not configured. Set TOGETHER_API_KEY environment variable.',
      fallback: true,
    };
  }

  // Check rate limit
  const allowed = await checkRateLimit(options.clinicId);
  if (!allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 5 concurrent generations per clinic.',
    };
  }

  try {
    // Build prompt
    const promptInput: ImagePromptInput = {
      angle_type: options.angleType,
      headline: options.headline,
      primary_text: options.primaryText,
      visual_direction: options.visualDirection,
      clinic_type: options.clinicType,
      target_gender: options.targetGender,
      target_age_range: options.targetAgeRange,
    };

    let prompt: string;
    
    // Use variant prompts if specified
    if (options.variant) {
      const variants = buildVariantPrompts(promptInput);
      prompt = variants[options.variant];
    } else {
      prompt = buildFluxPrompt(promptInput);
    }

    // Validate prompt for compliance
    const validation = validatePrompt(prompt);
    if (!validation.isValid) {
      console.warn('[ImageGen] Prompt warnings:', validation.warnings);
      prompt = validation.sanitized;
    }

    console.log(`[ImageGen] Generating image for concept ${options.conceptId}`);
    console.log(`[ImageGen] Prompt: ${prompt.slice(0, 100)}...`);

    // Generate all aspect ratios if requested
    if (options.aspectRatio === 'all') {
      return await generateAllAspectRatiosVariant(options, promptInput, prompt);
    }

    // Generate single aspect ratio
    const fluxResult = await generateFluxImage(prompt, options.aspectRatio);
    
    if (!fluxResult) {
      return {
        success: false,
        error: 'Flux image generation failed after retries',
        fallback: true,
      };
    }

    // Composite with text overlay
    const composited = await compositeImage(fluxResult.imageBuffer, {
      headline: options.headline,
      brandConfig: options.brandConfig,
      aspectRatio: options.aspectRatio,
    });

    // Upload to storage
    const imageUrl = await uploadToStorage(
      composited,
      options.clinicId,
      options.conceptId,
      options.variant || 'main',
      options.aspectRatio
    );

    if (!imageUrl) {
      return {
        success: false,
        error: 'Failed to upload image to storage',
      };
    }

    const generationTimeMs = Date.now() - startTime;

    // Log success
    console.log(`[ImageGen] Success in ${generationTimeMs}ms: ${imageUrl}`);

    return {
      success: true,
      imageUrl,
      generationTimeMs,
      model: fluxResult.model,
      prompt,
    };

  } catch (error) {
    console.error('[ImageGen] Generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    };
  }
}

/**
 * Generate all aspect ratios for a single variant
 */
async function generateAllAspectRatiosVariant(
  options: GenerateImageOptions,
  promptInput: ImagePromptInput,
  prompt: string
): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    // Generate base image at largest size
    const fluxResult = await generateFluxImage(prompt, '1:1');
    
    if (!fluxResult) {
      return {
        success: false,
        error: 'Flux image generation failed',
        fallback: true,
      };
    }

    // Generate all aspect ratios with compositing
    const images = await generateAllAspectRatios(fluxResult.imageBuffer, {
      headline: options.headline,
      brandConfig: options.brandConfig,
    });

    // Upload all variants
    const [squareUrl, portraitUrl, landscapeUrl] = await Promise.all([
      uploadToStorage(images.square, options.clinicId, options.conceptId, options.variant || 'main', '1:1'),
      uploadToStorage(images.portrait, options.clinicId, options.conceptId, options.variant || 'main', '4:5'),
      uploadToStorage(images.landscape, options.clinicId, options.conceptId, options.variant || 'main', '1.91:1'),
    ]);

    if (!squareUrl && !portraitUrl && !landscapeUrl) {
      return {
        success: false,
        error: 'All uploads failed',
      };
    }

    const generationTimeMs = Date.now() - startTime;

    return {
      success: true,
      imageUrls: {
        square: squareUrl || undefined,
        portrait: portraitUrl || undefined,
        landscape: landscapeUrl || undefined,
      },
      generationTimeMs,
      model: fluxResult.model,
      prompt,
    };

  } catch (error) {
    console.error('[ImageGen] All-aspect generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    };
  }
}

/**
 * Generate A/B/C test variants for a concept
 */
export async function generateVariants(
  options: Omit<GenerateImageOptions, 'variant'>
): Promise<{
  a: GenerationResult;
  b: GenerationResult;
  c: GenerationResult;
}> {
  const [a, b, c] = await Promise.all([
    generateAdCreative({ ...options, variant: 'a' }),
    generateAdCreative({ ...options, variant: 'b' }),
    generateAdCreative({ ...options, variant: 'c' }),
  ]);

  return { a, b, c };
}

/**
 * Check generation health/status
 */
export async function getGenerationStatus(): Promise<{
  fluxConfigured: boolean;
  model: string;
  maxConcurrent: number;
}> {
  return {
    fluxConfigured: isFluxConfigured(),
    model: 'black-forest-labs/FLUX.1-schnell-Free',
    maxConcurrent: MAX_CONCURRENT,
  };
}
