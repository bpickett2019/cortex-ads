# Cortex Ads - Healthcare Marketing Platform

A production-ready healthcare marketing SaaS platform that generates, reviews, and publishes compliant advertising for TRT/HRT/wellness clinics.

## ✅ Production Status

**ALL 15 STEPS COMPLETE** — Full MVP ready for deployment

## 🏗️ Completed Features

### Core Platform (Steps 1-8)
1. **Project Init** ✅ — Next.js 15, TypeScript, Tailwind, shadcn/ui
2. **Auth + Middleware** ✅ — Supabase Auth with RLS
3. **Onboarding Wizard** ✅ — 4-step clinic setup
4. **Dashboard Layout** ✅ — Stats, actions, batch review
5. **Compliance Engine** ✅ — Two-pass checking (rules + LLM)
6. **Ad Generation Engine** ✅ — Claude Sonnet integration
7. **Batch Review UI** ✅ — Approve/reject with feedback
8. **Image Template System** ✅ — 5 Satori templates, 3 aspect ratios

### Production Integrations (Steps 9-15)
9. **Apify Scraper** ✅ — Competitor ad scraping from Meta Ad Library
10. **Meta OAuth + Publishing** ✅ — Full Meta Marketing API integration
11. **Performance Tracking** ✅ — Daily metrics pull, CPA/CTR tracking
12. **Stripe Billing** ✅ — 3-tier subscriptions ($997-$1997/mo)
13. **Weekly Cron** ✅ — Automated generation based on tier limits
14. **Settings UI** ✅ — Integration management, billing
15. **Polish** ✅ — Rate limiting, security fixes, token refresh

## 🔐 Security & Compliance

### Rate Limiting
- Hourly limits by tier (5/15/50 requests)
- Weekly generation limits enforced
- Input sanitization to prevent prompt injection

### Authentication
- API routes protected (except webhooks)
- Meta tokens use Authorization headers (not URL params)
- Auto-refresh tokens 7 days before expiry
- AES-256-GCM encryption for stored tokens

### Compliance
- Two-pass checking: rule-based + LLM review
- **Sonnet (not Opus)** for cost-effective compliance analysis
- ReDoS protection on regex patterns
- Banned phrases for FDA/FTC/HIPAA/Meta policies

## 📁 Project Structure

```
cortex-ads/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login/signup
│   │   ├── (dashboard)/      # Main app pages
│   │   └── api/              # API routes (26 endpoints)
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   └── ads/              # Ad-specific components
│   └── lib/
│       ├── ai/               # Claude generation
│       ├── compliance/       # Compliance engine
│       ├── meta/             # Meta Marketing API
│       ├── scraper/          # Apify integration
│       ├── stripe/           # Billing
│       ├── templates/        # Satori image templates
│       └── utils/            # Rate limiting, encryption
├── supabase/
│   ├── schema.sql            # Base schema
│   └── schema-additions.sql  # Scraping jobs, rate limits
└── README.md
```

## 🚀 Deployment Setup

### 1. Database (Supabase)
```bash
# Run migrations
psql -d your_db < supabase/schema.sql
psql -d your_db < supabase/schema-additions.sql

# Seed compliance rules
npm run db:seed

# Generate types
npm run db:types
```

### 2. Environment Variables
```bash
# Required in .env.local (not committed)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
META_APP_ID=
META_APP_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
APIFY_TOKEN=
CRON_SECRET=
```

### 3. Stripe Products
Create 3 products with these price IDs:
- **Starter:** $997/mo — 10 ads/month
- **Growth:** $1497/mo — 25 ads/month  
- **Full Stack:** $1997/mo — Unlimited

### 4. Meta App
- Create at developers.facebook.com
- Add Marketing API product
- OAuth redirect: `/api/meta/callback`

### 5. Build & Deploy
```bash
npm install
npm run build
npm run dev  # or deploy to Vercel
```

## 🎯 API Endpoints

### Ads
- `POST /api/ads/generate` — Generate new batch (rate limited)
- `POST /api/ads/[id]/approve` — Approve concept
- `POST /api/ads/[id]/reject` — Reject with feedback
- `POST /api/ads/[id]/generate-images` — Generate images

### Meta
- `GET /api/meta/oauth` — Start OAuth flow
- `GET /api/meta/callback` — OAuth callback
- `POST /api/meta/publish` — Publish to Meta Ads

### Stripe
- `POST /api/stripe/checkout` — Create checkout session
- `POST /api/stripe/webhooks` — Stripe events

### Cron (Protected by CRON_SECRET)
- `GET /api/cron/pull-performance` — Daily metrics sync
- `GET /api/cron/generate-weekly` — Weekly auto-generation

### Competitors
- `GET /api/competitors` — List competitors
- `POST /api/competitors` — Add competitor
- `POST /api/scraper/run` — Trigger scraper
- `POST /api/scraper/webhook` — Apify webhook (public)

## 🎨 Image Generation

**Templates:**
- `headline-hero` — Bold headline focus
- `doctor-trust` — Doctor credibility
- `stat-callout` — Statistics/numbers
- `split-comparison` — Before/after style
- `testimonial-card` — Social proof

**Aspect Ratios:**
- Square (1:1) — 1080x1080
- Portrait (4:5) — 1080x1350
- Landscape (1.91:1) — 1200x628

## 📊 Compliance System

**Three Statuses:**
- `passed` — Ready for approval
- `flagged` — Warnings but approvable
- `rejected` — Critical violations

**Rule Categories:**
- FDA (medical claims)
- FTC (advertising standards)
- HIPAA (privacy)
- Meta (platform policies)
- State-specific regulations

## 💰 Billing Tiers

| Tier | Price | Ads/Month | Ad Spend Limit |
|------|-------|-----------|----------------|
| Starter | $997 | 10 | $5,000 |
| Growth | $1,497 | 25 | $15,000 |
| Full Stack | $1,997 | Unlimited | $50,000 |

## 🚧 Known Limitations

1. **Tests:** Zero automated test coverage — compliance engine needs tests
2. **Google Ads:** OAuth scaffolded but not fully implemented
3. **SMS:** MSG91 integration in DRY_RUN mode
4. **Image Storage:** Assumes Supabase Storage (configurable)

## 🎯 Next Priorities

1. Add integration tests for compliance engine
2. Complete Google Ads OAuth + publishing
3. Implement SMS provider (Twilio alternative)
4. Add real-time WebSocket for generation progress
5. Build campaign performance dashboard

## 📄 License

Private — Cortex Labs internal use
