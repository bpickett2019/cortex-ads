// =============================================
// Sharp Image Compositor
// Composites text overlays onto AI-generated images
// =============================================

import sharp from 'sharp';

export type CompositeStyle = 
  | 'overlay-gradient' 
  | 'overlay-bottom' 
  | 'split-left' 
  | 'split-right' 
  | 'minimal-bar';

export interface CompositorInput {
  baseImage: Buffer;
  headline: string;
  primaryText: string;
  cta: string;
  clinicName: string;
  clinicCity: string;
  primaryColor: string;
  secondaryColor: string;
  aspectRatio: '1:1' | '4:5' | '1.91:1';
  disclaimerText?: string;
  logoBuffer?: Buffer;
  style: CompositeStyle;
}

interface Dimensions {
  width: number;
  height: number;
}

// Meta's recommended resolutions
const META_DIMENSIONS: Record<string, Dimensions> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '1.91:1': { width: 1200, height: 628 },
};

/**
 * Auto-select composite style based on angle type
 */
export function selectCompositeStyle(angleType: string): CompositeStyle {
  switch (angleType.toLowerCase()) {
    case 'pain_point':
      return 'overlay-gradient'; // emotional, image-forward
    case 'trust_building':
      return 'split-left'; // doctor info needs space
    case 'educational':
      return 'split-right'; // content-heavy
    case 'social_proof':
      return 'minimal-bar'; // testimonial, image-forward
    case 'competitor_inspired':
      return 'overlay-bottom'; // balanced
    default:
      return 'overlay-gradient';
  }
}

/**
 * Composite ad creative with text overlays
 */
export async function compositeAdCreative(input: CompositorInput): Promise<Buffer> {
  const dimensions = META_DIMENSIONS[input.aspectRatio];
  
  if (!dimensions) {
    throw new Error(`Invalid aspect ratio: ${input.aspectRatio}`);
  }

  // Resize base image to Meta dimensions
  const resizedBase = await sharp(input.baseImage)
    .resize(dimensions.width, dimensions.height, { 
      fit: 'cover',
      position: 'center'
    })
    .toBuffer();

  // Create text overlay SVG based on style
  const overlaySvg = createTextOverlaySvg(
    dimensions.width,
    dimensions.height,
    input
  );

  // Composite overlay onto base image
  const result = await sharp(resizedBase)
    .composite([
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
      },
    ])
    .png({ quality: 90 })
    .toBuffer();

  return result;
}

/**
 * Create SVG text overlay based on style
 */
function createTextOverlaySvg(
  width: number,
  height: number,
  input: CompositorInput
): string {
  switch (input.style) {
    case 'overlay-gradient':
      return createOverlayGradientSvg(width, height, input);
    case 'overlay-bottom':
      return createOverlayBottomSvg(width, height, input);
    case 'split-left':
      return createSplitLeftSvg(width, height, input);
    case 'split-right':
      return createSplitRightSvg(width, height, input);
    case 'minimal-bar':
      return createMinimalBarSvg(width, height, input);
    default:
      return createOverlayGradientSvg(width, height, input);
  }
}

/**
 * Style: overlay-gradient
 * Full-bleed image with gradient overlay at bottom
 */
function createOverlayGradientSvg(
  width: number,
  height: number,
  input: CompositorInput
): string {
  const headlineSize = width > 1000 ? 48 : 36;
  const textSize = width > 1000 ? 20 : 16;
  const ctaWidth = 180;
  const ctaHeight = 44;
  
  const headlineY = height * 0.65;
  const textY = headlineY + headlineSize + 16;
  const ctaY = textY + textSize + 24;
  
  // Truncate text if too long
  const displayHeadline = truncateText(input.headline, 60);
  const displayText = truncateText(input.primaryText, 100);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottomGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${input.primaryColor};stop-opacity:0" />
          <stop offset="40%" style="stop-color:${input.primaryColor};stop-opacity:0.85" />
          <stop offset="100%" style="stop-color:${input.primaryColor};stop-opacity:0.95" />
        </linearGradient>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
        </filter>
      </defs>
      
      <!-- Gradient overlay bottom 45% -->
      <rect x="0" y="${height * 0.55}" width="${width}" height="${height * 0.45}" fill="url(#bottomGradient)" />
      
      <!-- Clinic name top-left -->
      <text x="24" y="40" 
        font-family="Inter, Arial, sans-serif" 
        font-size="14" 
        font-weight="600"
        fill="white"
        filter="url(#textShadow)">
        ${escapeXml(input.clinicName)}${input.clinicCity ? ` • ${escapeXml(input.clinicCity)}` : ''}
      </text>
      
      <!-- Headline -->
      <text x="${width / 2}" y="${headlineY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${headlineSize}" 
        font-weight="700"
        fill="white" 
        text-anchor="middle"
        filter="url(#textShadow)">
        ${escapeXml(displayHeadline)}
      </text>
      
      <!-- Primary text -->
      <text x="${width / 2}" y="${textY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${textSize}" 
        font-weight="400"
        fill="white" 
        text-anchor="middle"
        opacity="0.9">
        ${escapeXml(displayText)}
      </text>
      
      <!-- CTA Button -->
      <rect x="${(width - ctaWidth) / 2}" y="${ctaY}" 
        width="${ctaWidth}" height="${ctaHeight}" 
        rx="22" ry="22"
        fill="${input.secondaryColor}" />
      <text x="${width / 2}" y="${ctaY + ctaHeight / 2 + 6}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="16" 
        font-weight="600"
        fill="white" 
        text-anchor="middle">
        ${escapeXml(input.cta)}
      </text>
      
      <!-- Disclaimer -->
      ${input.disclaimerText ? `
      <text x="${width / 2}" y="${height - 12}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="10" 
        font-weight="400"
        fill="white" 
        text-anchor="middle"
        opacity="0.6">
        ${escapeXml(input.disclaimerText)}
      </text>
      ` : ''}
    </svg>
  `;
}

/**
 * Style: overlay-bottom
 * Solid color block at bottom
 */
function createOverlayBottomSvg(
  width: number,
  height: number,
  input: CompositorInput
): string {
  const headlineSize = width > 1000 ? 44 : 32;
  const blockHeight = height * 0.4;
  const blockY = height - blockHeight;
  
  const headlineY = blockY + blockHeight * 0.35;
  const ctaY = blockY + blockHeight * 0.65;
  
  const displayHeadline = truncateText(input.headline, 50);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      
      <!-- Solid color block bottom 40% -->
      <rect x="0" y="${blockY}" width="${width}" height="${blockHeight}" fill="${input.primaryColor}" />
      
      <!-- Clean separation line -->
      <rect x="0" y="${blockY}" width="${width}" height="4" fill="${input.secondaryColor}" />
      
      <!-- Clinic name top-left -->
      <text x="24" y="40" 
        font-family="Inter, Arial, sans-serif" 
        font-size="14" 
        font-weight="600"
        fill="white"
        filter="url(#textShadow)">
        ${escapeXml(input.clinicName)}
      </text>
      
      <!-- Headline in color block -->
      <text x="${width / 2}" y="${headlineY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${headlineSize}" 
        font-weight="700"
        fill="white" 
        text-anchor="middle">
        ${escapeXml(displayHeadline)}
      </text>
      
      <!-- CTA Pill Button -->
      <rect x="${(width - 160) / 2}" y="${ctaY}" 
        width="160" height="40" 
        rx="20" ry="20"
        fill="${input.secondaryColor}" />
      <text x="${width / 2}" y="${ctaY + 26}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="15" 
        font-weight="600"
        fill="white" 
        text-anchor="middle">
        ${escapeXml(input.cta)}
      </text>
    </svg>
  `;
}

/**
 * Style: split-left
 * Text on left, image on right
 */
function createSplitLeftSvg(
  width: number,
  height: number,
  input: CompositorInput
): string {
  const splitPoint = width * 0.45;
  const headlineSize = width > 1000 ? 36 : 28;
  const textSize = width > 1000 ? 16 : 14;
  
  const headlineY = height * 0.25;
  const textY = headlineY + headlineSize + 20;
  const ctaY = height * 0.75;
  
  const displayHeadline = truncateText(input.headline, 45);
  const displayText = truncateText(input.primaryText, 80);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- White background left 45% -->
      <rect x="0" y="0" width="${splitPoint}" height="${height}" fill="white" />
      
      <!-- Primary color accent line -->
      <rect x="0" y="0" width="6" height="${height}" fill="${input.primaryColor}" />
      
      <!-- Clinic name -->
      <text x="24" y="36" 
        font-family="Inter, Arial, sans-serif" 
        font-size="12" 
        font-weight="600"
        fill="#333">
        ${escapeXml(input.clinicName)}
      </text>
      
      <!-- Headline -->
      <text x="24" y="${headlineY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${headlineSize}" 
        font-weight="700"
        fill="#1a1a1a">
        ${escapeXml(displayHeadline)}
      </text>
      
      <!-- Primary text -->
      <text x="24" y="${textY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${textSize}" 
        font-weight="400"
        fill="#555">
        ${escapeXml(displayText)}
      </text>
      
      <!-- CTA Button -->
      <rect x="24" y="${ctaY}" 
        width="140" height="40" 
        rx="4" ry="4"
        fill="${input.primaryColor}" />
      <text x="94" y="${ctaY + 26}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="14" 
        font-weight="600"
        fill="white" 
        text-anchor="middle">
        ${escapeXml(input.cta)}
      </text>
    </svg>
  `;
}

/**
 * Style: split-right
 * Mirror of split-left
 */
function createSplitRightSvg(
  width: number,
  height: number,
  input: CompositorInput
): string {
  const splitPoint = width * 0.55;
  const headlineSize = width > 1000 ? 36 : 28;
  const textSize = width > 1000 ? 16 : 14;
  
  const headlineY = height * 0.25;
  const textY = headlineY + headlineSize + 20;
  const ctaY = height * 0.75;
  
  const textX = splitPoint + 24;
  const displayHeadline = truncateText(input.headline, 45);
  const displayText = truncateText(input.primaryText, 80);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- White background right 45% -->
      <rect x="${splitPoint}" y="0" width="${width - splitPoint}" height="${height}" fill="white" />
      
      <!-- Primary color accent line right edge -->
      <rect x="${width - 6}" y="0" width="6" height="${height}" fill="${input.primaryColor}" />
      
      <!-- Clinic name -->
      <text x="${textX}" y="36" 
        font-family="Inter, Arial, sans-serif" 
        font-size="12" 
        font-weight="600"
        fill="#333">
        ${escapeXml(input.clinicName)}
      </text>
      
      <!-- Headline -->
      <text x="${textX}" y="${headlineY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${headlineSize}" 
        font-weight="700"
        fill="#1a1a1a">
        ${escapeXml(displayHeadline)}
      </text>
      
      <!-- Primary text -->
      <text x="${textX}" y="${textY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${textSize}" 
        font-weight="400"
        fill="#555">
        ${escapeXml(displayText)}
      </text>
      
      <!-- CTA Button -->
      <rect x="${textX}" y="${ctaY}" 
        width="140" height="40" 
        rx="4" ry="4"
        fill="${input.primaryColor}" />
      <text x="${textX + 70}" y="${ctaY + 26}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="14" 
        font-weight="600"
        fill="white" 
        text-anchor="middle">
        ${escapeXml(input.cta)}
      </text>
    </svg>
  `;
}

/**
 * Style: minimal-bar
 * Premium look with minimal text
 */
function createMinimalBarSvg(
  width: number,
  height: number,
  input: CompositorInput
): string {
  const headlineSize = width > 1000 ? 42 : 32;
  const barHeight = 50;
  
  const headlineY = height * 0.5;
  const badgeX = width - 140;
  const badgeY = height - 70;
  
  const displayHeadline = truncateText(input.headline, 40);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.6)"/>
        </filter>
      </defs>
      
      <!-- Top bar with clinic name -->
      <rect x="0" y="0" width="${width}" height="${barHeight}" fill="${input.primaryColor}" opacity="0.9" />
      <text x="24" y="32" 
        font-family="Inter, Arial, sans-serif" 
        font-size="16" 
        font-weight="600"
        fill="white">
        ${escapeXml(input.clinicName)}${input.clinicCity ? ` | ${escapeXml(input.clinicCity)}` : ''}
      </text>
      
      <!-- Headline centered with text shadow -->
      <text x="${width / 2}" y="${headlineY}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${headlineSize}" 
        font-weight="700"
        fill="white" 
        text-anchor="middle"
        filter="url(#textShadow)">
        ${escapeXml(displayHeadline)}
      </text>
      
      <!-- CTA Badge bottom-right -->
      <rect x="${badgeX}" y="${badgeY}" 
        width="120" height="36" 
        rx="18" ry="18"
        fill="${input.secondaryColor}" />
      <text x="${badgeX + 60}" y="${badgeY + 23}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="13" 
        font-weight="600"
        fill="white" 
        text-anchor="middle">
        ${escapeXml(input.cta)}
      </text>
    </svg>
  `;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate all aspect ratios for an ad creative
 */
export async function generateAllAspectRatios(
  baseImageBuffer: Buffer,
  input: Omit<CompositorInput, 'baseImage' | 'aspectRatio'>
): Promise<{
  '1:1': Buffer;
  '4:5': Buffer;
  '1.91:1': Buffer;
}> {
  const [square, portrait, landscape] = await Promise.all([
    compositeAdCreative({ ...input, baseImage: baseImageBuffer, aspectRatio: '1:1' }),
    compositeAdCreative({ ...input, baseImage: baseImageBuffer, aspectRatio: '4:5' }),
    compositeAdCreative({ ...input, baseImage: baseImageBuffer, aspectRatio: '1.91:1' }),
  ]);

  return {
    '1:1': square,
    '4:5': portrait,
    '1.91:1': landscape,
  };
}
