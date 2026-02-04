// =============================================
// Step 10: Meta OAuth + Publishing Pipeline
// Meta Marketing API authentication and ad publishing
// =============================================

import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/utils/encryption';

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const META_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`;

const META_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
const META_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const META_GRAPH_URL = 'https://graph.facebook.com/v18.0';

/**
 * Generate Meta OAuth URL for clinic owner
 */
export function getMetaOAuthUrl(clinicId: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: META_REDIRECT_URI,
    state: state || clinicId,
    scope: 'ads_management,ads_read,business_management',
    response_type: 'code',
  });

  return `${META_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<{
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}> {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: META_REDIRECT_URI,
    code,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Get long-lived token from short-lived token
 */
export async function getLongLivedToken(
  shortLivedToken: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to exchange for long-lived token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get ad accounts accessible to the user
 */
export async function getAdAccounts(accessToken: string): Promise<
  { id: string; name: string; accountStatus: number }[]
> {
  const response = await fetch(
    `${META_GRAPH_URL}/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch ad accounts');
  }

  const data = await response.json();
  
  return data.data.map((account: any) => ({
    id: account.id,
    name: account.name,
    accountStatus: account.account_status,
  }));
}

/**
 * Store encrypted Meta tokens for a clinic
 */
export async function storeMetaTokens(
  clinicId: string,
  accessToken: string,
  expiresIn: number,
  adAccountId?: string
): Promise<void> {
  const supabase = await createClient();
  
  const encryptedToken = encrypt(accessToken);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const update: any = {
    meta_access_token_encrypted: encryptedToken,
    meta_token_expires_at: expiresAt,
  };

  if (adAccountId) {
    update.meta_ad_account_id = adAccountId;
  }

  const { error } = await supabase
    .from('clinics')
    .update(update)
    .eq('id', clinicId);

  if (error) {
    throw new Error(`Failed to store Meta tokens: ${error.message}`);
  }
}

/**
 * Retrieve and decrypt Meta access token
 */
export async function getMetaAccessToken(clinicId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: clinic } = await supabase
    .from('clinics')
    .select('meta_access_token_encrypted, meta_token_expires_at')
    .eq('id', clinicId)
    .maybeSingle();

  if (!clinic?.meta_access_token_encrypted) {
    return null;
  }

  // Check if token is expired
  if (clinic.meta_token_expires_at) {
    const expiresAt = new Date(clinic.meta_token_expires_at);
    if (expiresAt < new Date()) {
      // Token expired - would need refresh logic here
      return null;
    }
  }

  return decrypt(clinic.meta_access_token_encrypted);
}

/**
 * Check if clinic has valid Meta authentication
 */
export async function hasMetaAuth(clinicId: string): Promise<boolean> {
  const token = await getMetaAccessToken(clinicId);
  return token !== null;
}

/**
 * Make authenticated request to Meta Marketing API
 */
async function metaApiRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${META_GRAPH_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Meta API error: ${error.error?.message || response.statusText}`
    );
  }

  return response.json();
}

// =============================================
// Publishing Pipeline
// =============================================

interface CampaignConfig {
  name: string;
  objective: 'LEADS' | 'LINK_CLICKS' | 'CONVERSIONS';
  status: 'ACTIVE' | 'PAUSED';
  dailyBudget: number;
  startTime?: string;
  endTime?: string;
}

interface AdSetConfig {
  name: string;
  targeting: {
    geoLocations: {
      countries?: string[];
      regions?: { key: string }[];
      cities?: { key: string; radius: number; distance_unit: string }[];
    };
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    interests?: { id: string; name: string }[];
  };
  optimizationGoal: 'LINK_CLICKS' | 'LEADS' | 'REACH';
  billingEvent: 'IMPRESSIONS' | 'LINK_CLICKS';
  bidStrategy?: 'LOWEST_COST_WITHOUT_CAP' | 'COST_CAP';
}

interface AdCreativeConfig {
  name: string;
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
  imageUrl?: string;
  imageHash?: string;
  linkUrl: string;
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  adAccountId: string,
  accessToken: string,
  config: CampaignConfig
): Promise<string> {
  const endpoint = `/${adAccountId}/campaigns`;
  
  const body = {
    name: config.name,
    objective: config.objective,
    status: config.status,
    special_ad_categories: ['HEALTHCARE'],
    access_token: accessToken,
  };

  const data = await metaApiRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.id;
}

/**
 * Create an ad set within a campaign
 */
export async function createAdSet(
  adAccountId: string,
  campaignId: string,
  accessToken: string,
  config: AdSetConfig,
  dailyBudget: number
): Promise<string> {
  const endpoint = `/${adAccountId}/adsets`;
  
  const body = {
    name: config.name,
    campaign_id: campaignId,
    targeting: config.targeting,
    optimization_goal: config.optimizationGoal,
    billing_event: config.billingEvent,
    bid_strategy: config.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: Math.round(dailyBudget * 100), // cents
    status: 'ACTIVE',
    access_token: accessToken,
  };

  const data = await metaApiRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.id;
}

/**
 * Upload image to Meta
 */
export async function uploadImage(
  adAccountId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  // For URLs, Meta can fetch directly
  const endpoint = `/${adAccountId}/adimages`;
  
  const body = {
    filename: `ad_image_${Date.now()}.jpg`,
    url: imageUrl,
    access_token: accessToken,
  };

  const data = await metaApiRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.images[Object.keys(data.images)[0]].hash;
}

/**
 * Create ad creative
 */
export async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  config: AdCreativeConfig
): Promise<string> {
  const endpoint = `/${adAccountId}/adcreatives`;
  
  const objectStorySpec: any = {
    page_id: process.env.META_PAGE_ID,
    link_data: {
      message: config.primaryText,
      link: config.linkUrl,
      headline: config.headline,
      description: config.description,
      call_to_action: {
        type: config.callToAction,
      },
    },
  };

  if (config.imageHash) {
    objectStorySpec.link_data.image_hash = config.imageHash;
  } else if (config.imageUrl) {
    objectStorySpec.link_data.picture = config.imageUrl;
  }

  const body = {
    name: config.name,
    object_story_spec: objectStorySpec,
    access_token: accessToken,
  };

  const data = await metaApiRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.id;
}

/**
 * Create an ad (links creative to ad set)
 */
export async function createAd(
  adAccountId: string,
  adSetId: string,
  creativeId: string,
  accessToken: string,
  name: string,
  status: 'ACTIVE' | 'PAUSED' = 'PAUSED'
): Promise<string> {
  const endpoint = `/${adAccountId}/ads`;
  
  const body = {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status,
    access_token: accessToken,
  };

  const data = await metaApiRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.id;
}

/**
 * Full publishing pipeline: Create campaign → ad set → creative → ad
 */
export async function publishAd(
  clinicId: string,
  adConceptId: string,
  publishOptions: {
    dailyBudget: number;
    status: 'ACTIVE' | 'PAUSED';
  }
): Promise<{
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
}> {
  const supabase = await createClient();
  
  // Get clinic and ad concept data
  const { data: clinic } = await supabase
    .from('clinics')
    .select('meta_ad_account_id')
    .eq('id', clinicId)
    .maybeSingle();

  const { data: concept } = await supabase
    .from('ad_concepts')
    .select('*')
    .eq('id', adConceptId)
    .maybeSingle();

  if (!clinic?.meta_ad_account_id || !concept) {
    throw new Error('Missing clinic ad account or ad concept');
  }

  const accessToken = await getMetaAccessToken(clinicId);
  if (!accessToken) {
    throw new Error('Meta authentication required');
  }

  const adAccountId = clinic.meta_ad_account_id;

  // 1. Create campaign
  const campaignId = await createCampaign(
    adAccountId,
    accessToken,
    {
      name: `Cortex Campaign - ${concept.headline.slice(0, 30)}`,
      objective: 'LEADS',
      status: publishOptions.status,
      dailyBudget: publishOptions.dailyBudget,
    }
  );

  // 2. Create ad set
  const adSetId = await createAdSet(
    adAccountId,
    campaignId,
    accessToken,
    {
      name: `Ad Set - ${concept.angle_type}`,
      targeting: {
        geoLocations: { countries: ['US'] },
        ageMin: 30,
        ageMax: 65,
        genders: [1], // Men
      },
      optimizationGoal: 'LEADS',
      billingEvent: 'IMPRESSIONS',
    },
    publishOptions.dailyBudget
  );

  // 3. Upload image if exists
  let imageHash: string | undefined;
  if (concept.image_urls?.square) {
    imageHash = await uploadImage(
      adAccountId,
      accessToken,
      concept.image_urls.square
    );
  }

  // 4. Create creative
  const creativeId = await createAdCreative(
    adAccountId,
    accessToken,
    {
      name: `Creative - ${concept.headline.slice(0, 30)}`,
      headline: concept.headline,
      primaryText: concept.primary_text,
      description: concept.description,
      callToAction: concept.cta || 'LEARN_MORE',
      imageHash,
      linkUrl: concept.landing_page_url || process.env.NEXT_PUBLIC_APP_URL!,
    }
  );

  // 5. Create ad
  const adId = await createAd(
    adAccountId,
    adSetId,
    creativeId,
    accessToken,
    `Ad - ${concept.angle_type} - ${Date.now()}`,
    publishOptions.status
  );

  // 6. Update ad concept with Meta IDs
  await supabase
    .from('ad_concepts')
    .update({
      meta_campaign_id: campaignId,
      meta_adset_id: adSetId,
      meta_creative_id: creativeId,
      meta_ad_id: adId,
      published_at: new Date().toISOString(),
    })
    .eq('id', adConceptId);

  return {
    campaignId,
    adSetId,
    creativeId,
    adId,
  };
}

/**
 * Get ad performance metrics
 */
export async function getAdInsights(
  adAccountId: string,
  accessToken: string,
  adIds: string[],
  datePreset: string = 'last_7d'
): Promise<any[]> {
  const endpoint = `/${adAccountId}/insights`;
  
  const params = new URLSearchParams({
    access_token: accessToken,
    level: 'ad',
    fields: 'ad_id,campaign_id,adset_id,spend,impressions,clicks,ctr,cpc,cpp,actions,action_values',
    date_preset: datePreset,
    filtering: JSON.stringify([{
      field: 'ad.id',
      operator: 'IN',
      value: adIds,
    }]),
  });

  const data = await metaApiRequest(`${endpoint}?${params.toString()}`, accessToken);
  return data.data || [];
}

/**
 * Pause or activate an ad
 */
export async function updateAdStatus(
  adId: string,
  accessToken: string,
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
): Promise<void> {
  const endpoint = `/${adId}`;
  
  await metaApiRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      status,
      access_token: accessToken,
    }),
  });
}
