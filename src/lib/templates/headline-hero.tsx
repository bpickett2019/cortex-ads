import { TemplateProps } from './render'

export default function HeadlineHeroTemplate({
    headline,
    primaryText,
    cta,
    clinicName,
    clinicCity,
    primaryColor,
    secondaryColor,
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
            {/* Header with clinic branding */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '40px',
                    backgroundColor: primaryColor,
                    color: 'white',
                }}
            >
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                    {clinicName}
                </div>
                <div style={{ fontSize: '18px', opacity: 0.9 }}>
                    {clinicCity}
                </div>
            </div>

            {/* Main content area */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '60px 40px',
                    textAlign: 'center',
                }}
            >
                <h1
                    style={{
                        fontSize: '48px',
                        fontWeight: 700,
                        marginBottom: '30px',
                        color: '#1a1a1a',
                        lineHeight: 1.1,
                    }}
                >
                    {headline}
                </h1>

                <p
                    style={{
                        fontSize: '20px',
                        color: '#4a5568',
                        lineHeight: 1.4,
                        marginBottom: '40px',
                        maxWidth: '80%',
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
                    }}
                >
                    {cta}
                </div>
            </div>

            {/* Footer disclaimer */}
            <div
                style={{
                    padding: '20px 40px',
                    fontSize: '12px',
                    color: '#718096',
                    textAlign: 'center',
                    backgroundColor: '#f7fafc',
                    borderTop: '1px solid #e2e8f0',
                }}
            >
                Individual results may vary. Consult with a healthcare professional.
            </div>
        </div>
    )
}