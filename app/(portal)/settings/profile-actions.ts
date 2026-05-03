"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

export async function updateProfile(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAuthContext();

  const first_name = String(formData.get("first_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const avatar_url = String(formData.get("avatar_url") || "").trim() || null;

  // States licensed: comma-separated codes ("FL, TX, GA")
  const statesRaw = String(formData.get("states_licensed") || "");
  const states_licensed = statesRaw
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const invalidStates = states_licensed.filter((s) => !US_STATE_CODES.has(s));
  if (invalidStates.length) {
    return { ok: false, error: `Unknown state code(s): ${invalidStates.join(", ")}` };
  }

  // Carriers: array of carrier UUIDs from a multi-select
  const carriers = formData.getAll("carriers").map((c) => String(c)).filter(Boolean);

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("users")
    .update({
      first_name,
      last_name,
      phone,
      avatar_url,
      states_licensed,
      carriers,
    })
    .eq("id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
