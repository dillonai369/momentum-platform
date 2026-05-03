// Shared types — mirrors db/schema.sql
// When we generate types from Supabase later, this file becomes the source of truth.

export type UserRole = "platform_owner" | "agency_owner" | "agent";

export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "qualified"
  | "application_started"
  | "lost"
  | "duplicate";

export type ApplicationStatus =
  | "started"
  | "submitted"
  | "underwriting"
  | "approved"
  | "issued"
  | "declined"
  | "withdrawn";

export type PolicyStatus = "active" | "lapsed" | "surrendered" | "matured" | "cancelled";

export type PolicyType =
  | "term_life"
  | "whole_life"
  | "iul"
  | "annuity"
  | "final_expense"
  | "mortgage_protection"
  | "other";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  brand_primary: string;
  brand_accent: string;
  ghl_location_id: string | null;
  ghl_api_key_encrypted: string | null;
  status: "active" | "suspended" | "archived";
  created_at: string;
};

export type User = {
  id: string;
  clerk_user_id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  states_licensed: string[];
  carriers: string[];
  ghl_user_id: string | null;
  active: boolean;
  created_at: string;
};

export type Lead = {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  ghl_contact_id: string | null;
  meta_lead_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Carrier = {
  id: string;
  tenant_id: string;
  name: string;
  logo_url: string | null;
  products: PolicyType[];
  commission_pct: number | null;
  contracting_url: string | null;
  agent_portal_url: string | null;
  notes: string | null;
  active: boolean;
};

export type Application = {
  id: string;
  tenant_id: string;
  agent_id: string;
  lead_id: string | null;
  carrier_id: string;
  client_first_name: string;
  client_last_name: string;
  policy_type: PolicyType;
  face_amount: number | null;
  annual_premium: number;
  status: ApplicationStatus;
  submitted_at: string | null;
  approved_at: string | null;
  issued_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Policy = {
  id: string;
  tenant_id: string;
  agent_id: string;
  application_id: string | null;
  carrier_id: string;
  policy_number: string;
  client_first_name: string;
  client_last_name: string;
  policy_type: PolicyType;
  face_amount: number | null;
  annual_premium: number;
  issue_date: string;
  status: PolicyStatus;
  created_at: string;
};

export type Training = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_minutes: number | null;
  thumbnail_url: string | null;
  resource_url: string | null;
  required: boolean;
  display_order: number;
  active: boolean;
};

/**
 * Authenticated request context — built by `getAuthContext()` in lib/auth.ts.
 * Every server component / route handler that touches data should call it.
 */
export type AuthContext = {
  clerkUserId: string;
  user: User;
  tenant: Tenant;
};
