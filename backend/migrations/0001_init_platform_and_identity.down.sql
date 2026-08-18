-- ==============================================================================
-- Migration: 0001_init_platform_and_identity.down.sql
-- ==============================================================================

DROP TABLE IF EXISTS identity.tenant_audit_logs;
DROP TABLE IF EXISTS identity.tenant_memberships;
DROP TABLE IF EXISTS identity.users;
DROP TABLE IF EXISTS identity.tenants;
DROP TABLE IF EXISTS platform.outbox_events;

DROP FUNCTION IF EXISTS current_tenant();

DROP SCHEMA IF EXISTS identity CASCADE;
DROP SCHEMA IF EXISTS platform CASCADE;

DROP ROLE IF EXISTS frame24_app;
