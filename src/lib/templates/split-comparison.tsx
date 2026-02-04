import { TemplateProps } from './render'

export default function SplitComparisonTemplate({
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
            {/* Header */}
            <div
                style={{
                    backgroundColor: primaryColor,
                    padding: '24px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'white',
                }}
            >
                <span style={{ fontSize: '20px', fontWeight: 600 }}>{clinicName}</span>
                <span style={{ fontSize: '16px', opacity: 0.9 }}>{clinicCity}</span>
            </div>

            {/* Split content */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                }}
            >
                {/* Left side - Before/without treatment */}
                <div
                    style={{
                        flex: 1,
                        backgroundColor: '#f7fafc',
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '2px solid #e2e8f0',
                    }}
                >
                    <span style={{ fontSize: '48px', marginBottom: '16px' }}>😔</span>
                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#718096', marginBottom: '8px' }}>
                        Before
                    </p>
                    <p style={{ fontSize: '14px', color: '#a0aec0', textAlign: 'center' }}>
                        Low energy<br />
                        Poor sleep<br />
                        Low motivation
                    </p>
                </div>

                {/* Right side - After/with treatment */}
                <div
                    style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <span style={{ fontSize: '48px', marginBottom: '16px' }}>💪</span>
                    <p style={{ fontSize: '18px', fontWeight: 600, color: secondaryColor, marginBottom: '8px' }}>
                        After Treatment
                    </p>
                    <p style={{ fontSize: '14px', color: '#718096', textAlign: 'center' }}>
                        Restored vitality<br />
                        Better sleep<br />
                        Peak performance
                    </p>
                </div>
            </div>

            {/* Bottom section */}
            <div
                style={{
                    padding: '30px 40px',
                    borderTop: '1px solid #e2e8f0',
                    textAlign: 'center',
                }}
            >
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
                        marginBottom: '20px',
                    }}
                >
                    {primaryText}
                </p>

                <div
                    style={{
                        backgroundColor: secondaryColor,
                        color: 'white',
                        padding: '14px 28px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 600,
                        display: 'inline-block',
                    }}
                >
                    {cta}
                </div>
            </div>

            {/* Disclaimer */}
            <div
                style={{
                    padding: '12px 40px',
                    fontSize: '10px',
                    color: '#a0aec0',
                    textAlign: 'center',
                    backgroundColor: '#f7fafc',
                }}
            >
                Individual results may vary. Physician consultation and evaluation required.
            </div>
        </div>
    )
}