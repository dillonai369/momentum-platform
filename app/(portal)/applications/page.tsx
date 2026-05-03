import { Header } from "@/components/portal/header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { policyTypeLabel, statusBadgeClass, statusLabel } from "@/lib/mock-data";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NewApplicationButton } from "./new-application-button";

const PIPELINE_STAGES = [
  "started",
  "submitted",
  "underwriting",
  "approved",
  "issued",
] as const;

type AppRow = {
  id: string;
  app_id: string;
  client_first_name: string;
  client_last_name: string;
  carrier_id: string;
  policy_type: string;
  coverage_amount: number | null;
  annual_premium: number | null;
  status: typeof PIPELINE_STAGES[number] | "declined" | "withdrawn";
  created_at: string;
  carriers: { name: string } | null;
};

export default async function ApplicationsPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();

  // Apps — agent sees own, agency_owner+ sees all in tenant
  let appQuery = sb
    .from("applications")
    .select("*, carriers(name)")
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false });
  if (ctx.user.role === "agent") {
    appQuery = appQuery.eq("agent_id", ctx.user.id);
  }
  const { data: appsData } = await appQuery;
  const apps = (appsData ?? []) as AppRow[];

  // Carrier dropdown options (active only)
  const { data: carriersData } = await sb
    .from("carriers")
    .select("id, name")
    .eq("tenant_id", ctx.tenant.id)
    .eq("active", true)
    .order("name");
  const carriers = carriersData ?? [];

  // Lead picker options (open leads not yet converted to apps)
  let leadQuery = sb
    .from("leads")
    .select("id, first_name, last_name")
    .eq("tenant_id", ctx.tenant.id)
    .in("status", ["new", "contacted", "booked", "qualified"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (ctx.user.role === "agent") {
    leadQuery = leadQuery.eq("agent_id", ctx.user.id);
  }
  const { data: leadsData } = await leadQuery;
  const leads = leadsData ?? [];

  const totalPremium = apps.reduce(
    (sum, a) => sum + (Number(a.annual_premium) || 0),
    0
  );

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: apps.filter((a) => a.status === stage).length,
    premium: apps
      .filter((a) => a.status === stage)
      .reduce((s, a) => s + (Number(a.annual_premium) || 0), 0),
  }));

  return (
    <>
      <Header title="Applications" />
      <div className="px-8 py-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Applications
            </h2>
            <p className="mt-1 text-sm text-ink-subtle">
              Pipeline of in-flight applications. Total annualized premium:{" "}
              <span className="font-semibold text-ink">
                {formatCurrency(totalPremium)}
              </span>
            </p>
          </div>
          <NewApplicationButton carriers={carriers} leads={leads} />
        </div>

        {/* Pipeline stages */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {byStage.map((s) => (
            <div key={s.stage} className="card p-5">
              <div className="label">{statusLabel(s.stage)}</div>
              <div className="mt-2 text-2xl font-bold text-ink">{s.count}</div>
              <div className="mt-1 text-[11px] text-ink-subtle">
                {formatCurrency(s.premium)} premium
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <h3 className="text-base font-semibold text-ink">All Applications</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-subtle bg-surface">
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">App ID</th>
                <th className="px-6 py-3 font-semibold">Carrier</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Coverage</th>
                <th className="px-6 py-3 font-semibold">Annual Premium</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody>
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-ink-faint">
                    <div className="text-sm">No applications yet.</div>
                    <div className="mt-1 text-xs">
                      Click <span className="font-semibold text-ink-subtle">New Application</span> to start one.
                    </div>
                  </td>
                </tr>
              ) : (
                apps.map((app) => {
                  const initials = (
                    (app.client_first_name?.[0] || "?") +
                    (app.client_last_name?.[0] || "")
                  ).toUpperCase();
                  return (
                    <tr
                      key={app.id}
                      className="border-t border-line hover:bg-surface transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-soft text-purple text-xs font-semibold">
                            {initials}
                          </div>
                          <span className="font-medium text-ink">
                            {app.client_first_name} {app.client_last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-ink-subtle text-xs font-mono">
                        {app.app_id}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {app.carriers?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {policyTypeLabel(app.policy_type as never)}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {app.coverage_amount ? formatCurrency(Number(app.coverage_amount)) : "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">
                        {app.annual_premium ? formatCurrency(Number(app.annual_premium)) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusBadgeClass(
                            app.status
                          )}`}
                        >
                          {statusLabel(app.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-subtle text-xs">
                        {formatDate(app.created_at)}
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
