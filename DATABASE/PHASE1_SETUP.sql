-- Fresh Supabase project only. Use psql, not the web SQL editor (\ir is psql syntax).
-- Preserves the canonical PRODUCTION_SETUP layout used by existing backend APIs.
\set ON_ERROR_STOP on
BEGIN;
\ir PRODUCTION_SETUP.sql
\ir ../supabase/migrations/20260920075951_phase1_backend_security.sql
COMMIT;
