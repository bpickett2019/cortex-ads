// =============================================
// Image Generation Constants
// Configuration for prompts, styles, and limits
// =============================================

/**
 * Prompt templates by angle type
 */
export const ANGLE_PROMPT_TEMPLATES: Record<string, {
  scene: string;
  mood: string;
  lighting: string;
}> = {
  pain_point: {
    scene: 'lifestyle scene looking fatigued and struggling with daily activities, muted desaturated color palette suggesting low energy',
    mood: 'tired, struggling, low energy',
    lighting: 'flat, muted lighting',
  },
  trust_building: {
    scene: 'modern medical clinic interior, clean white and accent walls, medical professional in white coat consulting with patient, warm trusting body language, eye-level medium shot, clinical but welcoming atmosphere',
    mood: 'professional, trustworthy, medical authority',
    lighting: 'bright, clean clinical lighting',
  },
  educational: {
    scene: 'scientific medical visualization concept, abstract representation of hormone therapy and wellness, clean infographic-style background with soft gradient, molecular structures subtly visible, modern minimalist healthcare aesthetic',
    mood: 'scientific, educational, clean',
    lighting: 'even, clinical lighting',
  },
  social_proof: {
    scene: 'candid testimonial-style photograph with genuine warm smile, natural outdoor or home setting, authentic lifestyle moment, soft golden hour lighting, relatable and trustworthy appearance',
    mood: 'authentic, happy, trustworthy, testimonial',
    lighting: 'golden hour, warm natural light',
  },
  competitor_inspired: {
    scene: 'split composition healthcare transformation concept, left side slightly cooler tones suggesting "before", right side warm vibrant tones suggesting vitality, abstract lifestyle scene, editorial magazine quality',
    mood: 'transformation, aspirational, editorial',
    lighting: 'split lighting - cool to warm',
  },
  lifestyle: {
    scene: 'confident healthy subject in active lifestyle scene, vibrant saturated colors suggesting vitality, outdoor fitness or social setting, genuine smile, aspirational but authentic',
    mood: 'energetic, confident, aspirational, authentic',
    lighting: 'golden hour, vibrant natural light',
  },
};

/**
 * Composite style configurations
 */
export const COMPOSITE_STYLES = {
  'overlay-gradient': {
    name: 'Gradient Overlay',
    description: 'Full-bleed AI image with gradient overlay at bottom',
    bestFor: ['pain_point', 'lifestyle', 'general'],
    textPosition: 'bottom',
    opacity: 0.85,
  },
  'overlay-bottom': {
    name: 'Solid Bottom Block',
    description: 'Clean separation between image and solid color block',
    bestFor: ['competitor_inspired', 'balanced'],
    textPosition: 'bottom',
    opacity: 1.0,
  },
  'split-left': {
    name: 'Split Left',
    description: 'Text on left 45%, image on right 55%',
    bestFor: ['trust_building', 'doctor_focused'],
    textPosition: 'left',
    opacity: 1.0,
  },
  'split-right': {
    name: 'Split Right',
    description: 'Image on left 55%, text on right 45%',
    bestFor: ['educational', 'content_heavy'],
    textPosition: 'right',
    opacity: 1.0,
  },
  'minimal-bar': {
    name: 'Minimal Bar',
    description: 'Premium look with top bar and centered headline',
    bestFor: ['social_proof', 'testimonial', 'premium'],
    textPosition: 'center',
    opacity: 0.9,
  },
};

/**
 * Cost management limits
 */
export const COST_LIMITS = {
  MONTHLY_IMAGE_LIMIT: 100, // per clinic
  DAILY_IMAGE_LIMIT: 30,    // burst protection
  COST_PER_IMAGE_PRO: 0.05, // USD for FLUX.1.1-pro
  COST_PER_IMAGE_FREE: 0,   // USD for schnell-free
};

/**
 * Aspect ratio configurations
 */
export const ASPECT_RATIOS = {
  '1:1': {
    name: 'Square',
    dimensions: { width: 1080, height: 1080 },
    fluxDimensions: { width: 1024, height: 1024 },
    bestFor: ['Instagram Feed', 'Facebook Feed', 'Universal'],
  },
  '4:5': {
    name: 'Portrait',
    dimensions: { width: 1080, height: 1350 },
    fluxDimensions: { width: 832, height: 1040 },
    bestFor: ['Instagram Feed', 'More Screen Real Estate'],
  },
  '1.91:1': {
    name: 'Landscape',
    dimensions: { width: 1200, height: 628 },
    fluxDimensions: { width: 1216, height: 640 },
    bestFor: ['Facebook Ads', 'News Feed'],
  },
};

/**
 * Base photography style prefix
 */
export const BASE_PHOTOGRAPHY_STYLE = 
  'Professional healthcare advertising photograph, clean modern aesthetic, soft natural lighting, shallow depth of field, shot on Canon EOS R5 85mm f/1.4, color graded with warm tones';

/**
 * Negative prompt rules (always appended)
 */
export const NEGATIVE_PROMPT_RULES = [
  'no text',
  'no words',
  'no letters',
  'no logos',
  'no watermarks',
  'no captions',
  'no UI elements',
];

/**
 * FDA/FTC compliance exclusions
 */
export const COMPLIANCE_EXCLUSIONS = [
  'no syringes',
  'no needles',
  'no pills',
  'no pharmaceutical products',
  'no before and after body comparison',
  'no medical procedures',
];

/**
 * Banned terms for compliance
 */
export const BANNED_TERMS = [
  { term: 'before and after', reason: 'FTC violation - transformation claims' },
  { term: 'before/after', reason: 'FTC violation - transformation claims' },
  { term: 'before & after', reason: 'FTC violation - transformation claims' },
  { term: 'guaranteed', reason: 'FDA violation - outcome guarantee' },
  { term: '100% effective', reason: 'FDA violation - efficacy claim' },
  { term: 'miracle cure', reason: 'FDA violation - unsubstantiated claim' },
  { term: 'instant results', reason: 'FTC violation - unrealistic timeline' },
  { term: 'lose \\d+ lbs', reason: 'FTC violation - specific weight loss claim' },
];

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000,
  TIMEOUT_MS: 30000,
};

/**
 * Font configuration
 */
export const FONT_CONFIG = {
  primary: 'Inter',
  fallback: 'Arial, sans-serif',
  sizes: {
    headline: { large: 48, medium: 36, small: 28 },
    body: { large: 20, medium: 16, small: 14 },
    caption: { large: 14, medium: 12, small: 10 },
  },
};

/**
 * Quality settings
 */
export const QUALITY_CONFIG = {
  pngQuality: 90,
  sharpness: 1.0,
  jpegQuality: 85,
};
