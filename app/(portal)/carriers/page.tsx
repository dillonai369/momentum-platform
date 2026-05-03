import { Header } from "@/components/portal/header";
import { policyTypeLabel } from "@/lib/mock-data";
import { ExternalLink, Phone, Mail } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CarrierRow = {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  product_lines: string[] | null;
  agent_phone: string | null;
  agent_email: string | null;
  agent_portal_url: string | null;
};

export default async function CarriersPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();

  const { data: carriersData } = await sb
    .from("carriers")
    .select("id, name, logo_url, description, product_lines, agent_phone, agent_email, agent_portal_url")
    .eq("tenant_id", ctx.tenant.id)
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  const carriers = (carriersData ?? []) as CarrierRow[];

  return (
    <>
      <Header title="Carriers" />
      <div className="px-8 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Carriers
          </h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Appointed carriers. Click &ldquo;Agent Portal&rdquo; to access e-app and underwriting.
          </p>
        </div>

        {carriers.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink">No carriers added yet</p>
            <p className="mt-1 text-xs text-ink-subtle">
              Carriers are managed at the tenant level — add them via the database or an admin page (coming soon).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {carriers.map((c) => (
              <div key={c.id} className="card card-hover p-6 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-soft to-blue-soft text-purple text-base font-bold overflow-hidden">
                    {c.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo_url} alt={c.name} className="h-full w-full object-contain" />
                    ) : (
                      c.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-base font-semibold text-ink">{c.name}</h3>

                {c.product_lines && c.product_lines.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.product_lines.map((p) => (
                      <span
                        key={p}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft"
                      >
                        {policyTypeLabel(p as never)}
                      </span>
                    ))}
                  </div>
                )}

                {c.description && (
                  <p className="mt-3 text-xs text-ink-subtle leading-relaxed flex-1">
                    {c.description}
                  </p>
                )}

                {(c.agent_phone || c.agent_email) && (
                  <div className="mt-3 space-y-1 text-xs text-ink-soft">
                    {c.agent_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-ink-faint" /> {c.agent_phone}
                      </div>
                    )}
                    {c.agent_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-ink-faint" /> {c.agent_email}
                      </div>
                    )}
                  </div>
                )}

                {c.agent_portal_url && (
                  <div className="mt-5 flex gap-2 border-t border-line pt-4">
                    <a
                      href={c.agent_portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-purple px-3 py-2 text-xs font-medium text-white hover:bg-purple-deep transition-colors"
                    >
                      Agent Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
