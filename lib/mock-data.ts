/**
 * Mock data for the portal — used until task #11 wires up real Supabase queries.
 * Shape mirrors the actual DB types so the swap is mechanical.
 */
import type {
  Application,
  ApplicationStatus,
  Carrier,
  Lead,
  LeadStatus,
  Policy,
  PolicyType,
  Training,
} from "@/lib/types";

const TENANT_ID = "momentum-tenant-mock";
const RYAN_ID = "ryan-mock-agent-id";

// ---------- Carriers ----------

export const MOCK_CARRIERS: Carrier[] = [
  {
    id: "c-mutual",
    tenant_id: TENANT_ID,
    name: "Mutual of Omaha",
    logo_url: null,
    products: ["term_life", "whole_life", "final_expense"],
    commission_pct: 105,
    contracting_url: "https://mutualofomaha.com/contracting",
    agent_portal_url: "https://producer.mutualofomaha.com",
    notes: "Top tier underwriting, 24-48hr decisions on Term Life Express",
    active: true,
  },
  {
    id: "c-foresters",
    tenant_id: TENANT_ID,
    name: "Foresters Financial",
    logo_url: null,
    products: ["term_life", "whole_life"],
    commission_pct: 110,
    contracting_url: "https://foresters.com/agents",
    agent_portal_url: "https://my.foresters.com",
    notes: "PlanRight WL is competitive on small face amounts",
    active: true,
  },
  {
    id: "c-americo",
    tenant_id: TENANT_ID,
    name: "Americo",
    logo_url: null,
    products: ["whole_life", "final_expense", "mortgage_protection"],
    commission_pct: 115,
    contracting_url: "https://americo.com/agents",
    agent_portal_url: "https://agent.americo.com",
    notes: "Eagle Premier is the go-to mortgage protection product",
    active: true,
  },
  {
    id: "c-fg",
    tenant_id: TENANT_ID,
    name: "F&G Life",
    logo_url: null,
    products: ["iul", "annuity"],
    commission_pct: 95,
    contracting_url: "https://fglife.com/contracting",
    agent_portal_url: "https://agent.fglife.com",
    notes: "Pathsetter IUL — strong illustrations for cash accumulation",
    active: true,
  },
  {
    id: "c-nlg",
    tenant_id: TENANT_ID,
    name: "National Life Group",
    logo_url: null,
    products: ["iul", "term_life", "whole_life"],
    commission_pct: 100,
    contracting_url: "https://nationallife.com/agents",
    agent_portal_url: "https://eapp.nationallife.com",
    notes: "FlexLife IUL for high-net-worth clients",
    active: true,
  },
  {
    id: "c-allianz",
    tenant_id: TENANT_ID,
    name: "Allianz Life",
    logo_url: null,
    products: ["iul", "annuity"],
    commission_pct: 90,
    contracting_url: "https://allianzlife.com/contracting",
    agent_portal_url: "https://agent.allianzlife.com",
    notes: "Allianz Life Pro+ Advantage IUL — premium product",
    active: true,
  },
];

// ---------- Leads ----------

const LEAD_NAMES = [
  ["Sarah", "Mitchell"],
  ["Marcus", "Johnson"],
  ["Emily", "Rodriguez"],
  ["David", "Chen"],
  ["Jessica", "Williams"],
  ["Michael", "Thompson"],
  ["Ashley", "Patel"],
  ["Christopher", "Brown"],
  ["Amanda", "Garcia"],
  ["Tyler", "Anderson"],
  ["Brittany", "Martinez"],
  ["Kevin", "Wilson"],
  ["Rachel", "Davis"],
  ["Brandon", "Lee"],
  ["Nicole", "Taylor"],
  ["Joshua", "Moore"],
  ["Stephanie", "Jackson"],
  ["Daniel", "Harris"],
];

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "new",
  "contacted",
  "contacted",
  "booked",
  "qualified",
  "application_started",
  "lost",
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_LEADS: Lead[] = LEAD_NAMES.map((name, i) => ({
  id: `lead-${i + 1}`,
  tenant_id: TENANT_ID,
  agent_id: RYAN_ID,
  first_name: name[0],
  last_name: name[1],
  email: `${name[0].toLowerCase()}.${name[1].toLowerCase()}@email.com`,
  phone: `+1555${String(1000000 + i * 7919).slice(0, 7)}`,
  source: i % 3 === 0 ? "Meta Lead Ad" : i % 3 === 1 ? "Facebook Form" : "Website Form",
  status: LEAD_STATUSES[i % LEAD_STATUSES.length],
  notes: null,
  ghl_contact_id: null,
  meta_lead_id: null,
  metadata: {},
  created_at: daysAgo(i),
  updated_at: daysAgo(i),
}));

// ---------- Applications ----------

const APP_STATUSES: ApplicationStatus[] = [
  "started",
  "submitted",
  "underwriting",
  "underwriting",
  "approved",
  "issued",
  "issued",
];

const APP_TYPES: PolicyType[] = ["term_life", "iul", "whole_life", "term_life", "iul"];

export const MOCK_APPLICATIONS: Application[] = LEAD_NAMES.slice(0, 12).map((name, i) => {
  const status = APP_STATUSES[i % APP_STATUSES.length];
  const submitted = status !== "started" ? daysAgo(i + 1) : null;
  const approved = ["approved", "issued"].includes(status) ? daysAgo(Math.max(0, i - 2)) : null;
  const issued = status === "issued" ? daysAgo(Math.max(0, i - 4)) : null;

  return {
    id: `app-${i + 1}`,
    tenant_id: TENANT_ID,
    agent_id: RYAN_ID,
    lead_id: `lead-${i + 1}`,
    carrier_id: MOCK_CARRIERS[i % MOCK_CARRIERS.length].id,
    client_first_name: name[0],
    client_last_name: name[1],
    policy_type: APP_TYPES[i % APP_TYPES.length],
    face_amount: [250000, 500000, 1000000, 750000][i % 4],
    annual_premium: [840, 1620, 2400, 3600, 4200, 5800][i % 6],
    status,
    submitted_at: submitted,
    approved_at: approved,
    issued_at: issued,
    notes: null,
    created_at: daysAgo(i + 2),
  };
});

// ---------- Policies (issued) ----------

export const MOCK_POLICIES: Policy[] = MOCK_APPLICATIONS.filter(
  (a) => a.status === "issued"
).map((a, i) => ({
  id: `pol-${i + 1}`,
  tenant_id: TENANT_ID,
  agent_id: RYAN_ID,
  application_id: a.id,
  carrier_id: a.carrier_id,
  policy_number: `MOM-${String(100000 + i * 137).padStart(6, "0")}`,
  client_first_name: a.client_first_name,
  client_last_name: a.client_last_name,
  policy_type: a.policy_type,
  face_amount: a.face_amount,
  annual_premium: a.annual_premium,
  issue_date: a.issued_at!,
  status: "active" as const,
  created_at: a.issued_at!,
}));

// ---------- Trainings ----------

export const MOCK_TRAININGS: Training[] = [
  {
    id: "t-1",
    tenant_id: TENANT_ID,
    title: "New Agent Bootcamp",
    description:
      "5-day onboarding covering Momentum's playbook, GHL workflow, scripting, and your first lead-to-app conversion.",
    category: "Onboarding",
    duration_minutes: 240,
    thumbnail_url: null,
    resource_url: "#",
    required: true,
    display_order: 1,
    active: true,
  },
  {
    id: "t-2",
    tenant_id: TENANT_ID,
    title: "IUL Mastery",
    description:
      "Deep dive on indexed universal life: illustration walkthroughs, accumulation vs. protection, objection handling.",
    category: "Product",
    duration_minutes: 90,
    thumbnail_url: null,
    resource_url: "#",
    required: false,
    display_order: 2,
    active: true,
  },
  {
    id: "t-3",
    tenant_id: TENANT_ID,
    title: "Cold Call Scripts (Meta Leads)",
    description:
      "Word-for-word scripts proven on Momentum's Meta lead funnel. Voicemail drops, callback cadence, soft-close.",
    category: "Sales",
    duration_minutes: 60,
    thumbnail_url: null,
    resource_url: "#",
    required: true,
    display_order: 3,
    active: true,
  },
  {
    id: "t-4",
    tenant_id: TENANT_ID,
    title: "Final Expense Playbook",
    description:
      "How to position FE products, qualify quickly, and write the policy in one call.",
    category: "Product",
    duration_minutes: 75,
    thumbnail_url: null,
    resource_url: "#",
    required: false,
    display_order: 4,
    active: true,
  },
  {
    id: "t-5",
    tenant_id: TENANT_ID,
    title: "Underwriting 101",
    description:
      "Build, BMI, prescriptions, MVR, MIB — what underwriters actually look at and how to set realistic expectations with clients.",
    category: "Operations",
    duration_minutes: 45,
    thumbnail_url: null,
    resource_url: "#",
    required: true,
    display_order: 5,
    active: true,
  },
  {
    id: "t-6",
    tenant_id: TENANT_ID,
    title: "Compliance: A2P 10DLC + State Regs",
    description:
      "How to stay compliant on SMS, what you can/can't say in a sales conversation, state-specific replacement rules.",
    category: "Compliance",
    duration_minutes: 30,
    thumbnail_url: null,
    resource_url: "#",
    required: true,
    display_order: 6,
    active: true,
  },
];

// ---------- Leaderboard helpers ----------

export type LeaderRow = {
  rank: number;
  agent_id: string;
  name: string;
  initials: string;
  premium_ytd: number;
  apps_ytd: number;
  policies_ytd: number;
  growth_pct: number;
};

export const MOCK_LEADERBOARD: LeaderRow[] = [
  {
    rank: 1,
    agent_id: RYAN_ID,
    name: "Ryan Heagney",
    initials: "RH",
    premium_ytd: 47800,
    apps_ytd: 12,
    policies_ytd: 3,
    growth_pct: 0,
  },
];

// ---------- Aggregate helpers ----------

export function dashboardKpis() {
  const issued = MOCK_POLICIES;
  const totalPremium = issued.reduce((sum, p) => sum + p.annual_premium, 0);
  return {
    totalPremium,
    policiesSold: issued.length,
    newClients: new Set(issued.map((p) => `${p.client_first_name} ${p.client_last_name}`)).size,
    apps: MOCK_APPLICATIONS.length,
    leads: MOCK_LEADS.length,
  };
}

export function carrierName(id: string): string {
  return MOCK_CARRIERS.find((c) => c.id === id)?.name ?? "—";
}

export function policyTypeLabel(t: PolicyType): string {
  const map: Record<PolicyType, string> = {
    term_life: "Term Life",
    whole_life: "Whole Life",
    iul: "IUL",
    annuity: "Annuity",
    final_expense: "Final Expense",
    mortgage_protection: "Mortgage Protection",
    other: "Other",
  };
  return map[t];
}

export function statusBadgeClass(status: LeadStatus | ApplicationStatus | string): string {
  const map: Record<string, string> = {
    new: "bg-blue-soft text-blue",
    contacted: "bg-purple-soft text-purple",
    booked: "bg-success-soft text-success",
    qualified: "bg-success-soft text-success",
    application_started: "bg-warning-soft text-warning",
    lost: "bg-muted text-ink-subtle",
    duplicate: "bg-muted text-ink-subtle",
    started: "bg-blue-soft text-blue",
    submitted: "bg-purple-soft text-purple",
    underwriting: "bg-warning-soft text-warning",
    approved: "bg-success-soft text-success",
    issued: "bg-success-soft text-success",
    declined: "bg-danger-soft text-danger",
    withdrawn: "bg-muted text-ink-subtle",
    active: "bg-success-soft text-success",
  };
  return map[status] ?? "bg-muted text-ink-subtle";
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
