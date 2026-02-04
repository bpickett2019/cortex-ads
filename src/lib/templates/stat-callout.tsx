import { TemplateProps } from './render'

export default function StatCalloutTemplate({
    headline,
    primaryText,
    cta,
    clinicName,
    clinicCity,
    primaryColor,
    secondaryColor,
    stat,
    statLabel,
}: TemplateProps) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: primaryColor,
                fontFamily: 'Inter',
                color: 'white',
            }}
        >
            {/* Top section with stat */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px',
                    textAlign: 'center',
                }}
            >
                {/* Stat number */}
                <div
                    style={{
                        fontSize: '120px',
                        fontWeight: 800,
                        lineHeight: 1,
                        marginBottom: '16px',
                    }}
                >
                    {stat || '500+'}
                </div>

                {/* Stat label */}
                <div
                    style={{
                        fontSize: '24px',
                        fontWeight: 500,
                        marginBottom: '40px',
                        opacity: 0.9,
                    }}
                >
                    {statLabel || 'Patients Treated'}
                </div>

                {/* Divider */}
                <div
                    style={{
                        width: '80px',
                        height: '4px',
                        backgroundColor: secondaryColor,
                        marginBottom: '40px',
                    }}
                />

                {/* Headline */}
                <h1
                    style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        marginBottom: '20px',
                        lineHeight: 1.3,
                    }}
                >
                    {headline}
                </h1>

                {/* Primary text */}
                <p
                    style={{
                        fontSize: '18px',
                        opacity: 0.9,
                        lineHeight: 1.5,
                        maxWidth: '80%',
                    }}
                >
                    {primaryText}
                </p>
            </div>

            {/* Bottom CTA section */}
            <div
                style={{
                    backgroundColor: 'white',
                    padding: '30px 60px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div>
                    <p style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>
                        {clinicName}
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                        {clinicCity}
                    </p>
                </div>

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

            {/* Disclaimer */}
            <div
                style={{
                    backgroundColor: '#f7fafc',
                    padding: '12px 60px',
                    fontSize: '10px',
                    color: '#a0aec0',
                    textAlign: 'center',
                }}
            >
                Individual results may vary. Consultation required to determine candidacy.
            </div>
        </div>
    )
}