import { TemplateProps } from './render'

export default function DoctorTrustTemplate({
    headline,
    primaryText,
    cta,
    clinicName,
    clinicCity,
    primaryColor,
    secondaryColor,
    doctorName,
    doctorCredentials,
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
            {/* Header bar */}
            <div
                style={{
                    height: '8px',
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
                {/* Clinic branding */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '40px',
                    }}
                >
                    <span style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
                        {clinicName}
                    </span>
                    <span style={{ fontSize: '16px', color: '#718096' }}>
                        {clinicCity}
                    </span>
                </div>

                {/* Two column layout */}
                <div
                    style={{
                        display: 'flex',
                        flex: 1,
                        gap: '40px',
                    }}
                >
                    {/* Left: Doctor placeholder */}
                    <div
                        style={{
                            width: '35%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '180px',
                                height: '180px',
                                borderRadius: '50%',
                                backgroundColor: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                            }}
                        >
                            <span style={{ fontSize: '60px' }}>👤</span>
                        </div>
                        {doctorName && (
                            <>
                                <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                                    {doctorName}
                                </p>
                                <p style={{ fontSize: '14px', color: '#718096', textAlign: 'center' }}>
                                    {doctorCredentials}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Right: Content */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                        }}
                    >
                        <h1
                            style={{
                                fontSize: '36px',
                                fontWeight: 700,
                                color: '#1a1a1a',
                                marginBottom: '20px',
                                lineHeight: 1.2,
                            }}
                        >
                            {headline}
                        </h1>

                        <p
                            style={{
                                fontSize: '18px',
                                color: '#4a5568',
                                lineHeight: 1.5,
                                marginBottom: '30px',
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
                                alignSelf: 'flex-start',
                            }}
                        >
                            {cta}
                        </div>
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
                Individual results may vary. Physician-supervised treatment only.
            </div>
        </div>
    )
}