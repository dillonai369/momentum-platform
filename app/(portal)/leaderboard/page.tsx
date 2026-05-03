import { Header } from "@/components/portal/header";
import { formatCurrency } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Producer = {
  agent_id: string;
  name: string;
  initials: string;
  premium_ytd: number;
  apps_ytd: number;
  policies_ytd: number;
  rank: number;
};

export default async function LeaderboardPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();
  const yearStart = `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`;

  // Pull all users in tenant
  const { data: usersData } = await sb
    .from("users")
    .select("id, first_name, last_name, active")
    .eq("tenant_id", ctx.tenant.id)
    .eq("active", true);
  const users = usersData ?? [];

  // Apps YTD per agent
  const { data: appsData } = await sb
    .from("applications")
    .select("agent_id, annual_premium, status, created_at")
    .eq("tenant_id", ctx.tenant.id)
    .gte("created_at", yearStart);

  // Policies YTD per agent
  const { data: policiesData } = await sb
    .from("policies")
    .select("agent_id, created_at, status")
    .eq("tenant_id", ctx.tenant.id)
    .gte("created_at", yearStart);

  const byAgent = new Map<string, { apps: number; policies: number; premium: number }>();
  for (const u of users) {
    byAgent.set(u.id, { apps: 0, policies: 0, premium: 0 });
  }
  for (const a of (appsData ?? []) as { agent_id: string; annual_premium: number | null; status: string }[]) {
    const row = byAgent.get(a.agent_id);
    if (!row) continue;
    row.apps += 1;
    // Count premium toward leaderboard once an app is at least submitted
    if (["submitted", "underwriting", "approved", "issued"].includes(a.status)) {
      row.premium += Number(a.annual_premium) || 0;
    }
  }
  for (const p of (policiesData ?? []) as { agent_id: string; status: string }[]) {
    const row = byAgent.get(p.agent_id);
    if (!row) continue;
    if (p.status === "active") row.policies += 1;
  }

  const producers: Producer[] = users
    .map((u) => {
      const stats = byAgent.get(u.id) || { apps: 0, policies: 0, premium: 0 };
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown";
      const initials = ((u.first_name?.[0] || "?") + (u.last_name?.[0] || "")).toUpperCase();
      return {
        agent_id: u.id,
        name,
        initials,
        premium_ytd: stats.premium,
        apps_ytd: stats.apps,
        policies_ytd: stats.policies,
        rank: 0,
      };
    })
    .sort((a, b) => b.premium_ytd - a.premium_ytd)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const top3 = producers.slice(0, 3);

  return (
    <>
      <Header title="Leaderboard" />
      <div className="px-8 py-8 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Leaderboard
            </h2>
            <p className="mt-1 text-sm text-ink-subtle">
              Producer rankings — year-to-date.
            </p>
          </div>
          <div className="flex rounded-lg border border-line bg-canvas p-1 text-sm">
            <button className="rounded-md px-4 py-1.5 font-medium text-ink-subtle hover:text-ink">
              Monthly
            </button>
            <button className="rounded-md px-4 py-1.5 font-medium text-ink-subtle hover:text-ink">
              Quarterly
            </button>
            <button className="rounded-md bg-purple px-4 py-1.5 font-medium text-white">
              YTD
            </button>
          </div>
        </div>

        {producers.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink">No active producers yet</p>
            <p className="mt-1 text-xs text-ink-subtle">
              Once you have agents in this tenant with submitted apps, they&rsquo;ll appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {top3.map((p, idx) => {
                  const accents = [
                    "from-yellow-400 to-amber-500",
                    "from-gray-300 to-gray-400",
                    "from-amber-700 to-amber-800",
                  ];
                  return (
                    <div
                      key={p.agent_id}
                      className="card relative overflow-hidden p-6"
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[idx]}`}
                      />
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-white text-lg font-bold">
                            {p.initials}
                          </div>
                          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-canvas bg-ink text-[11px] font-bold text-white">
                            {p.rank}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-base font-bold text-ink">
                            {p.name}
                          </div>
                          <div className="mt-0.5 text-xs text-ink-subtle">
                            {formatCurrency(p.premium_ytd)} YTD premium
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
                            Premium
                          </div>
                          <div className="text-sm font-bold text-ink mt-0.5">
                            {formatCurrency(p.premium_ytd)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
                            Apps
                          </div>
                          <div className="text-sm font-bold text-ink mt-0.5">
                            {p.apps_ytd}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
                            Issued
                          </div>
                          <div className="text-sm font-bold text-ink mt-0.5">
                            {p.policies_ytd}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="card overflow-hidden">
              <div className="border-b border-line px-6 py-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple" />
                <h3 className="text-base font-semibold text-ink">Full Rankings</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink-subtle bg-surface">
                    <th className="px-6 py-3 font-semibold w-12">Rank</th>
                    <th className="px-6 py-3 font-semibold">Producer</th>
                    <th className="px-6 py-3 font-semibold">Premium (YTD)</th>
                    <th className="px-6 py-3 font-semibold">Apps</th>
                    <th className="px-6 py-3 font-semibold">Policies Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {producers.map((p) => (
                    <tr
                      key={p.agent_id}
                      className="border-t border-line hover:bg-surface transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-ink">{p.rank}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-xs font-semibold text-white">
                            {p.initials}
                          </div>
                          <span className="font-medium text-ink">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">
                        {formatCurrency(p.premium_ytd)}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">{p.apps_ytd}</td>
                      <td className="px-6 py-4 text-ink-soft">{p.policies_ytd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
