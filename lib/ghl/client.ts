/**
 * Thin GoHighLevel API v2 client.
 *
 * Auth model:
 *   - Token starts with "pit-" → Private Integration Token (long-lived).
 *     Sent as `Authorization: Bearer <token>` + required `Version` header.
 *   - We always pull the token + locationId from the *tenant row* first
 *     (multi-tenant correct), falling back to env for local dev only.
 *
 * NOTE: Per the A2P 10DLC constraint (project_ghl_a2p_constraint.md),
 *       Ryan's sub-account stays named "Ryan Heagney LLC". The portal
 *       shows "Momentum" branding; GHL underneath is unchanged.
 */
import type { Tenant } from "@/lib/types";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export type GhlCredentials = {
  apiKey: string;
  locationId: string;
};

export class GhlError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getGhlCredentials(tenant: Tenant): GhlCredentials | null {
  const apiKey =
    (tenant as unknown as { ghl_api_key?: string }).ghl_api_key ||
    process.env.GHL_MOMENTUM_API_KEY ||
    "";
  const locationId =
    tenant.ghl_location_id || process.env.GHL_MOMENTUM_LOCATION_ID || "";
  if (!apiKey || !locationId) return null;
  return { apiKey, locationId };
}

async function ghlRequest<T>(
  creds: GhlCredentials,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      Version: GHL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }

  if (!res.ok) {
    throw new GhlError(
      `GHL ${init.method || "GET"} ${path} failed (${res.status})`,
      res.status,
      body
    );
  }
  return body as T;
}

// ----- Contacts ---------------------------------------------------------

export type GhlContactInput = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string;
  tags?: string[];
  /** GHL user id of the agent that owns this contact (for assignedTo). */
  assignedTo?: string;
  customFields?: Array<{ id: string; value: string }>;
};

export type GhlContact = {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

/**
 * Create a contact in GHL. Returns the new contact's id.
 * Idempotency: GHL will reject duplicates by phone+email — that's fine,
 * the caller should treat 4xx as "already exists" and look it up.
 */
export async function createContact(
  tenant: Tenant,
  input: GhlContactInput
): Promise<{ id: string }> {
  const creds = getGhlCredentials(tenant);
  if (!creds) throw new GhlError("Tenant missing GHL credentials", 412, null);

  const body = {
    locationId: creds.locationId,
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
    source: input.source ?? "Momentum Portal",
    tags: input.tags ?? [],
    assignedTo: input.assignedTo,
    customFields: input.customFields ?? [],
  };

  const res = await ghlRequest<{ contact: GhlContact }>(creds, "/contacts/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { id: res.contact.id };
}

/**
 * Quick connectivity check — pulls the location info for the configured location.
 * Used by /api/health/ghl to verify the API key + location id are valid.
 */
export async function pingLocation(tenant: Tenant): Promise<{ ok: true; name?: string } | { ok: false; error: string; status?: number }> {
  const creds = getGhlCredentials(tenant);
  if (!creds) return { ok: false, error: "Missing GHL credentials" };
  try {
    const res = await ghlRequest<{ location: { name?: string } }>(
      creds,
      `/locations/${creds.locationId}`
    );
    return { ok: true, name: res.location?.name };
  } catch (e) {
    if (e instanceof GhlError) return { ok: false, error: e.message, status: e.status };
    return { ok: false, error: (e as Error).message };
  }
}
