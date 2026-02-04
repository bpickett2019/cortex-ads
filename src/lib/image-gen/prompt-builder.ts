// =============================================
// Flux Prompt Builder
// Converts ad concepts into optimized Flux prompts
// =============================================

export interface ImagePromptInput {
  angle_type: string;
  headline: string;
  primary_text: string;
  visual_direction?: string;
  image_prompt_hint?: string;
  clinic_type: 'TRT' | 'HRT' | 'wellness' | 'medspa';
  target_gender: 'male' | 'female' | 'all';
  target_age_range: [number, number];
  brand_colors?: {
    primary: string;
    secondary?: string;
  };
}

// Base style prefix for ALL prompts
const BASE_STYLE_PREFIX = `Professional healthcare advertising photograph, clean modern aesthetic, soft natural lighting, shallow depth of field, shot on Canon EOS R5 85mm f/1.4, color graded with warm tones`;

// Negative prompt rules - ALWAYS appended
const NEGATIVE_PROMPT = `no text, no words, no letters, no logos, no watermarks, no captions, no UI elements, no text in image`;

// FDA/FTC compliance exclusions
const COMPLIANCE_EXCLUSIONS = [
  'no syringes',
  'no needles', 
  'no pills',
  'no pharmaceutical products',
  'no before and after body comparison',
  'no medical procedures',
];

const GENDER_MAP: Record<string, string> = {
  male: 'man',
  female: 'woman',
  all: 'person',
};

const SETTING_MAP: Record<string, string> = {
  TRT: 'home office or living room',
  HRT: 'home or wellness studio',
  wellness: 'modern home or wellness center',
  medspa: 'elegant home or professional setting',
};

const COLOR_NAME_MAP: Record<string, string> = {
  '#1E40AF': 'deep blue',
  '#2563EB': 'blue',
  '#7C3AED': 'purple',
  '#059669': 'green',
  '#DC2626': 'red',
  '#D97706': 'amber',
  '#0891B2': 'cyan',
  '#4F46E5': 'indigo',
  '#BE185D': 'pink',
  '#4338CA': 'violet',
  '#0F172A': 'slate',
  '#1F2937': 'gray',
};

function getColorName(hex: string): string {
  const upperHex = hex.toUpperCase();
  return COLOR_NAME_MAP[upperHex] || 'neutral';
}

function getAgeRangeText(min: number, max: number): string {
  const mid = Math.floor((min + max) / 2);
  return `${mid}`;
}

function getGender(gender: string): string {
  return GENDER_MAP[gender] || 'person';
}

function getSetting(clinicType: string): string {
  return SETTING_MAP[clinicType] || 'modern indoor setting';
}

/**
 * Build a Flux-optimized prompt from ad concept data
 */
export function buildFluxPrompt(input: ImagePromptInput): string {
  const ageRange = getAgeRangeText(input.target_age_range[0], input.target_age_range[1]);
  const gender = getGender(input.target_gender);
  const setting = input.visual_direction || getSetting(input.clinic_type);
  const primaryColor = input.brand_colors?.primary || '#1E40AF';
  const primaryColorName = getColorName(primaryColor);

  // Use image_prompt_hint if available, otherwise build from angle type
  let sceneDescription: string;
  
  if (input.image_prompt_hint) {
    // Use the AI-generated hint but sanitize it
    sceneDescription = sanitizeHint(input.image_prompt_hint, ageRange, gender, setting, primaryColorName);
  } else {
    // Build from angle type template
    sceneDescription = buildFromTemplate(input.angle_type, ageRange, gender, setting, primaryColor, primaryColorName);
  }

  // Build the complete prompt (under 200 tokens optimized)
  const promptParts = [
    BASE_STYLE_PREFIX,
    sceneDescription,
    NEGATIVE_PROMPT,
    COMPLIANCE_EXCLUSIONS.join(', '),
    'photorealistic, high detail, 8k quality',
  ];

  return promptParts.join(', ');
}

/**
 * Build scene description from angle type template
 */
function buildFromTemplate(
  angleType: string,
  ageRange: string,
  gender: string,
  setting: string,
  primaryColor: string,
  primaryColorName: string
): string {
  switch (angleType.toLowerCase()) {
    case 'pain_point':
      return `lifestyle scene of a ${ageRange}-year-old ${gender} looking fatigued and struggling with daily activities, muted desaturated color palette suggesting low energy, ${setting}, editorial style, no text in image, no logos`;

    case 'trust_building':
      return `modern medical clinic interior, clean white and ${primaryColorName} accent walls, medical professional in white coat consulting with ${ageRange}-year-old ${gender} patient, warm trusting body language, eye-level medium shot, clinical but welcoming atmosphere, no text in image, no logos`;

    case 'educational':
      return `scientific medical visualization concept, abstract representation of hormone therapy and wellness, clean infographic-style background with soft gradient from ${primaryColor} to white, molecular structures subtly visible, modern minimalist healthcare aesthetic, no text in image, no logos`;

    case 'social_proof':
      return `candid testimonial-style photograph of a healthy ${ageRange}-year-old ${gender} with genuine warm smile, natural outdoor or home setting, authentic lifestyle moment, soft golden hour lighting, relatable and trustworthy appearance, no text in image, no logos`;

    case 'competitor_inspired':
      return `split composition healthcare transformation concept, left side slightly cooler tones suggesting "before", right side warm vibrant tones suggesting vitality, abstract lifestyle scene with ${ageRange}-year-old ${gender}, editorial magazine quality, no text in image, no logos`;

    case 'lifestyle':
    default:
      return `confident healthy ${ageRange}-year-old ${gender} in active lifestyle scene, vibrant saturated colors suggesting vitality, outdoor fitness or social setting, genuine smile, aspirational but authentic, golden hour lighting, no text in image, no logos`;
  }
}

/**
 * Sanitize and enhance image_prompt_hint
 */
function sanitizeHint(
  hint: string,
  ageRange: string,
  gender: string,
  setting: string,
  primaryColorName: string
): string {
  // Remove any existing negative prompts from the hint
  let sanitized = hint
    .replace(/no text[^,]*/gi, '')
    .replace(/no logos?[^,]*/gi, '')
    .replace(/no watermarks?[^,]*/gi, '')
    .replace(/no words?[^,]*/gi, '');

  // Inject age and gender if not present
  if (!sanitized.includes('year-old') && !sanitized.includes('years old')) {
    sanitized = `${ageRange}-year-old ${gender}, ${sanitized}`;
  }

  // Trim and clean
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();

  return sanitized;
}

/**
 * Build prompts for A/B test variants with different moods
 */
export function buildVariantPrompts(input: ImagePromptInput): {
  a: string;
  b: string;
  c: string;
} {
  const basePrompt = buildFluxPrompt(input);

  // Variant A: Aspirational/Luxury (premium, high-end)
  const variantA = basePrompt.replace(
    'photorealistic, high detail, 8k quality',
    'luxury aesthetic, aspirational lifestyle, high-end editorial, cinematic composition, premium quality, photorealistic, high detail, 8k quality'
  );

  // Variant B: Authentic/Relatable (documentary style)
  const variantB = basePrompt.replace(
    'photorealistic, high detail, 8k quality',
    'authentic documentary style, relatable everyday moment, natural candid photography, photojournalistic approach, photorealistic, high detail, 8k quality'
  );

  // Variant C: Professional/Authority (executive, trustworthy)
  const variantC = basePrompt.replace(
    'photorealistic, high detail, 8k quality',
    'professional executive portrait, authoritative presence, business professional, corporate headshot quality, confident posture, photorealistic, high detail, 8k quality'
  );

  return { a: variantA, b: variantB, c: variantC };
}

/**
 * Validate prompt for compliance
 * Returns sanitized prompt and any warnings
 */
export function validatePrompt(prompt: string): {
  sanitized: string;
  warnings: string[];
  isValid: boolean;
} {
  const warnings: string[] = [];
  let sanitized = prompt;

  // Check for banned terms (FDA/FTC violations)
  const bannedTerms = [
    { term: 'before and after', reason: 'FTC violation - transformation claims' },
    { term: 'before/after', reason: 'FTC violation - transformation claims' },
    { term: 'before & after', reason: 'FTC violation - transformation claims' },
    { term: 'guaranteed', reason: 'FDA violation - outcome guarantee' },
    { term: '100% effective', reason: 'FDA violation - efficacy claim' },
    { term: 'miracle cure', reason: 'FDA violation - unsubstantiated claim' },
    { term: 'instant results', reason: 'FTC violation - unrealistic timeline' },
    { term: 'lose \d+ lbs', reason: 'FTC violation - specific weight loss claim' },
  ];

  for (const { term, reason } of bannedTerms) {
    const regex = new RegExp(term, 'gi');
    if (regex.test(prompt)) {
      warnings.push(`Banned term detected: "${term}" (${reason})`);
      sanitized = sanitized.replace(regex, '[REMOVED]');
    }
  }

  // Check for medical procedure imagery
  const medicalImagery = ['needle', 'syringe', 'injection', 'blood draw', 'surgical'];
  for (const term of medicalImagery) {
    if (prompt.toLowerCase().includes(term)) {
      warnings.push(`Medical imagery detected: "${term}" (FDA compliance risk)`);
    }
  }

  // Check for specific real people references
  const celebrityPattern = /\b(Tom Cruise|Brad Pitt|George Clooney|etc)\b/i;
  if (celebrityPattern.test(prompt)) {
    warnings.push('Potential celebrity likeness detected - ensure no specific real person');
  }

  // Ensure negative prompts are present
  if (!prompt.includes('no text')) {
    warnings.push('Missing "no text" constraint - adding automatically');
    sanitized += ', no text, no words, no logos';
  }

  return {
    sanitized,
    warnings,
    isValid: warnings.length === 0,
  };
}

/**
 * Optimize prompt length for Flux (best under 200 tokens)
 */
export function optimizePromptLength(prompt: string): string {
  // Rough token estimate: 1 token ≈ 4 characters
  const estimatedTokens = prompt.length / 4;
  
  if (estimatedTokens <= 200) {
    return prompt;
  }

  // Truncate while keeping essential elements
  // Priority: subject > setting > lighting > equipment > negative prompts
  const parts = prompt.split(',');
  
  // Keep first 60% of parts (usually the descriptive elements)
  const essentialParts = parts.slice(0, Math.floor(parts.length * 0.6));
  
  // Always include negative prompts
  const negativeParts = parts.filter(p => 
    p.includes('no text') || 
    p.includes('no logos') || 
    p.includes('no syringes') ||
    p.includes('photorealistic')
  );

  const optimized = [...essentialParts, ...negativeParts].join(',');
  
  console.warn(`[PromptBuilder] Prompt optimized from ${estimatedTokens.toFixed(0)} to ~${(optimized.length / 4).toFixed(0)} tokens`);
  
  return optimized;
}

/**
 * Estimate token count for cost tracking
 */
export function estimatePromptTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}

/**
 * Build prompt specifically for template fallback scenarios
 * Simpler, more reliable prompts when AI generation fails
 */
export function buildFallbackPrompt(input: ImagePromptInput): string {
  const ageRange = getAgeRangeText(input.target_age_range[0], input.target_age_range[1]);
  const gender = getGender(input.target_gender);
  
  return `${BASE_STYLE_PREFIX}, professional portrait of ${ageRange}-year-old ${gender}, neutral background, soft lighting, no text, no logos, photorealistic`;
}
