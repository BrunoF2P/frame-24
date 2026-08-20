ALTER TABLE platform.outbox_events
    DROP COLUMN IF EXISTS started_at;