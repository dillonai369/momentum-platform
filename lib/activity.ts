import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/types";

export type ActivityEntityType =
  | "lead"
  | "application"
  | "policy"
  | "user"
  | "carrier"
  | "training";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "assigned"
  | "submitted"
  | "approved"
  | "issued"
  | "declined"
  | "withdrawn"
  | "booked"
  | "contacted"
  | "note_added";

export type ActivityInput = {
  entity_type: ActivityEntityType;
  entity_id: string;
  action: ActivityAction;
  /** Optional override for the agent this activity belongs to. Defaults to the actor. */
  agent_id?: string;
  /** Free-form structured payload — stored in `metadata` jsonb column. */
  payload?: Record<string, unknown>;
};

/**
 * Centralized activity log writer. Call from any mutating server action.
 * Failures are swallowed (best-effort) — activity log shouldn't break a write.
 *
 * Schema mapping (db/schema.sql):
 *   actor_id   ← ctx.user.id (who did the thing)
 *   agent_id   ← input.agent_id || ctx.user.id (whose work it counts toward)
 *   metadata   ← input.payload
 */
export async function logActivity(
  ctx: AuthContext,
  input: ActivityInput
): Promise<void> {
  try {
    const sb = supabaseAdmin();
    await sb.from("activity_log").insert({
      tenant_id: ctx.tenant.id,
      actor_id: ctx.user.id,
      agent_id: input.agent_id ?? ctx.user.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      metadata: input.payload ?? {},
    });
  } catch (e) {
    // Non-fatal — log to server console for ops follow-up
    console.error("activity_log insert failed", e);
  }
}
