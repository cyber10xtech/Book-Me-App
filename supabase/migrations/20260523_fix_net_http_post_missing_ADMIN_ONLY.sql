-- ============================================================
-- ADMIN-ONLY STEP: Run this FIRST with service_role enabled
-- ============================================================

-- 1) Create net schema (admin only)
CREATE SCHEMA IF NOT EXISTS net;

-- 2) Grant usage to all roles
GRANT USAGE ON SCHEMA net TO authenticated, anon, service_role;