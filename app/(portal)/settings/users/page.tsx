import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/portal/header";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { User, UserRole } from "@/lib/types";
import { ChevronLeft, Users as UsersIcon } from "lucide-react";
import { RoleSelect, ActiveToggle } from "./controls";

const ROLE_LABEL: Record<UserRole, string> = {
  platform_owner: "Platform Owner",
  agency_owner: "Agency Owner",
  agent: "Agent",
};

const ROLE_BADGE: Record<UserRole, string> = {
  platform_owner: "bg-purple/10 text-purple",
  agency_owner: "bg-blue/10 text-blue",
  agent: "bg-muted text-ink-subtle",
};

export default async function ManageUsersPage() {
  const ctx = await getAuthContext();

  // Platform owner only — anyone else gets bounced to /settings
  if (ctx.user.role !== "platform_owner") {
    redirect("/settings");
  }

  const sb = supabaseAdmin();
  const { data: users } = await sb
    .from("users")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: true });

  const userList = (users ?? []) as User[];

  return (
    <>
      <Header title="Manage Users" />
      <div className="px-8 py-8 space-y-6 max-w-5xl">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-xs text-ink-subtle hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-purple" />
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Manage Users — {ctx.tenant.name}
            </h2>
          </div>
          <p className="mt-1 text-sm text-ink-subtle">
            Promote, demote, or deactivate users in this tenant. Only visible to
            platform owners.
          </p>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-ink-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Current Role</th>
                <th className="px-4 py-3 font-semibold">Change Role</th>
                <th className="px-4 py-3 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {userList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-ink-faint">
                    No users yet.
                  </td>
                </tr>
              ) : (
                userList.map((u) => {
                  const fullName =
                    [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
                  const isSelf = u.id === ctx.user.id;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{fullName}</div>
                        {isSelf && (
                          <div className="text-[10px] text-ink-faint">(you)</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-subtle">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${ROLE_BADGE[u.role]}`}
                        >
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RoleSelect
                          userId={u.id}
                          currentRole={u.role}
                          disabled={isSelf}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ActiveToggle userId={u.id} active={u.active} disabled={isSelf} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-ink-faint">
          You can&rsquo;t change your own role or deactivate yourself, on purpose.
          Use Clerk to delete a user&rsquo;s sign-in entirely.
        </p>
      </div>
    </>
  );
}
