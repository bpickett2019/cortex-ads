import { scanAd, ScanResult } from './scanner'
import { llmComplianceReview } from './llm-review'

export interface ComplianceCheckResult {
    status: 'pending' | 'passed' | 'flagged' | 'rejected'
    issues: ScanResult[]
    notes: string
    checkedAt: string
}

export async function checkCompliance(
    headline: string,
    primaryText: string,
    description: string | null,
    cta: string,
    services: string[],
    state: string,
    doctorCredentials: string[]
): Promise<ComplianceCheckResult> {
    // Pass 1: Rule-based scan
    const scannerIssues = await scanAd(headline, primaryText, description, cta, services, state)

    // If critical issues found in scanner, reject immediately
    const hasCriticalScannerIssue = scannerIssues.some(i => i.severity === 'critical')

    if (hasCriticalScannerIssue) {
        return {
            status: 'rejected',
            issues: scannerIssues,
            notes: 'Critical compliance violations detected in rule-based scan',
            checkedAt: new Date().toISOString()
        }
    }

    // Pass 2: LLM review for nuanced analysis
    const llmResult = await llmComplianceReview(
        headline,
        primaryText,
        description,
        cta,
        services,
        state,
        doctorCredentials
    )

    // Combine issues
    const allIssues = [...scannerIssues, ...llmResult.issues]

    // Determine final status
    let finalStatus: 'passed' | 'flagged' | 'rejected'

    if (llmResult.status === 'rejected' || hasCriticalScannerIssue) {
        finalStatus = 'rejected'
    } else if (llmResult.status === 'flagged' || scannerIssues.length > 0) {
        finalStatus = 'flagged'
    } else {
        finalStatus = 'passed'
    }

    return {
        status: finalStatus,
        issues: allIssues,
        notes: llmResult.notes,
        checkedAt: new Date().toISOString()
    }
}