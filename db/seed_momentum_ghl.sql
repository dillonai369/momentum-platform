-- =====================================================================
-- One-shot seed: attach Ryan Heagney LLC's GHL sub-account to the
-- Momentum tenant. Safe to re-run (idempotent — uses UPDATE WHERE).
--
-- Run in Supabase SQL editor after schema.sql.
-- =====================================================================

update tenants
set
  ghl_location_id = '4CaImRaMPmOe0pZPPrg4',
  ghl_api_key     = 'pit-346b80e4-c264-4eb6-9dc2-63ad093b453a',
  updated_at      = now()
where slug = 'momentum';

-- Sanity check — should return one row with the values populated
select slug, name, ghl_location_id,
       case when ghl_api_key is null then 'EMPTY' else 'SET' end as ghl_api_key_state
from tenants
where slug = 'momentum';
