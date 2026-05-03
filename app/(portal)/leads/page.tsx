import { Header } from "@/components/portal/header";
import { formatDate } from "@/lib/utils";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { statusBadgeClass, statusLabel } from "@/lib/mock-data";
import { Filter, Phone, Mail } from "lucide-react";
import { AddLeadButton } from "./add-lead-button";
import type { Lead } from "@/lib/types";

export default async function LeadsPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();

  // Agents see only their own leads. agency_owner+ see all leads in tenant.
  let query = sb
    .from("leads")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false });

  if (ctx.user.role === "agent") {
    query = query.eq("agent_id", ctx.user.id);
  }

  const { data: leadsData } = await query;
  const leads = (leadsData ?? []) as Lead[];

  const newCount = leads.filter((l) => l.status === "new").length;
  const contactedCount = leads.filter((l) => l.status === "contacted").length;
  const bookedCount = leads.filter((l) =>
    ["booked", "qualified"].includes(l.status)
  ).length;

  const stats = [
    { label: "New Leads", value: newCount, hint: "awaiting first contact" },
    { label: "Contacted", value: contactedCount, hint: "in active conversation" },
    { label: "Booked / Qualified", value: bookedCount, hint: "moving toward app" },
    {
      label: "Conversion Rate",
      value:
        leads.length > 0
          ? `${Math.round((bookedCount / leads.length) * 100)}%`
          : "—",
      hint: "lead → qualified",
    },
  ];

  return (
    <>
      <Header title="Leads" />
      <div className="px-8 py-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Leads</h2>
            <p className="mt-1 text-sm text-ink-subtle">
              Inbound leads from Meta ads and direct sources, assigned to you.
            </p>
          </div>
          <AddLeadButton />
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="label">{s.label}</div>
              <div className="mt-2 text-2xl font-bold text-ink">{s.value}</div>
              <div className="mt-1 text-[11px] text-ink-subtle">{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h3 className="text-base font-semibold text-ink">All Leads</h3>
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-subtle hover:text-ink">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-subtle bg-surface">
                <th className="px-6 py-3 font-semibold">Lead</th>
                <th className="px-6 py-3 font-semibold">Contact</th>
                <th className="px-6 py-3 font-semibold">Source</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Received</th>
                <th className="px-6 py-3 font-semibold w-10" />
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-ink-faint">
                    <div className="text-sm">No leads yet.</div>
                    <div className="mt-1 text-xs">
                      Click <span className="font-semibold text-ink-subtle">Add Lead</span> to add one manually,
                      or wire up Meta Lead Ads to start receiving them automatically.
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const initials = (
                    (lead.first_name?.[0] || "?") + (lead.last_name?.[0] || "")
                  ).toUpperCase();
                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-line hover:bg-surface transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-soft text-purple text-xs font-semibold">
                            {initials}
                          </div>
                          <span className="font-medium text-ink">
                            {lead.first_name} {lead.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="h-3 w-3 text-ink-faint" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-xs mt-0.5">
                            <Phone className="h-3 w-3 text-ink-faint" />
                            {lead.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-ink-soft text-xs">
                        {lead.source}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusBadgeClass(
                            lead.status
                          )}`}
                        >
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-subtle text-xs">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-xs font-medium text-purple hover:text-purple-deep">
                          Open
                        </button>
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
