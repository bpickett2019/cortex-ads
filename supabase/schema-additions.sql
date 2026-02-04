-- =============================================
-- Schema Additions for Steps 9-15
-- RUN THIS AFTER schema.sql
-- =============================================

-- =============================================
-- SCRAPING JOBS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    apify_run_id TEXT NOT NULL,
    apify_dataset_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
    urls_scraped TEXT[] DEFAULT '{}',
    ads_found INTEGER DEFAULT 0,
    ads_stored INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own scraping jobs" ON scraping_jobs
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_clinic ON scraping_jobs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_competitor ON scraping_jobs(competitor_id);

-- =============================================
-- SUBSCRIPTION STATUS COLUMN
-- =============================================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' 
    CHECK (subscription_status IN ('active','past_due','canceled','inactive'));

-- =============================================
-- UNIQUE CONSTRAINT ON COMPLIANCE RULES
-- =============================================
ALTER TABLE compliance_rules ADD CONSTRAINT IF NOT EXISTS unique_rule_name 
    UNIQUE (rule_name);

-- =============================================
-- RATE LIMITING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GENERATION QUEUE TABLE (for async feedback)
-- =============================================
CREATE TABLE IF NOT EXISTS generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES generation_batches(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    progress INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own generation queue" ON generation_queue
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_generation_queue_clinic ON generation_queue(clinic_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_batch ON generation_queue(batch_id);
