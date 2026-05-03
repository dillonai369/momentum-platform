import Link from "next/link";
import { Header } from "@/components/portal/header";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ProfileForm } from "./profile-form";
import {
  User as UserIcon,
  Shield,
  Bell,
  Plug,
  Check,
  X,
  Users as UsersIcon,
  ChevronRight,
} from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  platform_owner: "Platform Owner",
  agency_owner: "Agency Owner",
  agent: "Agent",
};

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  const sb = supabaseAdmin();

  // Carrier picker options for the Profile form
  const { data: carrierRows } = await sb
    .from("carriers")
    .select("id, name")
    .eq("tenant_id", ctx.tenant.id)
    .eq("active", true)
    .order("name");
  const carrierOptions = carrierRows ?? [];

  // Quick check: which integrations are configured (presence of env vars)
  const integrations = [
    {
      name: "GoHighLevel",
      desc: "SMS, email, and automation backend",
      connected: !!process.env.GHL_MOMENTUM_API_KEY,
    },
    {
      name: "Cal.com",
      desc: "Booking calendar embed",
      connected: !!process.env.CAL_API_KEY,
    },
    {
      name: "Resend",
      desc: "Transactional email delivery",
      connected: !!process.env.RESEND_API_KEY,
    },
    {
      name: "Meta Lead Ads",
      desc: "Inbound lead webhook",
      connected: !!process.env.META_LEADS_VERIFY_TOKEN,
    },
  ];

  const fullName =
    [ctx.user.first_name, ctx.user.last_name].filter(Boolean).join(" ") ||
    "—";

  return (
    <>
      <Header title="Settings" />
      <div className="px-8 py-8 space-y-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Settings</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Profile, security, notifications, and integrations.
          </p>
        </div>

        {/* Profile */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="h-4 w-4 text-purple" />
            <h3 className="text-base font-semibold text-ink">Profile</h3>
          </div>

          {/* Read-only meta row (email/role/tenant — not editable) */}
          <div className="mb-5 grid grid-cols-1 gap-3 rounded-md bg-muted/40 p-3 md:grid-cols-3 text-xs">
            <div>
              <span className="label">Signed in as</span>
              <div className="mt-0.5 text-ink">{fullName}</div>
              <div className="text-ink-subtle">{ctx.user.email}</div>
            </div>
            <div>
              <span className="label">Role</span>
              <div className="mt-0.5 font-medium text-ink">{ROLE_LABEL[ctx.user.role]}</div>
            </div>
            <div>
              <span className="label">Tenant</span>
              <div className="mt-0.5 text-ink">{ctx.tenant.name}</div>
            </div>
          </div>

          <ProfileForm
            initial={{
              first_name: ctx.user.first_name,
              last_name: ctx.user.last_name,
              phone: ctx.user.phone,
              avatar_url: ctx.user.avatar_url,
              states_licensed: ctx.user.states_licensed ?? [],
              carriers: ctx.user.carriers ?? [],
            }}
            carrierOptions={carrierOptions}
          />
        </div>

        {/* Admin (platform_owner only) */}
        {ctx.user.role === "platform_owner" && (
          <Link href="/settings/users" className="card block p-6 hover:border-purple/40 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple/10">
                  <UsersIcon className="h-5 w-5 text-purple" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">Manage Users</h3>
                  <p className="text-xs text-ink-subtle">
                    Promote, demote, or deactivate users in {ctx.tenant.name}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </div>
          </Link>
        )}

        {/* Security */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-purple" />
            <h3 className="text-base font-semibold text-ink">Security</h3>
          </div>
          <p className="text-sm text-ink-subtle">
            Password, two-factor auth, and connected accounts are managed in your
            Clerk profile — click your avatar in the sidebar.
          </p>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-purple" />
            <h3 className="text-base font-semibold text-ink">Notifications</h3>
          </div>
          <p className="text-sm text-ink-subtle">
            Email + SMS notification preferences are coming in task #11.
          </p>
        </div>

        {/* Integrations */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plug className="h-4 w-4 text-purple" />
            <h3 className="text-base font-semibold text-ink">Integrations</h3>
          </div>
          <ul className="divide-y divide-line">
            {integrations.map((int) => (
              <li
                key={int.name}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{int.name}</div>
                  <div className="text-xs text-ink-subtle">{int.desc}</div>
                </div>
                {int.connected ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-[11px] font-semibold text-success">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-ink-subtle">
                    <X className="h-3 w-3" /> Not configured
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
