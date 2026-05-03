"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clerkClient } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["platform_owner", "agency_owner", "agent"];

/**
 * Promote/demote a user. Platform owner only.
 *
 * Updates Supabase first (source of truth), then mirrors onto Clerk publicMetadata
 * so middleware / fast-path reads see the new role without a DB hit.
 */
export async function changeUserRole(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAuthContext();
  if (ctx.user.role !== "platform_owner") {
    return { ok: false, error: "Forbidden — only platform_owner can change roles." };
  }

  const userId = String(formData.get("userId") || "");
  const newRole = String(formData.get("role") || "") as UserRole;

  if (!userId) return { ok: false, error: "Missing userId." };
  if (!VALID_ROLES.includes(newRole)) return { ok: false, error: "Invalid role." };

  const sb = supabaseAdmin();

  // Update DB
  const { data: updated, error } = await sb
    .from("users")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("tenant_id", ctx.tenant.id) // tenant scope safety
    .select("id, clerk_user_id, tenant_id")
    .single();

  if (error || !updated) {
    return { ok: false, error: error?.message || "User not found in this tenant." };
  }

  // Mirror onto Clerk metadata (best-effort, non-fatal)
  try {
    const cc = await clerkClient();
    await cc.users.updateUserMetadata(updated.clerk_user_id, {
      publicMetadata: {
        tenant_id: updated.tenant_id,
        role: newRole,
        db_user_id: updated.id,
      },
    });
  } catch {
    // Clerk metadata is convenience only; DB is the source of truth
  }

  revalidatePath("/settings/users");
  return { ok: true };
}

/**
 * Toggle the `active` flag on a user. Platform owner only.
 * Inactive users keep their data but are filtered out of agent pickers + leaderboards.
 */
export async function toggleUserActive(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAuthContext();
  if (ctx.user.role !== "platform_owner") {
    return { ok: false, error: "Forbidden — only platform_owner can deactivate users." };
  }

  const userId = String(formData.get("userId") || "");
  const active = String(formData.get("active") || "") === "true";

  if (!userId) return { ok: false, error: "Missing userId." };

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("users")
    .update({ active })
    .eq("id", userId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/users");
  return { ok: true };
}
