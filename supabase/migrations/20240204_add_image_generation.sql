-- =============================================
-- Migration: Add image generation columns to ad_concepts
-- For Flux AI-generated creatives with Satori fallback
-- =============================================

-- Add image URLs storage (JSONB for all aspect ratios)
ALTER TABLE ad_concepts 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '{}';

-- Add the Flux prompt used for generation
ALTER TABLE ad_concepts 
ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Track which model was used
ALTER TABLE ad_concepts 
ADD COLUMN IF NOT EXISTS image_gen_model TEXT;

-- Flag for fallback to Satori templates
ALTER TABLE ad_concepts 
ADD COLUMN IF NOT EXISTS image_gen_fallback BOOLEAN DEFAULT false;

-- Track which composite style was used
ALTER TABLE ad_concepts 
ADD COLUMN IF NOT EXISTS composite_style TEXT;

-- Timestamp for when images were generated
ALTER TABLE ad_concepts 
ADD COLUMN IF NOT EXISTS image_generated_at TIMESTAMPTZ;

-- =============================================
-- Create generation_logs table for optimization
-- =============================================

CREATE TABLE IF NOT EXISTS generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES ad_concepts(id) ON DELETE SET NULL,
    prompt_length INTEGER,
    generation_time_ms INTEGER,
    model TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_generation_logs_clinic 
ON generation_logs(clinic_id, created_at);

CREATE INDEX IF NOT EXISTS idx_generation_logs_success 
ON generation_logs(success, created_at);

-- =============================================
-- Create rate_limits table if not exists
-- =============================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_reset 
ON rate_limits(key, reset_at);

-- =============================================
-- Add comments for documentation
-- =============================================

COMMENT ON COLUMN ad_concepts.image_urls IS 'JSON object with URLs for each aspect ratio: {"1:1": "url", "4:5": "url", "1.91:1": "url"}';
COMMENT ON COLUMN ad_concepts.image_prompt IS 'The Flux prompt used to generate the base image';
COMMENT ON COLUMN ad_concepts.image_gen_fallback IS 'True if Satori templates were used instead of Flux';
COMMENT ON COLUMN ad_concepts.composite_style IS 'The compositor style used: overlay-gradient, overlay-bottom, split-left, split-right, minimal-bar';
