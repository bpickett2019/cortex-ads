import Anthropic from '@anthropic-ai/sdk'
import { COMPLIANCE_REVIEW_PROMPT } from '@/lib/ai/prompts'
import { ScanResult } from './scanner'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
})

interface LLMReviewResult {
    overall_status: 'pass' | 'flag' | 'reject'
    issues: Array<{
        text_segment: string
        issue_type: string
        severity: 'critical' | 'warning'
        explanation: string
        suggested_revision: string
    }>
    recommended_disclaimers: string[]
    overall_notes: string
}

export async function llmComplianceReview(
    headline: string,
    primaryText: string,
    description: string | null,
    cta: string,
    services: string[],
    state: string,
    doctorCredentials: string[]
): Promise<{ status: 'passed' | 'flagged' | 'rejected'; issues: ScanResult[]; notes: string }> {
    const prompt = COMPLIANCE_REVIEW_PROMPT
        .replace('{{services}}', services.join(', '))
        .replace('{{state}}', state)
        .replace('{{doctorCredentials}}', doctorCredentials.join(', '))
        .replace('{{headline}}', headline)
        .replace('{{primaryText}}', primaryText)
        .replace('{{description}}', description || 'N/A')
        .replace('{{cta}}', cta)

    try {
        const response = await anthropic.messages.create({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 2000,
            temperature: 0,
            system: 'You are a healthcare advertising compliance attorney. Respond with valid JSON only.',
            messages: [{ role: 'user', content: prompt }]
        })

        const content = response.content[0].type === 'text' ? response.content[0].text : ''

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('No JSON found in LLM response')
        }

        const result: LLMReviewResult = JSON.parse(jsonMatch[0])

        // Convert to ScanResult format
        const issues: ScanResult[] = result.issues.map(issue => ({
            ruleId: 'llm-review',
            ruleName: issue.issue_type,
            category: 'llm_review',
            severity: issue.severity,
            textSegment: issue.text_segment,
            issueType: issue.issue_type,
            explanation: issue.explanation,
            suggestedRevision: issue.suggested_revision
        }))

        return {
            status: result.overall_status === 'pass' ? 'passed' :
                result.overall_status === 'reject' ? 'rejected' : 'flagged',
            issues,
            notes: result.overall_notes
        }
    } catch (error) {
        console.error('LLM compliance review failed:', error)
        // Default to flagged on error - conservative approach
        return {
            status: 'flagged',
            issues: [{
                ruleId: 'system-error',
                ruleName: 'Review Failed',
                category: 'system',
                severity: 'warning',
                textSegment: '',
                issueType: 'review_failed',
                explanation: 'Automated compliance review encountered an error. Manual review required.',
                suggestedRevision: 'Request manual compliance review'
            }],
            notes: 'Compliance check failed due to system error'
        }
    }
}