/**
 * Deploy db/schema.sql to your Supabase Postgres.
 *
 * Run: `npm run db:deploy`
 *
 * Requires SUPABASE_DB_URL in .env.local — the full Postgres connection string.
 * Get it from: Supabase Dashboard → Project Settings → Database → Connection string
 *   (use the "URI" / "Transaction Pooler" string; format:
 *    postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres)
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const SCHEMA_PATH = join(process.cwd(), "db", "schema.sql");
const url = process.env.SUPABASE_DB_URL;

if (!url) {
  console.error(
    "\n❌ Missing SUPABASE_DB_URL in .env.local\n\n" +
      "Get it from: Supabase Dashboard → Settings → Database → Connection string\n" +
      "Copy the URI and add to .env.local as:\n\n" +
      "  SUPABASE_DB_URL=postgres://postgres.<ref>:<password>@...pooler.supabase.com:6543/postgres\n"
  );
  process.exit(1);
}

async function main() {
  const sql = readFileSync(SCHEMA_PATH, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  console.log("→ Connecting to Supabase…");
  await client.connect();

  console.log("→ Executing db/schema.sql…");
  await client.query(sql);

  console.log("✓ Schema deployed.");
  await client.end();
}

main().catch((e) => {
  console.error("\n❌ Deploy failed:\n", e.message || e);
  process.exit(1);
});
