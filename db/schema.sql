-- =====================================================================
-- MOMENTUM PLATFORM — Multi-tenant Schema
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- Idempotent: safe to re-run during early dev (uses IF NOT EXISTS where possible)
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('platform_owner', 'agency_owner', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('new', 'contacted', 'qualified', 'booked', 'unqualified', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('draft', 'submitted', 'underwriting', 'approved', 'declined', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_status as enum ('active', 'lapsed', 'cancelled', 'paid_up');
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_type as enum (
    'term_life', 'whole_life', 'iul', 'final_expense',
    'annuity', 'medicare_supplement', 'long_term_care', 'group_benefits',
    'no_exam_life', 'return_of_premium'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- TENANTS — agency-level (Momentum, Bullpen, future white-labels)
-- ---------------------------------------------------------------------
create table if not exists tenants (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  brand_name          text not null,
  logo_url            text,
  primary_color       text default '#7C3AED',
  secondary_color     text default '#2563EB',
  custom_domain       text unique,
  ghl_location_id     text,
  ghl_api_key         text,                          -- TODO: encrypt at rest in v2
  cal_team_username   text,
  resend_from_email   text,
  meta_app_id         text,
  meta_app_secret     text,
  active              boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ---------------------------------------------------------------------
-- USERS — synced from Clerk via webhook
-- platform_owner: tenant_id = NULL (sees everything)
-- agency_owner / agent: tenant_id = their agency
-- ---------------------------------------------------------------------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  clerk_user_id   text unique not null,
  tenant_id       uuid references tenants(id) on delete cascade,
  email           text not null,
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  role            user_role not null default 'agent',
  ghl_user_id     text,                              -- their assigned GHL user (for SMS routing)
  cal_username    text,
  bio             text,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists users_tenant_id_idx on users(tenant_id);
create index if not exists users_clerk_user_id_idx on users(clerk_user_id);
create index if not exists users_role_idx on users(role);

-- ---------------------------------------------------------------------
-- CARRIERS — per tenant (Ryan's contracted carriers under Momentum)
-- ---------------------------------------------------------------------
create table if not exists carriers (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  name              text not null,
  slug              text not null,
  logo_url          text,
  description       text,
  product_lines     text[] default '{}',             -- e.g. ['term_life','whole_life','iul']
  agent_phone       text,
  agent_email       text,
  agent_portal_url  text,
  display_order     int default 0,
  active            boolean default true,
  created_at        timestamptz default now(),
  unique(tenant_id, slug)
);

create index if not exists carriers_tenant_id_idx on carriers(tenant_id);

-- ---------------------------------------------------------------------
-- LEADS — incoming prospects (Meta Lead Ads, manual, etc.)
-- ---------------------------------------------------------------------
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  agent_id          uuid references users(id) on delete set null,
  ghl_contact_id    text,
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  state             text,
  source            text,                            -- 'meta_lead_ad' | 'manual' | 'form' | 'import'
  source_metadata   jsonb,
  status            lead_status default 'new',
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists leads_tenant_agent_idx on leads(tenant_id, agent_id);
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_ghl_contact_idx on leads(ghl_contact_id);
create index if not exists leads_created_at_idx on leads(created_at desc);

-- ---------------------------------------------------------------------
-- APPLICATIONS
-- ---------------------------------------------------------------------
create table if not exists applications (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  agent_id            uuid not null references users(id),
  lead_id             uuid references leads(id) on delete set null,
  app_id              text unique not null,           -- human-readable "APP-30001"
  carrier_id          uuid references carriers(id),
  policy_type         policy_type not null,
  client_first_name   text not null,
  client_last_name    text not null,
  client_age          int,
  client_email        text,
  client_phone        text,
  annual_premium      numeric(12,2),
  coverage_amount     numeric(14,2),
  status              application_status default 'submitted',
  notes               text,
  submitted_at        timestamptz default now(),
  decision_at         timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists applications_tenant_agent_idx on applications(tenant_id, agent_id);
create index if not exists applications_status_idx on applications(status);
create index if not exists applications_app_id_idx on applications(app_id);

-- ---------------------------------------------------------------------
-- POLICIES (issued from approved applications)
-- ---------------------------------------------------------------------
create table if not exists policies (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  agent_id                uuid not null references users(id),
  application_id          uuid references applications(id),
  policy_number           text,
  status                  policy_status default 'active',
  effective_date          date,
  premium_paid_to_date    numeric(12,2) default 0,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists policies_tenant_agent_idx on policies(tenant_id, agent_id);
create index if not exists policies_status_idx on policies(status);

-- ---------------------------------------------------------------------
-- TRAININGS — per-tenant resource library (videos, links, scripts)
-- ---------------------------------------------------------------------
create table if not exists trainings (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  category        text not null,                    -- 'onboarding' | 'e_app_tutorials' | 'scripts'
  title           text not null,
  description     text,
  resource_type   text not null,                    -- 'video' | 'link' | 'document'
  resource_url    text not null,
  display_order   int default 0,
  carrier_id      uuid references carriers(id),     -- if specific to a carrier
  created_at      timestamptz default now()
);

create index if not exists trainings_tenant_category_idx on trainings(tenant_id, category);

-- ---------------------------------------------------------------------
-- ACTIVITY LOG — drives the dashboard recent-activity feed
-- ---------------------------------------------------------------------
create table if not exists activity_log (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  agent_id      uuid references users(id) on delete set null,
  actor_id      uuid references users(id),
  entity_type   text not null,                      -- 'lead' | 'application' | 'policy' | 'booking'
  entity_id     uuid,
  action        text not null,                      -- 'created' | 'updated' | 'submitted' | 'approved'
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);

create index if not exists activity_tenant_agent_idx on activity_log(tenant_id, agent_id);
create index if not exists activity_created_at_idx on activity_log(created_at desc);

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS for RLS (in `public` schema — Supabase locks `auth`)
-- These read tenant_id, role, and user_id from the Clerk JWT claims.
-- When using the service-role key (server-side), RLS is bypassed entirely
-- and these aren't called — they exist for defense-in-depth on the off
-- chance we ever expose direct PostgREST/anon access.
-- ---------------------------------------------------------------------
create or replace function public.user_tenant_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
$$;

create or replace function public.user_role_claim() returns text
language sql stable as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$$;

create or replace function public.user_db_id() returns uuid
language sql stable as $$
  select id from users where clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' limit 1;
$$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (defense-in-depth)
-- App enforces filters in code via service-role; RLS catches anything we miss.
-- ---------------------------------------------------------------------
alter table tenants       enable row level security;
alter table users         enable row level security;
alter table carriers      enable row level security;
alter table leads         enable row level security;
alter table applications  enable row level security;
alter table policies      enable row level security;
alter table trainings     enable row level security;
alter table activity_log  enable row level security;

-- Drop existing policies if re-running
drop policy if exists tenants_select on tenants;
drop policy if exists tenants_modify on tenants;
drop policy if exists users_select on users;
drop policy if exists users_modify on users;
drop policy if exists carriers_select on carriers;
drop policy if exists carriers_modify on carriers;
drop policy if exists leads_select on leads;
drop policy if exists leads_modify on leads;
drop policy if exists apps_select on applications;
drop policy if exists apps_modify on applications;
drop policy if exists policies_select on policies;
drop policy if exists policies_modify on policies;
drop policy if exists trainings_select on trainings;
drop policy if exists trainings_modify on trainings;
drop policy if exists activity_select on activity_log;
drop policy if exists activity_insert on activity_log;

-- TENANTS
create policy tenants_select on tenants for select using (
  public.user_role_claim() = 'platform_owner' or id = public.user_tenant_id()
);
create policy tenants_modify on tenants for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and id = public.user_tenant_id())
);

-- USERS
create policy users_select on users for select using (
  public.user_role_claim() = 'platform_owner' or tenant_id = public.user_tenant_id()
);
create policy users_modify on users for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id())
);

-- CARRIERS — visible to all in tenant; modifiable by agency_owner+
create policy carriers_select on carriers for select using (
  public.user_role_claim() = 'platform_owner' or tenant_id = public.user_tenant_id()
);
create policy carriers_modify on carriers for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id())
);

-- LEADS — agents see only own; agency_owner sees all in tenant
create policy leads_select on leads for select using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);
create policy leads_modify on leads for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);

-- APPLICATIONS
create policy apps_select on applications for select using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);
create policy apps_modify on applications for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);

-- POLICIES (insurance)
create policy policies_select on policies for select using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);
create policy policies_modify on policies for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);

-- TRAININGS
create policy trainings_select on trainings for select using (
  public.user_role_claim() = 'platform_owner' or tenant_id = public.user_tenant_id()
);
create policy trainings_modify on trainings for all using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id())
);

-- ACTIVITY LOG
create policy activity_select on activity_log for select using (
  public.user_role_claim() = 'platform_owner' or
  (public.user_role_claim() = 'agency_owner' and tenant_id = public.user_tenant_id()) or
  (public.user_role_claim() = 'agent' and agent_id = public.user_db_id())
);
create policy activity_insert on activity_log for insert with check (true);

-- ---------------------------------------------------------------------
-- SEED — Momentum tenant (first agency on the platform)
-- Idempotent: only inserts if not present
-- ---------------------------------------------------------------------
insert into tenants (slug, name, brand_name, custom_domain, primary_color, secondary_color)
values (
  'momentum',
  'Momentum Marketing',
  'Momentum',
  'momentummarketing.io',
  '#7C3AED',
  '#2563EB'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- DONE
-- ---------------------------------------------------------------------
