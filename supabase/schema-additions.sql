// =============================================
// Scraping Jobs Tracking Table
// Add to schema for job tracking
// =============================================

/*
-- Add to schema.sql:

CREATE TABLE scraping_jobs (
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

CREATE INDEX idx_scraping_jobs_clinic ON scraping_jobs(clinic_id);
CREATE INDEX idx_scraping_jobs_competitor ON scraping_jobs(competitor_id);

-- Add subscription_status column to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' 
    CHECK (subscription_status IN ('active','past_due','canceled','inactive'));
*/
