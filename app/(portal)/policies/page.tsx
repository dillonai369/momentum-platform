import { Header } from "@/components/portal/header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { policyTypeLabel, statusBadgeClass, statusLabel } from "@/lib/mock-data";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PolicyRow = {
  id: string;
  policy_number: string | null;
  status: string;
  effective_date: string | null;
  premium_paid_to_date: number | null;
  created_at: string;
  applications: {
    client_first_name: string;
    client_last_name: string;
    policy_type: string;
    coverage_amount: number | null;
    annual_premium: number | null;
    carriers: { name: string } | null;
  } | null;
};

export default async function PoliciesPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();

  let q = sb
    .from("policies")
    .select(`
      id, policy_number, status, effective_date, premium_paid_to_date, created_at,
      applications(client_first_name, client_last_name, policy_type, coverage_amount, annual_premium, carriers(name))
    `)
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false });
  if (ctx.user.role === "agent") q = q.eq("agent_id", ctx.user.id);

  const { data: policiesData } = await q;
  const policies = (policiesData ?? []) as unknown as PolicyRow[];

  const totalFace = policies.reduce(
    (s, p) => s + (Number(p.applications?.coverage_amount) || 0),
    0
  );
  const totalPremium = policies.reduce(
    (s, p) => s + (Number(p.applications?.annual_premium) || 0),
    0
  );

  const stats = [
    { label: "Active Policies", value: String(policies.length) },
    { label: "Total Face Amount", value: formatCurrency(totalFace) },
    { label: "Annualized Premium", value: formatCurrency(totalPremium) },
    {
      label: "Avg Premium / Policy",
      value:
        policies.length > 0
          ? formatCurrency(Math.round(totalPremium / policies.length))
          : "—",
    },
  ];

  return (
    <>
      <Header title="Policies" />
      <div className="px-8 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Policies</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Issued policies. Renewal commission events appear in Activity.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="label">{s.label}</div>
              <div className="mt-2 text-2xl font-bold text-ink">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <h3 className="text-base font-semibold text-ink">All Policies</h3>
          </div>
          {policies.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-ink">No policies issued yet</p>
              <p className="mt-1 text-xs text-ink-subtle">
                When you mark an application as &ldquo;issued&rdquo;, it&rsquo;ll appear here automatically.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-subtle bg-surface">
                  <th className="px-6 py-3 font-semibold">Policy #</th>
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Carrier</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Face</th>
                  <th className="px-6 py-3 font-semibold">Premium</th>
                  <th className="px-6 py-3 font-semibold">Effective</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => {
                  const app = p.applications;
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-line hover:bg-surface transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-ink-soft">
                        {p.policy_number || "—"}
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">
                        {app ? `${app.client_first_name} ${app.client_last_name}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {app?.carriers?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {app ? policyTypeLabel(app.policy_type as never) : "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {app?.coverage_amount ? formatCurrency(Number(app.coverage_amount)) : "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">
                        {app?.annual_premium ? formatCurrency(Number(app.annual_premium)) : "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-subtle text-xs">
                        {p.effective_date ? formatDate(p.effective_date) : formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusBadgeClass(
                            p.status
                          )}`}
                        >
                          {statusLabel(p.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
