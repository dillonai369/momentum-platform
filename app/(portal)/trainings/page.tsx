import { Header } from "@/components/portal/header";
import { PlayCircle, ExternalLink, FileText, Link2 } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CATEGORY_ACCENT: Record<string, string> = {
  onboarding: "from-purple to-blue",
  e_app_tutorials: "from-blue to-blue-light",
  scripts: "from-purple to-purple-deep",
  product: "from-blue-light to-purple",
  compliance: "from-amber-500 to-orange-500",
};

const CATEGORY_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  e_app_tutorials: "E-App Tutorials",
  scripts: "Sales Scripts",
  product: "Product",
  compliance: "Compliance",
};

const RESOURCE_ICON: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  link: Link2,
  document: FileText,
};

type TrainingRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  carrier_id: string | null;
};

export default async function TrainingsPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("trainings")
    .select("id, category, title, description, resource_type, resource_url, carrier_id")
    .eq("tenant_id", ctx.tenant.id)
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  const trainings = (data ?? []) as TrainingRow[];

  return (
    <>
      <Header title="Trainings" />
      <div className="px-8 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Trainings
          </h2>
          <p className="mt-1 text-sm text-ink-subtle">
            {ctx.tenant.name}&rsquo;s playbook — onboarding, product knowledge, scripts, compliance.
          </p>
        </div>

        {trainings.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink">No trainings yet</p>
            <p className="mt-1 text-xs text-ink-subtle">
              Add training modules to your tenant to populate this library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {trainings.map((t) => {
              const accent = CATEGORY_ACCENT[t.category] || "from-purple to-blue";
              const Icon = RESOURCE_ICON[t.resource_type] || PlayCircle;
              return (
                <a
                  key={t.id}
                  href={t.resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-hover overflow-hidden flex flex-col group"
                >
                  <div
                    className={`relative h-32 bg-gradient-to-br ${accent} flex items-center justify-center`}
                  >
                    <Icon className="h-12 w-12 text-white/80" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="text-[10px] uppercase tracking-wider text-purple font-semibold">
                      {CATEGORY_LABEL[t.category] || t.category}
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-ink">
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="mt-2 text-xs text-ink-subtle leading-relaxed flex-1">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <span className="text-[11px] text-ink-subtle uppercase tracking-wider">
                        {t.resource_type}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-purple group-hover:text-purple-deep">
                        Open <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
