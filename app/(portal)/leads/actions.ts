"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { createContact, getGhlCredentials } from "@/lib/ghl/client";
import type { LeadStatus } from "@/lib/types";

export type AddLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string };

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "booked",
  "qualified",
  "application_started",
  "lost",
  "duplicate",
];

/**
 * Create a new lead. Available to all authenticated users.
 *
 * Defaults:
 *   - source = "Manual"
 *   - status = "new"
 *   - agent_id = current user (agency_owner+ may pass a different agent_id)
 */
export async function addLead(formData: FormData): Promise<AddLeadResult> {
  const ctx = await getAuthContext();

  const first_name = String(formData.get("first_name") || "").trim();
  const last_name = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const source = String(formData.get("source") || "Manual").trim() || "Manual";
  const notes = String(formData.get("notes") || "").trim() || null;
  const status = (String(formData.get("status") || "new") as LeadStatus);
  const agent_id_input = String(formData.get("agent_id") || "").trim();

  if (!first_name) return { ok: false, error: "First name is required." };
  if (!last_name) return { ok: false, error: "Last name is required." };
  if (!email && !phone) return { ok: false, error: "Email or phone is required." };
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  // Agent assignment: agency_owner+ can override; agents always assign to themselves.
  let agent_id: string = ctx.user.id;
  if (agent_id_input && (ctx.user.role === "platform_owner" || ctx.user.role === "agency_owner")) {
    agent_id = agent_id_input;
  }

  const sb = supabaseAdmin();

  // Look up the assigned agent's first name (used for the GHL agent tag)
  let agentSlug: string | null = null;
  const { data: agentRow } = await sb
    .from("users")
    .select("first_name, last_name, ghl_user_id")
    .eq("id", agent_id)
    .single();
  if (agentRow) {
    const slugBase = `${agentRow.first_name || ""}-${agentRow.last_name || ""}`.toLowerCase().trim();
    agentSlug = slugBase.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || null;
  }

  // 1) Create the lead row
  const { data, error } = await sb
    .from("leads")
    .insert({
      tenant_id: ctx.tenant.id,
      agent_id,
      first_name,
      last_name,
      email,
      phone,
      source,
      status,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create lead." };
  }

  // 2) Mirror to GHL as a contact (best-effort — don't block lead creation if GHL is down)
  if (getGhlCredentials(ctx.tenant)) {
    try {
      const tags = ["momentum-portal"];
      if (agentSlug) tags.push(`agent:${agentSlug}`);
      const ghl = await createContact(ctx.tenant, {
        firstName: first_name,
        lastName: last_name,
        email,
        phone,
        source: `Momentum Portal — ${source}`,
        tags,
        assignedTo: agentRow?.ghl_user_id || undefined,
      });
      // Save the GHL contact id back on the lead so future syncs find it
      await sb
        .from("leads")
        .update({ ghl_contact_id: ghl.id })
        .eq("id", data.id);
    } catch (e) {
      // Non-fatal — log so we can see in dev console; lead row still exists locally
      console.error("GHL contact create failed (lead saved locally)", e);
    }
  }

  await logActivity(ctx, {
    entity_type: "lead",
    entity_id: data.id,
    action: "created",
    agent_id,
    payload: { source, status, name: `${first_name} ${last_name}` },
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true, leadId: data.id };
}

/**
 * Update lead status (e.g., new → contacted → booked).
 */
export async function updateLeadStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAuthContext();
  const leadId = String(formData.get("leadId") || "");
  const status = String(formData.get("status") || "") as LeadStatus;

  if (!leadId) return { ok: false, error: "Missing leadId." };
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id, first_name, last_name")
    .single();

  if (error || !data) return { ok: false, error: error?.message || "Lead not found." };

  await logActivity(ctx, {
    entity_type: "lead",
    entity_id: leadId,
    action: "status_changed",
    payload: { status, name: `${data.first_name} ${data.last_name}` },
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}
