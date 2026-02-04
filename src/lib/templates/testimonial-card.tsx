import { TemplateProps } from './render'

export default function TestimonialCardTemplate({
    headline,
    primaryText,
    cta,
    clinicName,
    clinicCity,
    primaryColor,
    secondaryColor,
    testimonialQuote,
    testimonialAttribution,
}: TemplateProps) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                fontFamily: 'Inter',
            }}
        >
            {/* Top accent bar */}
            <div
                style={{
                    height: '6px',
                    backgroundColor: primaryColor,
                }}
            />

            {/* Main content */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '50px',
                }}
            >
                {/* Clinic name */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '40px',
                    }}
                >
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
                        {clinicName}
                    </span>
                    <span style={{ fontSize: '14px', color: '#718096' }}>
                        {clinicCity}
                    </span>
                </div>

                {/* Testimonial card */}
                <div
                    style={{
                        backgroundColor: '#f7fafc',
                        borderRadius: '16px',
                        padding: '40px',
                        marginBottom: '30px',
                        border: '1px solid #e2e8f0',
                    }}
                >
                    {/* Quote icon */}
                    <div
                        style={{
                            fontSize: '48px',
                            color: primaryColor,
                            marginBottom: '16px',
                            lineHeight: 1,
                        }}
                    >
                        "
                    </div>

                    {/* Quote text */}
                    <p
                        style={{
                            fontSize: '22px',
                            color: '#2d3748',
                            lineHeight: 1.5,
                            marginBottom: '20px',
                            fontStyle: 'italic',
                        }}
                    >
                        {testimonialQuote || "I feel like myself again. My energy is back, I'm sleeping better, and my wife noticed the difference immediately."}
                    </p>

                    {/* Attribution */}
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                        — {testimonialAttribution || "Michael R."}
                    </p>
                    <p style={{ fontSize: '12px', color: '#718096' }}>
                        Actual patient, results may vary
                    </p>
                </div>

                {/* Headline and CTA */}
                <div style={{ textAlign: 'center' }}>
                    <h2
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#1a1a1a',
                            marginBottom: '12px',
                        }}
                    >
                        {headline}
                    </h2>

                    <p
                        style={{
                            fontSize: '16px',
                            color: '#4a5568',
                            marginBottom: '24px',
                        }}
                    >
                        {primaryText}
                    </p>

                    <div
                        style={{
                            backgroundColor: secondaryColor,
                            color: 'white',
                            padding: '16px 32px',
                            borderRadius: '8px',
                            fontSize: '18px',
                            fontWeight: 600,
                            display: 'inline-block',
                        }}
                    >
                        {cta}
                    </div>
                </div>
            </div>

            {/* Footer disclaimer */}
            <div
                style={{
                    padding: '16px 50px',
                    fontSize: '11px',
                    color: '#a0aec0',
                    textAlign: 'center',
                    backgroundColor: '#f7fafc',
                    borderTop: '1px solid #e2e8f0',
                }}
            >
                Individual results may vary. Physician-supervised treatment program required.
            </div>
        </div>
    )
}