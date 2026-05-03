import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Meta Lead Ads webhook.
 *
 * Verification flow (Meta calls GET first when you set up the webhook):
 *   GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *
 * Lead delivery (POST):
 *   { entry: [{ changes: [{ value: { leadgen_id, form_id, page_id, ... } }] }] }
 *
 * For now we accept the lead, record it, and route via tenant slug. Full GHL
 * sync + agent assignment lands in task #9.
 */

const VERIFY_TOKEN = process.env.META_LEADS_VERIFY_TOKEN || "";
const APP_SECRET = process.env.META_APP_SECRET || "";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(body: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET || !signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(body, "utf8").digest("hex");
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");

  if (APP_SECRET && !verifySignature(raw, sig)) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const sb = supabaseAdmin();

  // Resolve default tenant (Momentum) — multi-tenant Meta routing comes
  // when each tenant has its own Meta app + verify token.
  const { data: tenant } = await sb
    .from("tenants")
    .select("id")
    .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "momentum")
    .single();

  if (!tenant) {
    return new NextResponse("Tenant not configured", { status: 500 });
  }

  // Meta payload may contain multiple entries × multiple changes
  const entries = payload.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      // Real implementation: fetch leadgen lead via Graph API to get field_data,
      // resolve agent assignment via round-robin, sync to GHL, log activity.
      await sb.from("leads").insert({
        tenant_id: tenant.id,
        first_name: "Meta",
        last_name: "Lead",
        source: "Meta Lead Ad",
        status: "new",
        meta_lead_id: v.leadgen_id?.toString() ?? null,
        metadata: { raw: v },
      });
    }
  }

  return NextResponse.json({ received: true });
}
