// =============================================
// Test Script for Flux Image Generation
// Run with: npx ts-node scripts/test-image-gen.ts
// =============================================

import { generateAdCreative, generateVariants } from '../src/lib/image-gen';
import { buildFluxPrompt } from '../src/lib/image-gen/prompt-builder';
import { generateFluxImage, isFluxConfigured } from '../src/lib/image-gen/together-client';
import { compositeImage } from '../src/lib/image-gen/compositor';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const TEST_OUTPUT_DIR = './test-output';

async function ensureOutputDir() {
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
        fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
}

async function saveImage(buffer: Buffer, filename: string) {
    const filepath = path.join(TEST_OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Saved: ${filepath}`);
    return filepath;
}

async function testTogetherClient() {
    console.log('\n🧪 Testing Together AI Client...\n');

    if (!isFluxConfigured()) {
        console.error('❌ TOGETHER_API_KEY not set');
        return false;
    }

    console.log('✅ Together AI configured');

    const result = await generateFluxImage(
        'Professional photograph of a confident 45-year-old man in business casual attire, standing in modern office, warm lighting',
        '1:1'
    );

    if (result) {
        await saveImage(result.imageBuffer, 'test-together-base.png');
        console.log(`✅ Generated in ${result.generationTimeMs}ms using ${result.model}`);
        return true;
    } else {
        console.error('❌ Generation failed');
        return false;
    }
}

async function testPromptBuilder() {
    console.log('\n🧪 Testing Prompt Builder...\n');

    const testCases = [
        {
            angle_type: 'trust_building',
            headline: 'Expert TRT Treatment',
            primary_text: 'Get professional hormone therapy',
            clinic_type: 'TRT' as const,
            target_gender: 'male' as const,
            target_age_range: [35, 55] as [number, number],
        },
        {
            angle_type: 'lifestyle',
            headline: 'Feel Like Yourself Again',
            primary_text: 'Rediscover your energy',
            clinic_type: 'wellness' as const,
            target_gender: 'all' as const,
            target_age_range: [30, 60] as [number, number],
        },
    ];

    for (const testCase of testCases) {
        const prompt = buildFluxPrompt(testCase);
        console.log(`\n📐 ${testCase.angle_type}:`);
        console.log(`   ${prompt.slice(0, 120)}...`);
    }

    return true;
}

async function testCompositor() {
    console.log('\n🧪 Testing Sharp Compositor...\n');

    // First generate a base image
    const fluxResult = await generateFluxImage(
        'Professional healthcare photograph of a fit 40-year-old man, natural lighting, neutral background',
        '1:1'
    );

    if (!fluxResult) {
        console.error('❌ Failed to generate base image');
        return false;
    }

    // Test compositing with different headlines
    const headlines = [
        'Rediscover Your Energy',
        'Expert Care You Can Trust',
        'Transform Your Life Today',
    ];

    for (let i = 0; i < headlines.length; i++) {
        const composited = await compositeImage(fluxResult.imageBuffer, {
            headline: headlines[i],
            brandConfig: {
                primaryColor: '#1E40AF',
                secondaryColor: '#F59E0B',
                fontFamily: 'Inter',
            },
            aspectRatio: '1:1',
            headlinePosition: i === 0 ? 'bottom' : i === 1 ? 'top' : 'center',
        });

        await saveImage(composited, `test-composite-${i + 1}.png`);
    }

    return true;
}

async function testFullPipeline() {
    console.log('\n🧪 Testing Full Generation Pipeline...\n');

    const result = await generateAdCreative({
        conceptId: 'test-concept-1',
        clinicId: 'test-clinic-1',
        angleType: 'trust_building',
        headline: 'Expert TRT Care in Austin',
        primaryText: 'Board-certified physicians specializing in testosterone replacement therapy',
        clinicType: 'TRT',
        targetGender: 'male',
        targetAgeRange: [35, 55],
        brandConfig: {
            primaryColor: '#1E40AF',
            secondaryColor: '#F59E0B',
            fontFamily: 'Inter',
        },
        aspectRatio: 'all',
    });

    if (result.success) {
        console.log('✅ Full pipeline succeeded');
        console.log(`   Method: ${result.model}`);
        console.log(`   Time: ${result.generationTimeMs}ms`);
        console.log(`   URLs:`, result.imageUrls);

        // Save prompt for reference
        if (result.prompt) {
            fs.writeFileSync(
                path.join(TEST_OUTPUT_DIR, 'test-prompt.txt'),
                result.prompt
            );
        }

        return true;
    } else {
        console.error('❌ Pipeline failed:', result.error);
        return false;
    }
}

async function testVariants() {
    console.log('\n🧪 Testing A/B/C Variant Generation...\n');

    const variants = await generateVariants({
        conceptId: 'test-concept-2',
        clinicId: 'test-clinic-1',
        angleType: 'lifestyle',
        headline: 'Feel Younger, Live Better',
        primaryText: 'Rediscover your vitality with personalized hormone therapy',
        clinicType: 'wellness',
        targetGender: 'all',
        targetAgeRange: [30, 60],
        brandConfig: {
            primaryColor: '#059669',
            secondaryColor: '#F59E0B',
            fontFamily: 'Inter',
        },
        aspectRatio: '1:1',
    });

    console.log('\n📊 Variant Results:');
    console.log(`   A: ${variants.a.success ? '✅' : '❌'} ${variants.a.generationTimeMs}ms`);
    console.log(`   B: ${variants.b.success ? '✅' : '❌'} ${variants.b.generationTimeMs}ms`);
    console.log(`   C: ${variants.c.success ? '✅' : '❌'} ${variants.c.generationTimeMs}ms`);

    return variants.a.success || variants.b.success || variants.c.success;
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Flux Image Generation Test Suite                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await ensureOutputDir();

    const results = {
        together: false,
        promptBuilder: false,
        compositor: false,
        pipeline: false,
        variants: false,
    };

    try {
        results.together = await testTogetherClient();
    } catch (e) {
        console.error('Together client test failed:', e);
    }

    try {
        results.promptBuilder = await testPromptBuilder();
    } catch (e) {
        console.error('Prompt builder test failed:', e);
    }

    try {
        results.compositor = await testCompositor();
    } catch (e) {
        console.error('Compositor test failed:', e);
    }

    try {
        results.pipeline = await testFullPipeline();
    } catch (e) {
        console.error('Full pipeline test failed:', e);
    }

    try {
        results.variants = await testVariants();
    } catch (e) {
        console.error('Variants test failed:', e);
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     Test Summary                                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Together AI Client: ${results.together ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Prompt Builder:     ${results.promptBuilder ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Sharp Compositor:   ${results.compositor ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Full Pipeline:      ${results.pipeline ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`A/B/C Variants:     ${results.variants ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r);
    console.log(`\n${allPassed ? '✅ All tests passed!' : '⚠️ Some tests failed'}`);
    console.log(`\nTest outputs saved to: ${TEST_OUTPUT_DIR}/`);

    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
