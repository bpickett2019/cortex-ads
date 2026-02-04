import { supabaseAdmin } from '@/lib/supabase/admin'

export const SEED_COMPLIANCE_RULES = [
    // FDA Rules
    {
        category: 'fda',
        rule_name: 'Off-label TRT claims',
        severity: 'critical',
        banned_phrases: ['anti-aging cure', 'reverses aging', 'weight loss treatment', 'muscle building therapy', 'energy cure'],
        description: 'TRT is FDA-approved only for clinically diagnosed hypogonadism. Marketing for anti-aging, weight loss, muscle building, or energy as primary indications is off-label.'
    },
    {
        category: 'fda',
        rule_name: 'Cure language',
        severity: 'critical',
        banned_phrases: ['cure', 'cures', 'curing', 'permanent fix', 'eliminates', 'eradicates'],
        description: 'Cannot claim any treatment cures a condition.'
    },
    {
        category: 'fda',
        rule_name: 'Off-label HRT claims',
        severity: 'critical',
        banned_phrases: ['menopause cure', 'stops menopause', 'reverses menopause'],
        description: 'HRT treats symptoms but does not cure or reverse menopause.'
    },

    // FTC Rules
    {
        category: 'ftc',
        rule_name: 'Guaranteed outcomes',
        severity: 'critical',
        banned_phrases: ['guaranteed results', '100% effective', 'guaranteed', 'proven results', 'clinically proven'],
        banned_patterns: ['guarantee[ds]?\\s+\\w+'],
        description: 'Cannot guarantee treatment outcomes.'
    },
    {
        category: 'ftc',
        rule_name: 'Missing results disclaimer',
        severity: 'warning',
        description: 'Any testimonial or outcome reference must include "Individual results may vary."'
    },
    {
        category: 'ftc',
        rule_name: 'Unsubstantiated claims',
        severity: 'critical',
        banned_phrases: ['everyone sees results', 'all patients', 'no one fails', 'always works'],
        description: 'Cannot make absolute claims about treatment effectiveness without evidence.'
    },

    // HIPAA Rules
    {
        category: 'hipaa',
        rule_name: 'Patient data references',
        severity: 'critical',
        banned_phrases: ['your diagnosis', 'your condition', 'your test results', 'your bloodwork showed', 'your medical records'],
        description: 'Cannot reference or imply knowledge of individual patient health data in advertising.'
    },

    // Meta Policy Rules
    {
        category: 'meta_policy',
        rule_name: 'Personal health targeting',
        severity: 'critical',
        description: 'Cannot target ads based on health conditions. Use broad interest targeting only.'
    },
    {
        category: 'meta_policy',
        rule_name: 'Conversion optimization restriction',
        severity: 'critical',
        description: 'Health category advertisers cannot optimize for Purchase, AddToCart, or custom conversion events. Use Link Clicks or Landing Page Views.'
    },

    // General Rules
    {
        category: 'general',
        rule_name: 'No urgency/scarcity',
        severity: 'warning',
        banned_phrases: ['limited time', 'only X spots', 'act now', 'don\'t miss out', 'last chance', 'expires soon', 'hurry', 'urgent'],
        description: 'Urgency/scarcity tactics erode trust in healthcare advertising.'
    },
    {
        category: 'general',
        rule_name: 'No price in ads',
        severity: 'warning',
        banned_phrases: ['$', 'starting at', 'as low as', 'affordable', 'cheap', 'discount', 'free treatment', 'special price'],
        description: 'Pricing should be discussed in consultation, not in ad copy.'
    },
    {
        category: 'general',
        rule_name: 'AI face prohibition',
        severity: 'critical',
        description: 'Never use AI-generated faces for doctors or patients. Only real clinic-provided photos.'
    },
    {
        category: 'general',
        rule_name: 'No before/after without disclaimer',
        severity: 'warning',
        banned_phrases: ['before and after', 'transformed', 'complete transformation'],
        description: 'Before/after references require "Individual results may vary" disclaimer.'
    },
    {
        category: 'general',
        rule_name: 'Testimonial requirements',
        severity: 'warning',
        description: 'Testimonials must represent typical results or disclose atypical nature.'
    }
]

export async function seedComplianceRules() {
    console.log('Seeding compliance rules...')

    for (const rule of SEED_COMPLIANCE_RULES) {
        const { error } = await supabaseAdmin
            .from('compliance_rules')
            .upsert(
                { rule_name: rule.rule_name, ...rule },
                { onConflict: 'rule_name' }
            )

        if (error) {
            console.error(`Failed to seed rule "${rule.rule_name}":`, error)
        } else {
            console.log(`✓ ${rule.rule_name}`)
        }
    }

    console.log('Compliance rules seeding complete!')
}

// Run if executed directly
if (require.main === module) {
    seedComplianceRules().catch(console.error)
}