import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch clinic and stats
    const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    const { data: batches } = await supabase
        .from('generation_batches')
        .select('*')
        .eq('clinic_id', clinic?.id)
        .order('created_at', { ascending: false })
        .limit(5)

    const { data: stats } = await supabase
        .from('ad_concepts')
        .select('compliance_status, approval_status')
        .eq('clinic_id', clinic?.id)

    const pendingReview = stats?.filter(s => s.approval_status === 'pending').length || 0
    const approved = stats?.filter(s => s.approval_status === 'approved').length || 0
    const published = stats?.filter(s => s.published_at !== null).length || 0

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-gray-500">Welcome back to {clinic?.name}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pending Review</CardDescription>
                        <CardTitle className="text-3xl">{pendingReview}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Approved</CardDescription>
                        <CardTitle className="text-3xl">{approved}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Published</CardDescription>
                        <CardTitle className="text-3xl">{published}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Generated</CardDescription>
                        <CardTitle className="text-3xl">{stats?.length || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Link href="/dashboard/ads/generate">
                        <Button>Generate New Ads</Button>
                    </Link>
                    <Link href="/dashboard/competitors">
                        <Button variant="outline">View Competitors</Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Recent Batches */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Generation Batches</CardTitle>
                </CardHeader>
                <CardContent>
                    {batches && batches.length > 0 ? (
                        <div className="space-y-2">
                            {batches.map((batch) => (
                                <div
                                    key={batch.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">
                                            Batch {new Date(batch.created_at).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {batch.concepts_generated} concepts generated
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 rounded text-sm ${
                                            batch.status === 'ready' ? 'bg-green-100 text-green-800' :
                                                batch.status === 'error' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {batch.status}
                                        </span>
                                        <Link href={`/dashboard/ads/${batch.id}`}>
                                            <Button variant="outline" size="sm">Review</Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No generation batches yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}