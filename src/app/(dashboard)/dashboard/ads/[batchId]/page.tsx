import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BatchReviewClient from '@/components/ads/BatchReview'

export default async function BatchReviewPage({ 
    params 
}: { 
    params: Promise<{ batchId: string }> 
}) {
    const { batchId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch batch and concepts
    const { data: batch } = await supabase
        .from('generation_batches')
        .select('*')
        .eq('id', batchId)
        .single()

    const { data: concepts } = await supabase
        .from('ad_concepts')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })

    if (!batch || !concepts) {
        redirect('/dashboard/ads')
    }

    return <BatchReviewClient batch={batch} concepts={concepts} />
}