# Momentum Platform — Setup Checklist

Single source of truth for everything Dillon needs to do to get the portal live. Steps in order. Do steps **1, 2, 5, 8** first to unblock localhost build tonight.

---

## 1. Supabase

- supabase.com → "New Project"
- Name: `momentum-platform`, pick closest region, set strong DB password
- Wait ~2 min
- Settings → API → copy: **Project URL**, **anon public key**, **service_role secret key**
- Paste into `.env.local` or send to Claude in chat

---

## 2. Clerk

- clerk.com → sign up with dmkmarketing33@gmail.com
- "Create Application" → name: **Momentum**
- Sign-in methods: ✅ Email + ✅ Password (skip social for now)
- API Keys → copy **Publishable key** + **Secret key**
- Paste into `.env.local` or send

---

## 3. Cloudflare

- cloudflare.com → sign up → "Add a site" → `momentummarketing.io`
- Change registrar's nameservers to Cloudflare's (they show you), OR register/transfer through Cloudflare Registrar (cheapest)
- "My Profile" → "API Tokens" → "Create Token" → "Edit zone DNS" template, scoped to momentummarketing.io zone
- Save and send the token

---

## 4. GitHub

- github.com/new → name: `momentum-platform` → **Private** → no README
- Send the repo URL

---

## 5. GoHighLevel — Ryan's existing sub-account

**Do NOT rename the sub-account.** A2P 10DLC SMS verification is bound to "Ryan Heagney LLC" — renaming risks weeks-long re-verification. Momentum branding lives at the portal layer only; the sub-account underneath stays as-is. Leads never see the GHL name.

- Open Ryan's existing sub-account in your agency dashboard (leave the name alone)
- Settings (gear) → Business Profile → **API Key** → create or copy
- Grab **Location ID** from URL while inside the sub-account (long string after `/location/`)
- Send both: API Key + Location ID

---

## 6. Cal.com (non-blocking)

- cal.com → sign up → username: `momentum` or `ryanheagney`
- Settings → Developer → API Keys → create
- Send the key

---

## 7. Resend (non-blocking)

- resend.com → sign up → API Keys → "Full access" → create
- Send the key
- Domain verification (momentummarketing.io DNS records) happens after step 3 is live

---

## 8. Run the project locally

Supabase + Clerk keys are in `.env.local` already.

```bash
node --version          # confirm v18+ (install from nodejs.org if missing)
cd ~/Documents/Claude/Projects/Insurance/momentum-platform
npm install             # installs Clerk, Supabase, etc.
npm run dev             # → http://localhost:3000
```

**First boot redirects to `/sign-in`.** Sign up with `dmkmarketing33@gmail.com` — the first user in any tenant is auto-provisioned as `platform_owner` (you). Future signups default to `agent`.

### 8a. Required: load the schema into Supabase

Before the portal can render anything, the database tables need to exist. **Two options:**

**Option A — paste once (30 sec, recommended):**
1. Open https://supabase.com/dashboard/project/wzpzpaeyvotuczpvoyuk/sql/new
2. Paste the contents of `db/schema.sql`
3. Click **Run** → "Success. No rows returned"

**Option B — script it (set up once, run anytime):**
1. Get DB connection string: Supabase Dashboard → Settings → Database → Connection string → URI
2. Add to `.env.local`:
   ```
   SUPABASE_DB_URL=postgres://postgres.wzpzpaeyvotuczpvoyuk:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
3. Run `npm run db:deploy`

---

## 9. Vercel (after #4 + #8)

- "Add New Project" → import `momentum-platform` repo
- Paste `.env.local` values into Vercel's env vars settings
- Add custom domain: `momentummarketing.io`
- Vercel gives DNS records → paste into Cloudflare DNS panel

---

## 10. Meta Business Manager (last — for ad launch)

- Get admin access to Ryan's ad account
- We wire Meta Lead Ads → portal webhook then

---

## What Claude does in parallel while you set this up

- Multi-tenant Supabase schema + RLS policies (task #6)
- Tenant resolver middleware + Clerk integration with 3-tier RBAC (task #7)
- All 8 page routes with mock data (task #8)
- Lead intake form + Meta webhook handler (task #9 — needs your keys)
- Application + booking + activity wiring (task #10)
- Real data + UI polish (task #11)
- Vercel deploy + tenant-provisioning runbook (task #12)

---

## Momentum Brand Reference

- **Domain:** momentummarketing.io (Cloudflare)
- **Palette:** white/black/silver foundation; `#7C3AED` purple + `#2563EB` blue accents
- **First agent:** Ryan Heagney (H-E-A-G-N-E-Y)
- **GHL sub-account name:** Momentum CRM
- **A2P/SMS pattern:** ONE shared Momentum number, agent name personalized in message body via `{{contact.assigned_user.first_name}}` merge field

---

## SMS Personalization (clarification)

Shared Momentum number is the **From:** field only. The message **body** is fully personalized per agent via GHL merge fields:

> "Hi Sarah, this is **Ryan** from **Momentum Insurance**. Saw you requested info on whole life — got 5 minutes to chat?"

Different agents on the same number → different signatures, different names, different sigs in the body. Recipient feels personal contact.
