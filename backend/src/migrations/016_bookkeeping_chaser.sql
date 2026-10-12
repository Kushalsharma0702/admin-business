-- 016_bookkeeping_chaser.sql
-- Tracks the reminder-email cadence for recurring tasks (bookkeeping data
-- requests, query/HST-approval reminders) so the chaser scheduler knows how
-- many reminders have gone out and when, without re-sending on every tick.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;
