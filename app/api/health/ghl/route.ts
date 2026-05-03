import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pingLocation } from "@/lib/ghl/client";
import type { Tenant } from "@/lib/types";

/**
 * GET /api/health/ghl?tenant=momentum
 *   → 200 { ok, tenant, location_name } if creds work
 *   → 502 { ok: false, error } if GHL rejects
 *
 * Dev-only sanity check. Don't expose this publicly without auth in prod.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("tenant") || "momentum";

  const sb = supabaseAdmin();
  const { data: tenant, error } = await sb
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !tenant) {
    return NextResponse.json(
      { ok: false, error: `Tenant ${slug} not found` },
      { status: 404 }
    );
  }

  const result = await pingLocation(tenant as Tenant);
  if (!result.ok) {
    return NextResponse.json(
      { tenant: slug, ok: false, error: result.error, status: result.status ?? null },
      { status: 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    tenant: slug,
    location_name: result.name ?? null,
  });
}
