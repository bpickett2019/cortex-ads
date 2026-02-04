# Cortex Ads - Healthcare Marketing Platform

A Next.js-based healthcare marketing SaaS platform that generates compliant advertising for TRT/HRT/wellness clinics.

## 🏗️ Build Status

**✅ COMPLETED STEPS (1-8):**

1. **Project Init** ✅
2. **Auth + Middleware** ✅
3. **Onboarding Wizard** ✅
4. **Dashboard Layout** ✅
5. **Compliance Engine** ✅
6. **Ad Generation Engine** ✅
7. **Batch Review UI** ✅
8. **Image Template System** ✅

### **All 5 Image Templates Created:**
- ✅ `headline-hero.tsx` - Bold headline focus
- ✅ `doctor-trust.tsx` - Doctor credibility
- ✅ `stat-callout.tsx` - Statistics/numbers
- ✅ `split-comparison.tsx` - Before/after style
- ✅ `testimonial-card.tsx` - Social proof

### **Complete API Surface:**
- ✅ `/api/ads/generate` - Trigger batch generation
- ✅ `/api/ads/[id]/approve` - Approve concept
- ✅ `/api/ads/[id]/reject` - Reject concept
- ✅ `/api/ads/[id]/generate-images` - Generate Satori images

## 🚧 NEXT STEPS (9-15):

9. **Apify Scraper Integration** - Not started
10. **Meta OAuth + Publishing** - Not started
11. **Performance Tracking** - Not started
12. **Stripe Billing** - Not started
13. **Weekly Cron** - Not started
14. **Polish** - Not started

## 🎯 Current State

**FULLY FUNCTIONAL MVP:**
- ✅ User authentication with Supabase Auth
- ✅ Multi-step clinic onboarding
- ✅ Dashboard with stats and navigation
- ✅ Ad generation with Claude AI
- ✅ Two-pass compliance checking (rule-based + LLM)
- ✅ Batch review UI with approve/reject actions
- ✅ 5 customizable image templates
- ✅ Server-side image generation (Satori + Sharp)
- ✅ Audit logging for all actions
- ✅ RLS-secured database

## 📁 Project Structure

```
cortex-ads/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login/signup pages
│   │   ├── (dashboard)/      # Main application
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   └── ads/              # Ad-specific components
│   └── lib/
│       ├── ai/               # Claude integration
│       ├── compliance/       # Compliance engine
│       ├── templates/        # 5 Satori templates
│       └── supabase/         # Database clients
├── supabase/schema.sql       # Complete database schema
└── README.md
```

## 🚀 Setup Required

1. **Supabase Project:**
   ```bash
   # Run the schema
   psql -d your_db < supabase/schema.sql
   
   # Seed compliance rules
   npm run db:seed
   
   # Generate types
   npm run db:types
   ```

2. **Environment Variables:**
   ```bash
   cp .env.local.example .env.local
   # Fill in: Supabase, Anthropic, Meta, Stripe keys
   ```

3. **Build & Run:**
   ```bash
   npm install
   npm run build  # Compiles successfully
   npm run dev
   ```

## 🎨 Image Generation Flow

```
Template Props → Satori → SVG → Sharp → PNG → Supabase Storage → Public URL
```

All 3 aspect ratios generated:
- **Square** (1:1) - 1080x1080 - Instagram, Facebook feed
- **Portrait** (4:5) - 1080x1350 - Instagram feed
- **Landscape** (1.91:1) - 1200x628 - Facebook ads

## ✅ Compliance System

**Two-Pass Architecture:**
1. **Rule-based scanner** - Banned phrases/patterns (FDA/FTC/HIPAA)
2. **LLM review** - Claude Opus for nuanced legal analysis

**Statuses:**
- `passed` - Ready for approval
- `flagged` - Warnings but can be approved
- `rejected` - Critical violations, cannot approve

## 🎯 Ready for Production

The core platform is **complete and functional**. Next focus:
- Meta OAuth flow for ad publishing
- Apify competitor scraping
- Stripe billing integration
- Performance tracking dashboard

**Estimated completion:** Steps 9-14 would take ~2-3 more days of work.