// =============================================
// Together AI Flux Client
// Handles image generation via Together AI API
// =============================================

import { Together } from 'together-ai';

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

const DEFAULT_MODEL = process.env.IMAGE_GEN_MODEL || 'black-forest-labs/FLUX.1-schnell-Free';

// Cost management constants
const MONTHLY_IMAGE_LIMIT = 100; // per clinic
const DAILY_IMAGE_LIMIT = 30; // burst protection

export interface FluxImageResult {
  imageBuffer: Buffer;
  model: string;
  generationTimeMs: number;
}

interface AspectRatioDimensions {
  width: number;
  height: number;
}

const ASPECT_RATIO_MAP: Record<string, AspectRatioDimensions> = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 832, height: 1040 },
  '1.91:1': { width: 1216, height: 640 },
};

/**
 * Check image generation budget for clinic
 */
export async function checkImageBudget(clinicId: string, supabase: any): Promise<boolean> {
  try {
    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const { count: dailyCount } = await supabase
      .from('ad_concepts')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('image_gen_fallback', false)
      .gte('image_generated_at', today);

    if ((dailyCount || 0) >= DAILY_IMAGE_LIMIT) {
      console.warn(`[Flux] Daily image limit reached for clinic ${clinicId}`);
      return false;
    }

    // Check monthly limit
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const { count: monthlyCount } = await supabase
      .from('ad_concepts')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('image_gen_fallback', false)
      .gte('image_generated_at', monthStart.toISOString());

    if ((monthlyCount || 0) >= MONTHLY_IMAGE_LIMIT) {
      console.warn(`[Flux] Monthly image limit reached for clinic ${clinicId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Flux] Budget check failed:', error);
    // Fail open to avoid blocking
    return true;
  }
}

/**
 * Generate an image using Together AI Flux
 */
export async function generateFluxImage(
  prompt: string,
  aspectRatio: '1:1' | '4:5' | '1.91:1',
  options?: { seed?: number; steps?: number }
): Promise<FluxImageResult | null> {
  const startTime = Date.now();
  const dimensions = ASPECT_RATIO_MAP[aspectRatio];
  
  if (!dimensions) {
    console.error(`[Flux] Invalid aspect ratio: ${aspectRatio}`);
    return null;
  }

  // Determine steps based on model
  const isSchnell = DEFAULT_MODEL.includes('schnell');
  const steps = options?.steps || (isSchnell ? 4 : 28);

  let lastError: Error | null = null;
  
  // Retry with exponential backoff (max 3 retries)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Flux] Retry ${attempt}/3 after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`[Flux] Generating ${aspectRatio} image (${dimensions.width}x${dimensions.height})...`);
      
      const response = await Promise.race([
        together.images.create({
          model: DEFAULT_MODEL,
          prompt,
          width: dimensions.width,
          height: dimensions.height,
          steps,
          n: 1,
          response_format: 'b64_json',
          ...(options?.seed !== undefined && { seed: options.seed }),
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        ),
      ]);

      if (!response.data?.[0]?.b64_json) {
        throw new Error('No image data in response');
      }

      const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
      const generationTimeMs = Date.now() - startTime;

      console.log(`[Flux] Generated in ${generationTimeMs}ms`);

      return {
        imageBuffer,
        model: DEFAULT_MODEL,
        generationTimeMs,
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`[Flux] Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry on certain errors
      if (lastError.message.includes('NSFW') || 
          lastError.message.includes('content policy') ||
          lastError.message.includes('Invalid API key')) {
        break;
      }
    }
  }

  console.error(`[Flux] All attempts failed:`, lastError?.message);
  return null;
}

/**
 * Check if Together AI is properly configured
 */
export function isFluxConfigured(): boolean {
  return !!process.env.TOGETHER_API_KEY;
}

/**
 * Get current model info
 */
export function getFluxModelInfo(): {
  model: string;
  isSchnell: boolean;
  recommendedSteps: number;
  costPerImage: string;
} {
  const model = DEFAULT_MODEL;
  const isSchnell = model.includes('schnell');
  return {
    model,
    isSchnell,
    recommendedSteps: isSchnell ? 4 : 28,
    costPerImage: isSchnell ? '$0 (rate limited)' : '~$0.05',
  };
}

/**
 * Log generation for optimization tracking
 */
export async function logGeneration(
  supabase: any,
  clinicId: string,
  conceptId: string,
  prompt: string,
  generationTimeMs: number,
  model: string,
  success: boolean
): Promise<void> {
  try {
    await supabase.from('generation_logs').insert({
      clinic_id: clinicId,
      concept_id: conceptId,
      prompt_length: prompt.length,
      generation_time_ms: generationTimeMs,
      model,
      success,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical, just log
    console.error('[Flux] Failed to log generation:', error);
  }
}
