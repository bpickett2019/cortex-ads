'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Concept {
    id: string
    angle_type: string
    headline: string
    primary_text: string
    description: string | null
    cta: string
    template_id: string | null
    compliance_status: string
    compliance_issues: any[]
    approval_status: string
}

interface Batch {
    id: string
    status: string
    concepts_generated: number
    concepts_passed: number
    created_at: string
}

interface BatchReviewPageProps {
    batch: Batch
    concepts: Concept[]
}

export default function BatchReviewClient({ batch, concepts }: BatchReviewPageProps) {
    const router = useRouter()
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({})
    const [showRejectForm, setShowRejectForm] = useState<string | null>(null)

    const handleApprove = async (conceptId: string) => {
        setUpdatingId(conceptId)
        try {
            const response = await fetch(`/api/ads/${conceptId}/approve`, {
                method: 'POST',
            })
            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error('Failed to approve:', error)
        }
        setUpdatingId(null)
    }

    const handleReject = async (conceptId: string) => {
        setUpdatingId(conceptId)
        try {
            const response = await fetch(`/api/ads/${conceptId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feedback: rejectFeedback[conceptId]
                }),
            })
            if (response.ok) {
                setShowRejectForm(null)
                setRejectFeedback(prev => ({ ...prev, [conceptId]: '' }))
                router.refresh()
            }
        } catch (error) {
            console.error('Failed to reject:', error)
        }
        setUpdatingId(null)
    }

    const getComplianceBadgeVariant = (status: string) => {
        switch (status) {
            case 'passed': return 'success'
            case 'flagged': return 'warning'
            case 'rejected': return 'destructive'
            default: return 'outline'
        }
    }

    const getApprovalBadgeVariant = (status: string) => {
        switch (status) {
            case 'approved': return 'success'
            case 'rejected': return 'destructive'
            default: return 'outline'
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Batch Review</h1>
                <p className="text-gray-500">
                    Generated {new Date(batch.created_at).toLocaleDateString()} • 
                    {concepts.length} concepts
                </p>
            </div>

            {/* Batch Status */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Batch Status</CardTitle>
                        <Badge variant={batch.status === 'ready' ? 'success' : 'warning'}>
                            {batch.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Concepts Generated</p>
                            <p className="text-2xl font-bold">{batch.concepts_generated}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Compliance Passed</p>
                            <p className="text-2xl font-bold">
                                {concepts.filter(c => c.compliance_status === 'passed').length}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Approved</p>
                            <p className="text-2xl font-bold">
                                {concepts.filter(c => c.approval_status === 'approved').length}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Concepts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {concepts.map((concept) => (
                    <Card key={concept.id} className="relative">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="outline" className="mb-2">
                                        {concept.angle_type.replace('_', ' ')}
                                    </Badge>
                                    <h3 className="font-semibold">{concept.headline}</h3>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Badge variant={getComplianceBadgeVariant(concept.compliance_status)}>
                                        {concept.compliance_status}
                                    </Badge>
                                    <Badge variant={getApprovalBadgeVariant(concept.approval_status)}>
                                        {concept.approval_status}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Primary Text</p>
                                    <p className="text-sm">{concept.primary_text}</p>
                                </div>
                                
                                <div>
                                    <p className="text-sm text-gray-500">Description</p>
                                    <p className="text-sm">{concept.description || '—'}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">CTA</p>
                                    <p className="text-sm font-medium">{concept.cta}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">Template</p>
                                    <p className="text-sm">{concept.template_id || '—'}</p>
                                </div>

                                {/* Compliance Issues */}
                                {concept.compliance_issues && concept.compliance_issues.length > 0 && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm font-medium text-red-800 mb-2">Compliance Issues</p>
                                        {concept.compliance_issues.map((issue: any, idx: number) => (
                                            <div key={idx} className="text-xs text-red-700 mb-1">
                                                • {issue.explanation}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    {concept.compliance_status === 'passed' || concept.compliance_status === 'flagged' ? (
                                        concept.approval_status === 'pending' ? (
                                            <>
                                                <Button 
                                                    size="sm" 
                                                    className="flex-1"
                                                    onClick={() => handleApprove(concept.id)}
                                                    disabled={updatingId === concept.id}
                                                >
                                                    {updatingId === concept.id ? '...' : 'Approve'}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="flex-1"
                                                    onClick={() => setShowRejectForm(concept.id)}
                                                    disabled={updatingId === concept.id}
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        ) : concept.approval_status === 'approved' ? (
                                            <Button size="sm" className="w-full" variant="outline">
                                                Ready to Publish
                                            </Button>
                                        ) : null
                                    ) : concept.compliance_status === 'rejected' ? (
                                        <Button size="sm" variant="outline" className="w-full" disabled>
                                            Cannot Approve - Compliance Violations
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" className="w-full" disabled>
                                            Compliance Review Pending
                                        </Button>
                                    )}
                                </div>

                                {/* Reject Form */}
                                {showRejectForm === concept.id && (
                                    <div className="pt-2 space-y-2">
                                        <Textarea
                                            placeholder="Why are you rejecting this concept?"
                                            value={rejectFeedback[concept.id] || ''}
                                            onChange={(e) => setRejectFeedback(prev => ({ 
                                                ...prev, 
                                                [concept.id]: e.target.value 
                                            }))}
                                            className="text-sm"
                                        />
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="flex-1"
                                                onClick={() => setShowRejectForm(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                className="flex-1"
                                                onClick={() => handleReject(concept.id)}
                                                disabled={updatingId === concept.id}
                                            >
                                                {updatingId === concept.id ? '...' : 'Confirm Reject'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}