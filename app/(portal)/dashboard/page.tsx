import { Header } from "@/components/portal/header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowUpRight,
  TrendingUp,
  FileText,
  Users2,
} from "lucide-react";
import { policyTypeLabel, statusBadgeClass, statusLabel } from "@/lib/mock-data";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RecentApp = {
  id: string;
  client_first_name: string;
  client_last_name: string;
  carrier_id: string | null;
  policy_type: string;
  annual_premium: number | null;
  status: string;
  created_at: string;
  carriers: { name: string } | null;
};

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();
  const isAgent = ctx.user.role === "agent";

  // ----- KPIs -----
  // Total premium = sum(annual_premium) of issued policies
  let policiesQuery = sb
    .from("policies")
    .select("annual_premium", { count: "exact" })
    .eq("tenant_id", ctx.tenant.id)
    .eq("status", "active");
  if (isAgent) policiesQuery = policiesQuery.eq("agent_id", ctx.user.id);
  const { data: policiesData, count: policiesCount } = await policiesQuery;
  const totalPremium = (policiesData ?? []).reduce(
    (s, p: { annual_premium: number | null }) => s + (Number(p.annual_premium) || 0),
    0
  );

  // Apps in pipeline
  let appsCountQuery = sb
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenant.id)
    .in("status", ["started", "submitted", "underwriting", "approved"]);
  if (isAgent) appsCountQuery = appsCountQuery.eq("agent_id", ctx.user.id);
  const { count: appsCount } = await appsCountQuery;

  // Leads (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let leadsCountQuery = sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenant.id)
    .gte("created_at", thirtyDaysAgo);
  if (isAgent) leadsCountQuery = leadsCountQuery.eq("agent_id", ctx.user.id);
  const { count: leadsCount } = await leadsCountQuery;

  // ----- Recent applications (activity feed) -----
  let recentQuery = sb
    .from("applications")
    .select("id, client_first_name, client_last_name, carrier_id, policy_type, annual_premium, status, created_at, carriers(name)")
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false })
    .limit(6);
  if (isAgent) recentQuery = recentQuery.eq("agent_id", ctx.user.id);
  const { data: recentData } = await recentQuery;
  const recent = (recentData ?? []) as unknown as RecentApp[];

  // ----- Top producers (this tenant, by issued-policy premium) -----
  // Pull recent policies and aggregate by agent in JS (simpler than a Postgres GROUP BY here).
  const { data: allPolicies } = await sb
    .from("policies")
    .select("agent_id, annual_premium")
    .eq("tenant_id", ctx.tenant.id)
    .eq("status", "active");

  const premByAgent = new Map<string, number>();
  for (const p of (allPolicies ?? []) as { agent_id: string; annual_premium: number | null }[]) {
    if (!p.agent_id) continue;
    premByAgent.set(p.agent_id, (premByAgent.get(p.agent_id) || 0) + (Number(p.annual_premium) || 0));
  }
  const topAgentIds = [...premByAgent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topAgents: { id: string; first_name: string | null; last_name: string | null }[] = [];
  if (topAgentIds.length) {
    const { data: agentRows } = await sb
      .from("users")
      .select("id, first_name, last_name")
      .in("id", topAgentIds);
    topAgents = agentRows ?? [];
  }
  const leaderboard = topAgents
    .map((a) => ({
      agent_id: a.id,
      name: [a.first_name, a.last_name].filter(Boolean).join(" ") || "Unknown",
      initials: ((a.first_name?.[0] || "?") + (a.last_name?.[0] || "")).toUpperCase(),
      premium_ytd: premByAgent.get(a.id) || 0,
    }))
    .sort((x, y) => y.premium_ytd - x.premium_ytd)
    .map((x, i) => ({ ...x, rank: i + 1 }));

  const KPIS = [
    {
      label: "Total Premium (Active)",
      value: formatCurrency(totalPremium),
      sublabel: `${policiesCount ?? 0} active policies`,
      accent: "from-purple to-blue",
      icon: TrendingUp,
    },
    {
      label: "Pipeline Applications",
      value: String(appsCount ?? 0),
      sublabel: "started → approved",
      accent: "from-blue to-blue-light",
      icon: FileText,
    },
    {
      label: "New Leads (30d)",
      value: String(leadsCount ?? 0),
      sublabel: "Across all sources",
      accent: "from-purple to-purple-deep",
      icon: Users2,
    },
  ];

  const firstName = ctx.user.first_name || ctx.user.email.split("@")[0];

  return (
    <>
      <Header title="Dashboard" />
      <div className="px-8 py-8 space-y-8">
        {/* Welcome */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Welcome back, {firstName} <span className="inline-block">👋</span>
            </h2>
            <p className="mt-1 text-sm text-ink-subtle">
              Here&apos;s your performance overview for today.
            </p>
          </div>
          <div className="flex rounded-lg border border-line bg-canvas p-1 text-sm">
            <button className="rounded-md bg-purple px-4 py-1.5 font-medium text-white">
              Monthly
            </button>
            <button className="rounded-md px-4 py-1.5 font-medium text-ink-subtle hover:text-ink">
              Quarterly
            </button>
            <button className="rounded-md px-4 py-1.5 font-medium text-ink-subtle hover:text-ink">
              YTD
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {KPIS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="card card-hover p-6 relative overflow-hidden"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${kpi.accent}`}
                />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label">{kpi.label}</div>
                    <div className="mt-3 text-3xl font-bold text-ink">
                      {kpi.value}
                    </div>
                    <div className="mt-1 text-xs text-ink-subtle">
                      {kpi.sublabel}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-ink-soft" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trends + Top Producers */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  Premium Trends
                </h3>
                <p className="text-xs text-ink-subtle">
                  Monthly comparison — This Year vs Last Year
                </p>
              </div>
              <button className="text-xs font-medium text-ink-subtle hover:text-ink">
                Monthly ▾
              </button>
            </div>
            <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed border-line bg-surface text-sm text-ink-faint">
              Chart wired in once we have ≥30 days of issued-policy history
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                Top Producers
              </h3>
              <button className="text-xs font-medium text-purple hover:text-purple-deep inline-flex items-center gap-0.5">
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            {leaderboard.length === 0 ? (
              <div className="mt-6 text-xs text-ink-faint">
                No issued policies yet — once you mark an application as
                &ldquo;issued&rdquo; the producer board fills in here.
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {leaderboard.map((p) => (
                  <li
                    key={p.agent_id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-ink-faint w-3">
                        {p.rank}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-xs font-semibold text-white">
                        {p.initials}
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-ink">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-ink-subtle">
                          {formatCurrency(p.premium_ytd)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-[11px] text-ink-faint">
              Rankings update on policy issue
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h3 className="text-base font-semibold text-ink">Recent Applications</h3>
            <a
              href="/applications"
              className="text-xs font-medium text-purple hover:text-purple-deep inline-flex items-center gap-0.5"
            >
              View All <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-subtle bg-surface">
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">Carrier</th>
                <th className="px-6 py-3 font-semibold">Policy Type</th>
                <th className="px-6 py-3 font-semibold">Premium</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-ink-faint text-sm">
                    No applications yet — head to{" "}
                    <a href="/applications" className="text-purple font-medium">
                      Applications
                    </a>{" "}
                    to start one.
                  </td>
                </tr>
              ) : (
                recent.map((row) => {
                  const initials = (
                    (row.client_first_name?.[0] || "?") +
                    (row.client_last_name?.[0] || "")
                  ).toUpperCase();
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-line hover:bg-surface transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-soft text-purple text-xs font-semibold">
                            {initials}
                          </div>
                          <span className="font-medium text-ink">
                            {row.client_first_name} {row.client_last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {row.carriers?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {policyTypeLabel(row.policy_type as never)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">
                        {row.annual_premium ? formatCurrency(Number(row.annual_premium)) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusBadgeClass(
                            row.status
                          )}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-subtle text-xs">
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
