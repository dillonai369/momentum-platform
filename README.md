# Momentum Platform

A multi-tenant white-label CRM platform for insurance agencies.

**Three-tier architecture:**
- **Platform** (you, Dillon) — owns and provisions all agency tenants
- **Agency tenants** (Momentum, Bullpen, future) — each white-labeled with own brand, logo, domain
- **Agent sub-accounts** (Ryan Heagney, future agents) — see only their own data

**Built with:** Next.js 14 · TypeScript · Tailwind · shadcn/ui · Supabase · Clerk · Cal.com · Resend · GoHighLevel API · Vercel

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in keys
cp .env.local.example .env.local
# (edit .env.local with your Supabase, Clerk, GHL, etc. keys)

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

The portal currently shows the Dashboard with placeholder data. Other pages and real data wiring come in tasks #6 onwards.

---

## Project Structure

```
app/
  (portal)/              # All authenticated portal pages share this layout
    layout.tsx           # Sidebar shell
    dashboard/page.tsx   # Dashboard (KPIs, trends, activity)
  layout.tsx             # Root HTML layout
  page.tsx               # Root → redirects to /dashboard
  globals.css            # Tailwind + Momentum design tokens

components/
  portal/                # Portal-specific components (sidebar, header, etc.)
  ui/                    # Reusable primitives (buttons, inputs, etc. — added as needed)

lib/
  utils.ts               # cn(), formatCurrency, formatDate

db/                      # Supabase schema + migrations (added in task #6)
```

---

## Design System

Momentum brand: **white / black / silver foundation, purple + blue accents.**

Key Tailwind tokens (see `tailwind.config.ts`):
- `bg-canvas` (white) / `bg-surface` (light gray) / `bg-muted`
- `text-ink` (near-black) / `text-ink-subtle` (gray) / `text-ink-faint` (lighter gray)
- `bg-nav` (dark sidebar) / `text-nav-text` / `bg-nav-hover`
- `text-purple` `bg-purple` `bg-purple-deep` (primary accent)
- `text-blue` `bg-blue` `bg-blue-light` (secondary accent)
- `text-success` / `text-warning` / `text-danger` for statuses

Component shortcuts: `.card`, `.card-hover`, `.btn-primary`, `.btn-secondary`, `.label`

---

## Roadmap

See the task list in Cowork chat for the full build plan. High-level:

1. ✅ Project scaffold + design system
2. Supabase multi-tenant schema + RLS
3. Clerk auth + tenant resolver middleware
4. All 8 page routes with mock data
5. Lead intake + Meta Lead Ads webhook + GHL contact sync
6. Application submission + Cal.com booking + activity log
7. Real Supabase data + UI polish to TruLife quality
8. Vercel deploy + custom domain + tenant-provisioning runbook
