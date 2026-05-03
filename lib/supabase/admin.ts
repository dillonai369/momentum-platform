import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client — uses the service-role key, BYPASSES Row Level Security.
 *
 * NEVER import this from a client component. Server-side only:
 *   - route handlers (`app/api/.../route.ts`)
 *   - server components
 *   - server actions
 *
 * All tenant filtering MUST be done explicitly in the query (`.eq("tenant_id", ctx.tenantId)`).
 * RLS exists as a defense-in-depth layer; this client skips it for performance and
 * because we already trust the server-side tenant resolution.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
