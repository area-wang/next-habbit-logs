PRAGMA foreign_keys = ON;

ALTER TABLE habits ADD COLUMN start_date TEXT;
ALTER TABLE habits ADD COLUMN end_date TEXT;

UPDATE habits
SET start_date = substr(datetime(created_at / 1000, 'unixepoch', '+480 minutes'), 1, 10)
WHERE start_date IS NULL OR start_date = '';

CREATE INDEX IF NOT EXISTS idx_habits_user_active_dates ON habits(user_id, active, start_date, end_date);
