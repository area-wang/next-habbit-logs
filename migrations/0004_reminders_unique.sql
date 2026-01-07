PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_reminders_user_target_anchor ON reminders(user_id, target_type, target_id, anchor);
