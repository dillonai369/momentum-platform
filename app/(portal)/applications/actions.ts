"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import type { ApplicationStatus, PolicyType } from "@/lib/types";

const VALID_STATUSES: ApplicationStatus[] = [
  "started",
  "submitted",
  "underwriting",
  "approved",
  "issued",
  "declined",
  "withdrawn",
];

const VALID_POLICY_TYPES: PolicyType[] = [
  "term_life",
  "whole_life",
  "iul",
  "annuity",
  "final_expense",
  "mortgage_protection",
  "other",
];

export type NewAppResult =
  | { ok: true; applicationId: string; appCode: string }
  | { ok: false; error: string };

/**
 * Generate a human-readable app id like "APP-XXXXXX".
 * Uses base36 of timestamp + 4 random chars for collision safety.
 */
function generateAppCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `APP-${ts}${rand}`;
}

export async function createApplication(formData: FormData): Promise<NewAppResult> {
  const ctx = await getAuthContext();

  const lead_id = String(formData.get("lead_id") || "").trim() || null;
  const carrier_id = String(formData.get("carrier_id") || "").trim();
  const policy_type = String(formData.get("policy_type") || "") as PolicyType;
  const client_first_name = String(formData.get("client_first_name") || "").trim();
  const client_last_name = String(formData.get("client_last_name") || "").trim();
  const client_age_raw = String(formData.get("client_age") || "").trim();
  const client_email = String(formData.get("client_email") || "").trim() || null;
  const client_phone = String(formData.get("client_phone") || "").trim() || null;
  const annual_premium_raw = String(formData.get("annual_premium") || "").trim();
  const coverage_amount_raw = String(formData.get("coverage_amount") || "").trim();
  const status = (String(formData.get("status") || "submitted") as ApplicationStatus);
  const notes = String(formData.get("notes") || "").trim() || null;
  const agent_id_input = String(formData.get("agent_id") || "").trim();

  if (!client_first_name) return { ok: false, error: "Client first name is required." };
  if (!client_last_name) return { ok: false, error: "Client last name is required." };
  if (!carrier_id) return { ok: false, error: "Carrier is required." };
  if (!VALID_POLICY_TYPES.includes(policy_type)) {
    return { ok: false, error: "Invalid policy type." };
  }
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const annual_premium = annual_premium_raw ? Number(annual_premium_raw) : null;
  const coverage_amount = coverage_amount_raw ? Number(coverage_amount_raw) : null;
  const client_age = client_age_raw ? Number(client_age_raw) : null;

  if (annual_premium != null && (Number.isNaN(annual_premium) || annual_premium < 0)) {
    return { ok: false, error: "Annual premium must be a non-negative number." };
  }
  if (coverage_amount != null && (Number.isNaN(coverage_amount) || coverage_amount < 0)) {
    return { ok: false, error: "Coverage amount must be a non-negative number." };
  }

  // Agent assignment: agency_owner+ can override.
  let agent_id: string = ctx.user.id;
  if (agent_id_input && (ctx.user.role === "platform_owner" || ctx.user.role === "agency_owner")) {
    agent_id = agent_id_input;
  }

  const app_id = generateAppCode();
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("applications")
    .insert({
      tenant_id: ctx.tenant.id,
      agent_id,
      lead_id,
      app_id,
      carrier_id,
      policy_type,
      client_first_name,
      client_last_name,
      client_age,
      client_email,
      client_phone,
      annual_premium,
      coverage_amount,
      status,
      notes,
      submitted_at: status === "started" ? null : new Date().toISOString(),
    })
    .select("id, app_id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create application." };
  }

  // If tied to a lead, advance the lead status to "application_started"
  if (lead_id) {
    await sb
      .from("leads")
      .update({ status: "application_started" })
      .eq("id", lead_id)
      .eq("tenant_id", ctx.tenant.id);
  }

  await logActivity(ctx, {
    entity_type: "application",
    entity_id: data.id,
    action: status === "started" ? "created" : "submitted",
    agent_id,
    payload: {
      app_id: data.app_id,
      carrier_id,
      policy_type,
      annual_premium,
      coverage_amount,
      client_name: `${client_first_name} ${client_last_name}`,
    },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { ok: true, applicationId: data.id, appCode: data.app_id };
}

export async function updateApplicationStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAuthContext();
  const applicationId = String(formData.get("applicationId") || "");
  const status = String(formData.get("status") || "") as ApplicationStatus;

  if (!applicationId) return { ok: false, error: "Missing applicationId." };
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

  const sb = supabaseAdmin();
  const updateFields: Record<string, unknown> = { status };
  if (["approved", "issued", "declined", "withdrawn"].includes(status)) {
    updateFields.decision_at = new Date().toISOString();
  }

  const { data, error } = await sb
    .from("applications")
    .update(updateFields)
    .eq("id", applicationId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id, agent_id, app_id, client_first_name, client_last_name")
    .single();

  if (error || !data) return { ok: false, error: error?.message || "Application not found." };

  await logActivity(ctx, {
    entity_type: "application",
    entity_id: applicationId,
    action: "status_changed",
    agent_id: data.agent_id,
    payload: {
      app_id: data.app_id,
      status,
      client_name: `${data.client_first_name} ${data.client_last_name}`,
    },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}
