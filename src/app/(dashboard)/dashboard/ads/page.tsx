import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function AdsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: clinicRow } = await supabase
        .from('clinics')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

    const clinicId = (clinicRow as { id: string } | null)?.id

    if (!clinicId) {
        redirect('/dashboard/onboarding')
    }

    const { data: batches } = await supabase
        .from('generation_batches')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Ad Concepts</h1>
                    <p className="text-gray-500">Manage your generated ad concepts</p>
                </div>
                <Link href="/dashboard/ads/generate">
                    <Button>Generate New Ads</Button>
                </Link>
            </div>

            <div className="grid gap-4">
                {batches?.map((batch: any) => (
                    <Card key={batch.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">
                                    Batch {new Date(batch.created_at).toLocaleDateString()}
                                </CardTitle>
                                <p className="text-sm text-gray-500">
                                    {batch.concepts_generated || 0} concepts • Triggered by {batch.triggered_by}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge
                                    variant={
                                        batch.status === 'ready' ? 'success' :
                                            batch.status === 'error' ? 'destructive' :
                                                'warning'
                                    }
                                >
                                    {batch.status}
                                </Badge>
                                <Link href={`/dashboard/ads/${batch.id}`}>
                                    <Button variant="outline">Review</Button>
                                </Link>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    )
}