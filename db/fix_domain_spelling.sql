-- Fix domain spelling on Momentum tenant row
-- Run once in Supabase SQL Editor
update tenants
set custom_domain = 'momentumarketing.io'
where slug = 'momentum';
