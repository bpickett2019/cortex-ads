-- =============================================
-- Cortex Ads Database Schema
-- Healthcare Marketing Platform for TRT/HRT/Wellness Clinics
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CLINICS (organizations)
-- =============================================
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    services TEXT[] DEFAULT '{}',
    location JSONB NOT NULL,
    brand_assets JSONB DEFAULT '{}',
    doctor_info JSONB DEFAULT '[]',
    meta_ad_account_id TEXT,
    meta_access_token_encrypted TEXT,
    meta_token_expires_at TIMESTAMPTZ,
    subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter','growth','full_stack')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- COMPETITORS
-- =============================================
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    meta_page_id TEXT,
    location JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SCRAPED COMPETITOR ADS
-- =============================================
CREATE TABLE competitor_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    meta_ad_id TEXT UNIQUE NOT NULL,
    ad_type TEXT DEFAULT 'image',
    headline TEXT,
    body_text TEXT,
    cta TEXT,
    image_url TEXT,
    landing_page_url TEXT,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    estimated_days_running INTEGER DEFAULT 0,
    raw_data JSONB DEFAULT '{}',
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GENERATION BATCHES
-- =============================================
CREATE TABLE generation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    triggered_by TEXT DEFAULT 'manual' CHECK (triggered_by IN ('manual','scheduled','auto_iteration')),
    angle_mix JSONB DEFAULT '{"competitor_inspired":0.2,"pain_point":0.3,"trust_building":0.2,"educational":0.2,"social_proof":0.1}',
    concepts_requested INTEGER DEFAULT 10,
    concepts_generated INTEGER DEFAULT 0,
    concepts_passed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','generating','compliance_review','ready','error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AD CONCEPTS
-- =============================================
CREATE TABLE ad_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES generation_batches(id) ON DELETE CASCADE NOT NULL,
    angle_type TEXT NOT NULL CHECK (angle_type IN ('competitor_inspired','pain_point','trust_building','educational','social_proof')),
    headline TEXT NOT NULL,
    primary_text TEXT NOT NULL,
    description TEXT,
    cta TEXT NOT NULL,
    target_audience JSONB DEFAULT '{}',
    visual_direction TEXT,
    template_id TEXT,
    image_urls JSONB DEFAULT '{}',
    compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending','passed','flagged','rejected')),
    compliance_issues JSONB DEFAULT '[]',
    compliance_checked_at TIMESTAMPTZ,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','revision_requested')),
    owner_feedback TEXT,
    meta_campaign_id TEXT,
    meta_adset_id TEXT,
    meta_ad_id TEXT,
    meta_creative_id TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AD PERFORMANCE (daily snapshots)
-- =============================================
CREATE TABLE ad_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_concept_id UUID REFERENCES ad_concepts(id) ON DELETE CASCADE NOT NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    leads INTEGER DEFAULT 0,
    ctr DECIMAL(8,6) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpl DECIMAL(10,2) DEFAULT 0,
    raw_insights JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ad_concept_id, date)
);

-- =============================================
-- COMPLIANCE RULES
-- =============================================
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('meta_policy','fda','ftc','state_specific','hipaa','general')),
    rule_name TEXT NOT NULL,
    description TEXT NOT NULL,
    banned_phrases TEXT[] DEFAULT '{}',
    banned_patterns TEXT[] DEFAULT '{}',
    required_disclaimers TEXT[] DEFAULT '{}',
    applicable_states TEXT[],
    applicable_services TEXT[],
    severity TEXT DEFAULT 'warning' CHECK (severity IN ('critical','warning','info')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AUDIT LOG
-- =============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Clinics: Users only see own clinics
CREATE POLICY "Users see own clinics" ON clinics
    FOR ALL USING (owner_id = auth.uid());

-- Competitors: Users see competitors for their clinics
CREATE POLICY "Users see own competitors" ON competitors
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

-- Competitor Ads: Users see ads for their clinics
CREATE POLICY "Users see own competitor ads" ON competitor_ads
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

-- Generation Batches: Users see batches for their clinics
CREATE POLICY "Users see own batches" ON generation_batches
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

-- Ad Concepts: Users see concepts for their clinics
CREATE POLICY "Users see own ad concepts" ON ad_concepts
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

-- Ad Performance: Users see performance for their ads
CREATE POLICY "Users see own ad performance" ON ad_performance
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

-- Compliance Rules: All users can read (shared ruleset)
CREATE POLICY "All users can read compliance rules" ON compliance_rules
    FOR SELECT USING (true);

-- Only service role can modify compliance rules
CREATE POLICY "Only service role can modify compliance rules" ON compliance_rules
    FOR ALL USING (false);

-- Audit Log: Users see audit logs for their clinics
CREATE POLICY "Users see own audit logs" ON audit_log
    FOR ALL USING (clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()));

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_clinics_owner ON clinics(owner_id);
CREATE INDEX idx_competitors_clinic ON competitors(clinic_id);
CREATE INDEX idx_competitor_ads_clinic ON competitor_ads(clinic_id);
CREATE INDEX idx_competitor_ads_competitor ON competitor_ads(competitor_id);
CREATE INDEX idx_generation_batches_clinic ON generation_batches(clinic_id);
CREATE INDEX idx_ad_concepts_clinic ON ad_concepts(clinic_id);
CREATE INDEX idx_ad_concepts_batch ON ad_concepts(batch_id);
CREATE INDEX idx_ad_concepts_compliance ON ad_concepts(compliance_status);
CREATE INDEX idx_ad_concepts_approval ON ad_concepts(approval_status);
CREATE INDEX idx_ad_performance_concept ON ad_performance(ad_concept_id);
CREATE INDEX idx_ad_performance_date ON ad_performance(date);
CREATE INDEX idx_audit_log_clinic ON audit_log(clinic_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clinics_updated_at
    BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER compliance_rules_updated_at
    BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();