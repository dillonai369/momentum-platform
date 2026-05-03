import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AuthContext, Tenant, User, UserRole } from "@/lib/types";

/**
 * Read the tenant slug that middleware injected into request headers.
 */
async function getTenantSlug(): Promise<string> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  return slug || process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "momentum";
}

/**
 * Build the authenticated context for the current request.
 *
 * - Verifies Clerk session
 * - Resolves tenant from request host (via middleware header)
 * - Fetches (or auto-provisions) the matching `users` row in Supabase
 *
 * Use this at the top of any server component or route handler that touches data.
 * Throws if no Clerk session — let middleware handle the redirect for portal routes.
 */
export async function getAuthContext(): Promise<AuthContext> {
  // Clerk v6: auth() is async
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const tenantSlug = await getTenantSlug();
  const sb = supabaseAdmin();

  // Load tenant
  const { data: tenant, error: tenantErr } = await sb
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .single();

  if (tenantErr || !tenant) {
    throw new Error(
      `Tenant "${tenantSlug}" not found in database. Did you run db/schema.sql? (slug=${tenantSlug}, err=${tenantErr?.message})`
    );
  }

  // Load user (auto-provision if first sign-in)
  let { data: user } = await sb
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!user) {
    user = await provisionUser(userId, tenant);
  }

  return {
    clerkUserId: userId,
    user: user as User,
    tenant: tenant as Tenant,
  };
}

/**
 * First-time user provisioning. Auto-runs on first authenticated request.
 *
 * Default role assignment:
 *   - If this tenant has zero users yet → role = `platform_owner` (you, Dillon, on first run)
 *   - Otherwise → role = `agent` (Ryan and future agents start here; promote via Settings)
 *
 * Stores tenant_id and role in Clerk publicMetadata so future server-component reads
 * can short-circuit if needed.
 */
async function provisionUser(clerkUserId: string, tenant: Tenant): Promise<User> {
  const sb = supabaseAdmin();
  const cu = await currentUser();
  if (!cu) throw new Error("Clerk currentUser() returned null while provisioning");

  // First user in any tenant → platform_owner. After that, default to agent.
  const { count } = await sb
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const role: UserRole = (count ?? 0) === 0 ? "platform_owner" : "agent";

  const email =
    cu.primaryEmailAddress?.emailAddress ||
    cu.emailAddresses[0]?.emailAddress ||
    "";

  // Upsert by clerk_user_id — handles the race where two parallel server
  // components (e.g. layout + page) both try to provision on first sign-in.
  const { data: inserted, error } = await sb
    .from("users")
    .upsert(
      {
        clerk_user_id: clerkUserId,
        tenant_id: tenant.id,
        email,
        first_name: cu.firstName,
        last_name: cu.lastName,
        avatar_url: cu.imageUrl,
        role,
        active: true,
      },
      { onConflict: "clerk_user_id", ignoreDuplicates: false }
    )
    .select("*")
    .single();

  if (error || !inserted) {
    // Last-resort: someone else just inserted; fetch the row.
    const { data: existing } = await sb
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();
    if (existing) return existing as User;
    throw new Error(`Failed to provision user: ${error?.message}`);
  }

  // Mirror onto Clerk metadata for fast reads elsewhere
  try {
    // Clerk v6: clerkClient() is async
    const cc = await clerkClient();
    await cc.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        tenant_id: tenant.id,
        role,
        db_user_id: inserted.id,
      },
    });
  } catch {
    // Non-fatal — Clerk metadata is a convenience, DB is source of truth
  }

  return inserted as User;
}

/**
 * Convenience: throw if user is not at least the requested role.
 * Hierarchy: platform_owner > agency_owner > agent.
 */
export function requireRole(ctx: AuthContext, minimum: UserRole): void {
  const order: Record<UserRole, number> = {
    agent: 1,
    agency_owner: 2,
    platform_owner: 3,
  };
  if (order[ctx.user.role] < order[minimum]) {
    throw new Error(`Forbidden: requires ${minimum} or higher`);
  }
}
