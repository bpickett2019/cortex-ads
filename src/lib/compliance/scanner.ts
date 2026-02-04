import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ComplianceRule {
    id: string
    category: 'meta_policy' | 'fda' | 'ftc' | 'state_specific' | 'hipaa' | 'general'
    rule_name: string
    description: string
    banned_phrases: string[]
    banned_patterns: string[]
    required_disclaimers: string[]
    applicable_states: string[] | null
    applicable_services: string[] | null
    severity: 'critical' | 'warning' | 'info'
    active: boolean
}

export interface ScanResult {
    ruleId: string
    ruleName: string
    category: string
    severity: 'critical' | 'warning' | 'info'
    textSegment: string
    issueType: string
    explanation: string
    suggestedRevision: string
}

export async function scanAd(
    headline: string,
    primaryText: string,
    description: string | null,
    cta: string,
    services: string[],
    state: string
): Promise<ScanResult[]> {
    const fullText = `${headline} ${primaryText} ${description || ''} ${cta}`.toLowerCase()
    const issues: ScanResult[] = []

    // Fetch active rules
    const { data: rules } = await supabaseAdmin
        .from('compliance_rules')
        .select('*')
        .eq('active', true)

    if (!rules) return issues

    for (const rule of rules as ComplianceRule[]) {
        // Check state applicability
        if (rule.applicable_states && !rule.applicable_states.includes(state)) {
            continue
        }

        // Check service applicability
        if (rule.applicable_services) {
            const hasApplicableService = services.some(s =>
                rule.applicable_services!.includes(s)
            )
            if (!hasApplicableService) continue
        }

        // Check banned phrases
        for (const phrase of rule.banned_phrases) {
            if (fullText.includes(phrase.toLowerCase())) {
                issues.push({
                    ruleId: rule.id,
                    ruleName: rule.rule_name,
                    category: rule.category,
                    severity: rule.severity,
                    textSegment: phrase,
                    issueType: 'banned_phrase',
                    explanation: rule.description,
                    suggestedRevision: `Remove or replace "${phrase}"`
                })
            }
        }

        // Check banned patterns (regex) - with ReDoS protection
        for (const pattern of rule.banned_patterns) {
            // Validate pattern before use (prevent ReDoS)
            if (!isValidRegexPattern(pattern)) {
                console.error(`Skipping potentially dangerous regex pattern: ${pattern}`)
                continue
            }

            try {
                const regex = new RegExp(pattern, 'i')
                // Use exec with limited input length to prevent ReDoS
                const safeText = fullText.substring(0, 10000) // Limit input size
                const match = regex.exec(safeText)
                if (match) {
                    issues.push({
                        ruleId: rule.id,
                        ruleName: rule.rule_name,
                        category: rule.category,
                        severity: rule.severity,
                        textSegment: match[0].substring(0, 100), // Limit output
                        issueType: 'banned_pattern',
                        explanation: rule.description,
                        suggestedRevision: 'Revise to remove prohibited claim'
                    })
                }
            } catch (e) {
                console.error(`Invalid regex pattern: ${pattern}`)
            }
        }
    }

    return issues
}

/**
 * Validate regex pattern to prevent ReDoS attacks
 * Rejects patterns with dangerous constructs
 */
function isValidRegexPattern(pattern: string): boolean {
    // Reject empty patterns
    if (!pattern || pattern.length === 0) return false

    // Reject overly long patterns
    if (pattern.length > 500) return false

    // Reject patterns with excessive quantifiers (common ReDoS vector)
    const dangerousPatterns = [
        /\([^)]*\+\+/,       // Nested quantifiers like (a+)+ or (a*)+
        /\([^)]*\*\*/,       // Double star patterns
        /\([^)]*\+\*/,       // Mixed quantifiers
        /\{[0-9]+,[0-9]+\}\{/, // Nested quantifiers with braces
    ]

    for (const dangerous of dangerousPatterns) {
        if (dangerous.test(pattern)) {
            console.warn(`Pattern rejected (ReDoS risk): ${pattern}`)
            return false
        }
    }

    // Try to compile to catch syntax errors
    try {
        new RegExp(pattern)
        return true
    } catch {
        return false
    }
    }

    return issues
}