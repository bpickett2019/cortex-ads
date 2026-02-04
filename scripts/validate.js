#!/usr/bin/env node

// Quick project validation script
// Run with: npm run test-setup

const fs = require('fs');
const path = require('path');

console.log('🔍 Cortex Ads Project Validation\n');

const requiredFiles = [
    'src/app/layout.tsx',
    'src/app/(auth)/auth/login/page.tsx',
    'src/app/(auth)/auth/signup/page.tsx',
    'src/app/(dashboard)/dashboard/page.tsx',
    'src/app/(dashboard)/dashboard/layout.tsx',
    'src/app/(dashboard)/dashboard/onboarding/page.tsx',
    'src/app/api/ads/generate/route.ts',
    'src/lib/supabase/client.ts',
    'src/lib/supabase/server.ts',
    'src/lib/ai/generate-ads.ts',
    'src/lib/compliance/checker.ts',
    'src/middleware.ts',
    'supabase/schema.sql'
];

const requiredDeps = [
    '@supabase/supabase-js',
    '@anthropic-ai/sdk', 
    'next',
    'react',
    'tailwindcss',
    'satori',
    'sharp'
];

console.log('📁 Checking required files...');
let filesMissing = 0;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file}`);
        filesMissing++;
    }
});

console.log('\n📦 Checking dependencies...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

let depsMissing = 0;
requiredDeps.forEach(dep => {
    if (allDeps[dep]) {
        console.log(`  ✅ ${dep} (${allDeps[dep]})`);
    } else {
        console.log(`  ❌ ${dep}`);
        depsMissing++;
    }
});

console.log('\n📊 Summary:');
console.log(`  Files: ${requiredFiles.length - filesMissing}/${requiredFiles.length} present`);
console.log(`  Dependencies: ${requiredDeps.length - depsMissing}/${requiredDeps.length} installed`);

if (filesMissing === 0 && depsMissing === 0) {
    console.log('\n✅ Project structure is complete!');
    console.log('\n🚀 Next steps:');
    console.log('  1. Set up Supabase project and run schema.sql');
    console.log('  2. Add environment variables (.env.local)');
    console.log('  3. Run: npm run db:seed');
    console.log('  4. Run: npm run dev');
} else {
    console.log('\n⚠️  Project needs additional setup');
    process.exit(1);
}