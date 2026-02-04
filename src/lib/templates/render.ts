import satori from 'satori'
import sharp from 'sharp'
import HeadlineHeroTemplate from './headline-hero'
import DoctorTrustTemplate from './doctor-trust'
import StatCalloutTemplate from './stat-callout'
import SplitComparisonTemplate from './split-comparison'
import TestimonialCardTemplate from './testimonial-card'

export interface TemplateProps {
    headline: string
    primaryText: string
    cta: string
    clinicName: string
    clinicCity: string
    logoUrl?: string
    primaryColor: string
    secondaryColor: string
    doctorPhotoUrl?: string
    doctorName?: string
    doctorCredentials?: string
    stat?: string
    statLabel?: string
    testimonialQuote?: string
    testimonialAttribution?: string
    aspectRatio: '1:1' | '4:5' | '1.91:1'
}

export const templates = {
    'headline-hero': HeadlineHeroTemplate,
    'doctor-trust': DoctorTrustTemplate,
    'stat-callout': StatCalloutTemplate,
    'split-comparison': SplitComparisonTemplate,
    'testimonial-card': TestimonialCardTemplate,
}

export type TemplateId = keyof typeof templates

export async function renderTemplate(
    templateId: TemplateId,
    props: TemplateProps
): Promise<Buffer> {
    const template = templates[templateId]
    if (!template) {
        throw new Error(`Unknown template: ${templateId}`)
    }

    const { aspectRatio } = props

    // Calculate dimensions based on aspect ratio
    const getDimensions = (ratio: string) => {
        switch (ratio) {
            case '1:1': return { width: 1080, height: 1080 }
            case '4:5': return { width: 1080, height: 1350 }
            case '1.91:1': return { width: 1200, height: 628 }
            default: return { width: 1080, height: 1080 }
        }
    }

    const { width, height } = getDimensions(aspectRatio)

    // Create element with proper React import
    const React = await import('react')
    const element = React.createElement(template, props)

    // Render with Satori
    const svg = await satori(element, {
        width,
        height,
        fonts: [
            {
                name: 'Inter',
                data: await fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2')
                    .then(res => res.arrayBuffer()),
                weight: 400,
                style: 'normal',
            },
        ],
    })

    // Convert to PNG
    const png = await sharp(Buffer.from(svg))
        .png()
        .toBuffer()

    return png
}

export async function generateAllAspectRatios(
    templateId: TemplateId,
    props: Omit<TemplateProps, 'aspectRatio'>
): Promise<{ square: Buffer; portrait: Buffer; landscape: Buffer }> {
    const [square, portrait, landscape] = await Promise.all([
        renderTemplate(templateId, { ...props, aspectRatio: '1:1' }),
        renderTemplate(templateId, { ...props, aspectRatio: '4:5' }),
        renderTemplate(templateId, { ...props, aspectRatio: '1.91:1' }),
    ])

    return { square, portrait, landscape }
}