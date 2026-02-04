'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const ANGLE_TYPES = [
    { key: 'competitor_inspired', label: 'Competitor Inspired', description: 'Learn from what competitors are running' },
    { key: 'pain_point', label: 'Pain Point', description: 'Address specific patient frustrations' },
    { key: 'trust_building', label: 'Trust Building', description: 'Establish credibility and expertise' },
    { key: 'educational', label: 'Educational', description: 'Inform and educate prospects' },
    { key: 'social_proof', label: 'Social Proof', description: 'Leverage testimonials and results' },
]

export default function GenerateAdsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [angleMix, setAngleMix] = useState({
        competitor_inspired: 20,
        pain_point: 30,
        trust_building: 20,
        educational: 20,
        social_proof: 10,
    })
    const [conceptsRequested, setConceptsRequested] = useState(10)

    const handleAngleChange = (key: string, value: number) => {
        setAngleMix(prev => ({ ...prev, [key]: value }))
    }

    const handleSubmit = async () => {
        setLoading(true)

        // Normalize to ensure sum is 100
        const total = Object.values(angleMix).reduce((a, b) => a + b, 0)
        const normalizedMix = Object.fromEntries(
            Object.entries(angleMix).map(([k, v]) => [k, v / total])
        )

        try {
            const response = await fetch('/api/ads/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    angleMix: normalizedMix,
                    conceptsRequested,
                }),
            })

            if (response.ok) {
                const { batchId } = await response.json()
                router.push(`/dashboard/ads/${batchId}`)
            }
        } catch (error) {
            console.error('Failed to generate ads:', error)
        }

        setLoading(false)
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Generate New Ad Concepts</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Angle Mix Configuration</CardTitle>
                    <CardDescription>
                        Adjust the distribution of creative angles for your ad generation
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {ANGLE_TYPES.map((angle) => (
                        <div key={angle.key} className="space-y-2">
                            <div className="flex justify-between">
                                <Label>{angle.label}</Label>
                                <span className="text-sm text-gray-500">{angleMix[angle.key as keyof typeof angleMix]}%</span>
                            </div>
                            <p className="text-sm text-gray-500">{angle.description}</p>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={angleMix[angle.key as keyof typeof angleMix]}
                                onChange={(e) => handleAngleChange(angle.key, parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    ))}

                    <div className="pt-4 border-t">
                        <Label>Number of Concepts to Generate</Label>
                        <div className="flex gap-2 mt-2">
                            {[5, 10, 15, 20].map((num) => (
                                <Button
                                    key={num}
                                    variant={conceptsRequested === num ? 'default' : 'outline'}
                                    onClick={() => setConceptsRequested(num)}
                                >
                                    {num}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Generating...' : 'Generate Ad Concepts'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}