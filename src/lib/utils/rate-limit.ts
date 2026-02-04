// =============================================
// Rate Limiting Utilities
// Sliding window rate limiting with Supabase
// =============================================

import { supabaseAdmin } from '@/lib/supabase/admin';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour window

/**
 * Check rate limit for a given key
 * @param key Unique identifier (e.g., 'generate:${clinicId}')
 * @param limit Maximum requests per window
 */
export async function checkRateLimit(
  key: string,
  limit: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  // Get or create rate limit record
  const { data: existing } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (!existing) {
    // Create new record
    await supabaseAdmin.from('rate_limits').insert({
      key,
      count: 1,
      window_start: now.toISOString(),
    });

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + WINDOW_MS),
    };
  }

  // Check if window has expired
  const recordWindowStart = new Date(existing.window_start);
  if (recordWindowStart < windowStart) {
    // Reset window
    await supabaseAdmin
      .from('rate_limits')
      .update({
        count: 1,
        window_start: now.toISOString(),
      })
      .eq('key', key);

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + WINDOW_MS),
    };
  }

  // Check if under limit
  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: new Date(recordWindowStart.getTime() + WINDOW_MS),
    };
  }

  // Increment count
  await supabaseAdmin
    .from('rate_limits')
    .update({ count: existing.count + 1 })
    .eq('key', key);

  return {
    allowed: true,
    limit,
    remaining: limit - existing.count - 1,
    resetAt: new Date(recordWindowStart.getTime() + WINDOW_MS),
  };
}

/**
 * Rate limit configurations by tier
 */
export const TIER_RATE_LIMITS = {
  starter: {
    generatePerHour: 5,
    publishPerHour: 10,
  },
  growth: {
    generatePerHour: 15,
    publishPerHour: 30,
  },
  full_stack: {
    generatePerHour: 50,
    publishPerHour: 100,
  },
};

/**
 * Check tier-based generation limit
 */
export async function checkGenerationLimit(
  clinicId: string,
  tier: string
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
  const limits: Record<string, number> = {
    starter: 10,
    growth: 25,
    full_stack: 50,
  };

  const maxConcepts = limits[tier] || 10;

  // Check weekly generation count
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabaseAdmin
    .from('ad_concepts')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .gte('created_at', weekAgo.toISOString());

  const current = count || 0;

  if (current >= maxConcepts) {
    return {
      allowed: false,
      current,
      limit: maxConcepts,
      message: `Weekly generation limit reached (${maxConcepts}). Upgrade your plan for more.`,
    };
  }

  return {
    allowed: true,
    current,
    limit: maxConcepts,
  };
}
