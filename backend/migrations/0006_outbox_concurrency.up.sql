-- Outbox: coluna started_at para rastrear processamento em andamento
-- e permitir recuperação de eventos órfãos de workers que falharam.
ALTER TABLE platform.outbox_events
    ADD COLUMN IF NOT EXISTS started_at timestamptz;