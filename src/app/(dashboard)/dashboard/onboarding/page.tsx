'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SERVICES = [
    'TRT',
    'HRT',
    'Weight Loss',
    'IV Therapy',
    'Med Spa',
    'Peptide Therapy',
    'Hair Restoration'
]

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        clinicName: '',
        city: '',
        state: '',
        services: [] as string[],
        doctorName: '',
        doctorCredentials: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
    })

    const handleServiceToggle = (service: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service]
        }))
    }

    const handleSubmit = async () => {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        const { error } = await supabase.from('clinics').insert({
            name: formData.clinicName,
            owner_id: user.id,
            services: formData.services,
            location: {
                city: formData.city,
                state: formData.state,
            },
            doctor_info: [{
                name: formData.doctorName,
                credentials: formData.doctorCredentials,
            }],
            brand_assets: {
                primary_color: formData.primaryColor,
                secondary_color: formData.secondaryColor,
            },
            onboarding_completed: true,
        })

        if (!error) {
            router.push('/dashboard')
        }

        setLoading(false)
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Let&apos;s set up your clinic</h2>
                        <div className="space-y-2">
                            <Label htmlFor="clinicName">Clinic Name</Label>
                            <Input
                                id="clinicName"
                                value={formData.clinicName}
                                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                                placeholder="e.g., Vitality Wellness Center"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="e.g., CA"
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => setStep(2)}
                            disabled={!formData.clinicName || !formData.city || !formData.state}
                        >
                            Next
                        </Button>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">What services do you offer?</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {SERVICES.map((service) => (
                                <button
                                    key={service}
                                    onClick={() => handleServiceToggle(service)}
                                    className={`p-3 border rounded-lg text-left transition-colors ${
                                        formData.services.includes(service)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    {service}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => setStep(3)}
                                disabled={formData.services.length === 0}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Primary Doctor Information</h2>
                        <div className="space-y-2">
                            <Label htmlFor="doctorName">Doctor Name</Label>
                            <Input
                                id="doctorName"
                                value={formData.doctorName}
                                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                                placeholder="e.g., Dr. John Smith"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="doctorCredentials">Credentials</Label>
                            <Input
                                id="doctorCredentials"
                                value={formData.doctorCredentials}
                                onChange={(e) => setFormData({ ...formData, doctorCredentials: e.target.value })}
                                placeholder="e.g., MD, Board-Certified in Anti-Aging Medicine"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => setStep(4)}
                                disabled={!formData.doctorName}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Brand Colors</h2>
                        <div className="space-y-2">
                            <Label htmlFor="primaryColor">Primary Color</Label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    id="primaryColor"
                                    value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="h-10 w-20"
                                />
                                <Input value={formData.primaryColor} readOnly />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secondaryColor">Secondary Color</Label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    id="secondaryColor"
                                    value={formData.secondaryColor}
                                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                    className="h-10 w-20"
                                />
                                <Input value={formData.secondaryColor} readOnly />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Complete Setup'}
                            </Button>
                        </div>
                    </div>
                )
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`h-2 flex-1 rounded-full ${
                                    i <= step ? 'bg-primary' : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>
                    <CardTitle>Welcome to Cortex Ads</CardTitle>
                    <CardDescription>Let&apos;s get your clinic set up</CardDescription>
                </CardHeader>
                <CardContent>{renderStep()}</CardContent>
            </Card>
        </div>
    )
}