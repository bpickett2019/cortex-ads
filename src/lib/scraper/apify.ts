// =============================================
// Step 9: Apify Scraper Integration
// Competitor ad scraping for Meta Ad Library
// =============================================

import { createClient } from '@/lib/supabase/server';

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'apify~facebook-ads-scraper';

interface ScraperInput {
  urls: string[];
  maxAdsPerPage: number;
  includeImages: boolean;
  dateRange: string;
}

interface ScrapedAd {
  adId: string;
  pageId: string;
  pageName: string;
  adType: 'image' | 'video' | 'carousel';
  headline?: string;
  bodyText?: string;
  cta?: string;
  imageUrl?: string;
  videoUrl?: string;
  landingPageUrl?: string;
  startDate?: string;
  endDate?: string;
  platforms: string[];
}

/**
 * Start a new Apify scraping run
 */
export async function startScraperRun(
  competitorUrls: string[],
  clinicId: string,
  competitorId: string
): Promise<{ runId: string; datasetId: string }> {
  const input: ScraperInput = {
    urls: competitorUrls,
    maxAdsPerPage: 50,
    includeImages: true,
    dateRange: 'last_90_days',
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${APIFY_TOKEN}`,
      },
      body: JSON.stringify({
        ...input,
        // Store metadata for webhook callback
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/scraper/webhook`,
        clinicId,
        competitorId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${error}`);
  }

  const data = await response.json();
  
  // Store run reference in database
  const supabase = await createClient();
  await supabase.from('scraping_jobs').insert({
    clinic_id: clinicId,
    competitor_id: competitorId,
    apify_run_id: data.data.id,
    apify_dataset_id: data.data.defaultDatasetId,
    status: 'running',
    urls_scraped: competitorUrls,
  });

  return {
    runId: data.data.id,
    datasetId: data.data.defaultDatasetId,
  };
}

/**
 * Fetch results from a completed Apify run
 */
export async function fetchScraperResults(
  datasetId: string
): Promise<ScrapedAd[]> {
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items`,
    {
      headers: {
        Authorization: `Bearer ${APIFY_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Apify dataset');
  }

  const items = await response.json();
  
  return items.map((item: any) => ({
    adId: item.adId || item.id,
    pageId: item.pageId || item.pageID,
    pageName: item.pageName,
    adType: item.adType || 'image',
    headline: item.headline,
    bodyText: item.bodyText || item.primaryText,
    cta: item.cta,
    imageUrl: item.imageUrl || item.images?.[0],
    videoUrl: item.videoUrl,
    landingPageUrl: item.landingPageUrl || item.snapshotUrl,
    startDate: item.startDate,
    endDate: item.endDate,
    platforms: item.platforms || ['facebook'],
  }));
}

/**
 * Process and store scraped ads in database
 */
export async function processScrapedAds(
  ads: ScrapedAd[],
  clinicId: string,
  competitorId: string
): Promise<{ stored: number; analyzed: number }> {
  const supabase = await createClient();
  
  let stored = 0;
  let analyzed = 0;

  for (const ad of ads) {
    // Skip if already exists
    const { data: existing } = await supabase
      .from('competitor_ads')
      .select('id')
      .eq('meta_ad_id', ad.adId)
      .maybeSingle();

    if (existing) {
      // Update last seen
      await supabase
        .from('competitor_ads')
        .update({
          last_seen: new Date().toISOString(),
          estimated_days_running: calculateDaysRunning(
            ad.startDate,
            ad.endDate
          ),
        })
        .eq('id', existing.id);
      continue;
    }

    // Analyze with AI for insights
    const aiAnalysis = await analyzeCompetitorAd(ad);
    analyzed++;

    // Store new ad
    const { error } = await supabase.from('competitor_ads').insert({
      clinic_id: clinicId,
      competitor_id: competitorId,
      meta_ad_id: ad.adId,
      ad_type: ad.adType,
      headline: ad.headline,
      body_text: ad.bodyText,
      cta: ad.cta,
      image_url: ad.imageUrl,
      landing_page_url: ad.landingPageUrl,
      first_seen: ad.startDate || new Date().toISOString(),
      last_seen: ad.endDate || new Date().toISOString(),
      estimated_days_running: calculateDaysRunning(ad.startDate, ad.endDate),
      raw_data: ad,
      ai_analysis: aiAnalysis,
    });

    if (!error) stored++;
  }

  return { stored, analyzed };
}

/**
 * Analyze a competitor ad using AI for insights
 */
async function analyzeCompetitorAd(ad: ScrapedAd): Promise<any> {
  // Simple rule-based analysis for MVP
  // Full implementation would use Claude for analysis
  
  const analysis = {
    angle_type: detectAngleType(ad),
    emotional_triggers: detectTriggers(ad),
    compliance_risk: assessComplianceRisk(ad),
    estimated_budget_tier: 'unknown' as string,
    effectiveness_score: 0,
    key_takeaways: [] as string[],
  };

  // Calculate effectiveness score based on days running (proxy for success)
  const daysRunning = calculateDaysRunning(ad.startDate, ad.endDate);
  if (daysRunning > 30) {
    analysis.effectiveness_score = 8;
    analysis.estimated_budget_tier = 'high';
    analysis.key_takeaways.push('Long-running ad suggests strong performance');
  } else if (daysRunning > 14) {
    analysis.effectiveness_score = 6;
    analysis.estimated_budget_tier = 'medium';
  } else {
    analysis.effectiveness_score = 4;
    analysis.estimated_budget_tier = 'low';
  }

  return analysis;
}

function detectAngleType(ad: ScrapedAd): string {
  const text = `${ad.headline} ${ad.bodyText}`.toLowerCase();
  
  if (text.includes('test') || text.includes('lab') || text.includes('check')) {
    return 'educational';
  }
  if (text.includes('feel') || text.includes('tired') || text.includes('low')) {
    return 'pain_point';
  }
  if (text.includes('doctor') || text.includes('medical') || text.includes('clinic')) {
    return 'trust_building';
  }
  if (text.includes('review') || text.includes('patient') || text.includes('result')) {
    return 'social_proof';
  }
  return 'brand_awareness';
}

function detectTriggers(ad: ScrapedAd): string[] {
  const triggers: string[] = [];
  const text = `${ad.headline} ${ad.bodyText}`.toLowerCase();
  
  if (text.includes('free')) triggers.push('free_offer');
  if (text.includes('limited') || text.includes('now')) triggers.push('urgency');
  if (text.includes('guarantee')) triggers.push('risk_reversal');
  if (text.includes('confidential') || text.includes('private')) triggers.push('privacy');
  
  return triggers;
}

function assessComplianceRisk(ad: ScrapedAd): string {
  const text = `${ad.headline} ${ad.bodyText}`.toLowerCase();
  
  const riskyPhrases = [
    'guaranteed results',
    'fda approved',
    'cure',
    'treat all',
    '100%',
    'money back',
    'no risk',
  ];
  
  for (const phrase of riskyPhrases) {
    if (text.includes(phrase)) return 'high';
  }
  
  return 'low';
}

function calculateDaysRunning(startDate?: string, endDate?: string): number {
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get competitor insights summary
 */
export async function getCompetitorInsights(clinicId: string): Promise<any> {
  const supabase = await createClient();
  
  const { data: ads } = await supabase
    .from('competitor_ads')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('estimated_days_running', { ascending: false })
    .limit(50);

  if (!ads || ads.length === 0) {
    return null;
  }

  // Aggregate insights
  const angleTypes: Record<string, number> = {};
  const triggers: Record<string, number> = {};
  const topPerformers = ads.slice(0, 10);

  for (const ad of ads) {
    const analysis = ad.ai_analysis || {};
    
    if (analysis.angle_type) {
      angleTypes[analysis.angle_type] = (angleTypes[analysis.angle_type] || 0) + 1;
    }
    
    if (analysis.emotional_triggers) {
      for (const trigger of analysis.emotional_triggers) {
        triggers[trigger] = (triggers[trigger] || 0) + 1;
      }
    }
  }

  return {
    total_ads_analyzed: ads.length,
    unique_competitors: new Set(ads.map(a => a.competitor_id)).size,
    angle_breakdown: angleTypes,
    top_triggers: Object.entries(triggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    top_performers: topPerformers.map(ad => ({
      id: ad.id,
      headline: ad.headline,
      days_running: ad.estimated_days_running,
      angle: ad.ai_analysis?.angle_type,
    })),
    recommendations: generateRecommendations(angleTypes, triggers),
  };
}

function generateRecommendations(
  angleTypes: Record<string, number>,
  triggers: Record<string, number>
): string[] {
  const recommendations: string[] = [];
  
  const total = Object.values(angleTypes).reduce((a, b) => a + b, 0);
  
  // Find underrepresented angles
  if ((angleTypes['educational'] || 0) / total < 0.2) {
    recommendations.push('Consider adding more educational content about TRT benefits');
  }
  if ((angleTypes['social_proof'] || 0) / total < 0.15) {
    recommendations.push('Patient testimonials and reviews are underutilized by competitors');
  }
  
  // Trigger recommendations
  if (!triggers['privacy']) {
    recommendations.push('Highlighting privacy/confidentiality could differentiate your ads');
  }
  
  return recommendations;
}
