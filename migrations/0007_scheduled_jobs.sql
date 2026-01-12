PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scheduled_jobs (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	target_type TEXT NOT NULL,
	target_id TEXT NOT NULL,
	reminder_id TEXT NOT NULL,
	day_ymd TEXT,
	run_at INTEGER NOT NULL,
	tz_offset_min INTEGER NOT NULL DEFAULT 480,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	url TEXT NOT NULL,
	topic TEXT,
	status TEXT NOT NULL DEFAULT 'pending',
	attempts INTEGER NOT NULL DEFAULT 0,
	next_retry_at INTEGER,
	last_error TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	dedupe_key TEXT NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run_at ON scheduled_jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_retry_at ON scheduled_jobs(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user_id ON scheduled_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user_target ON scheduled_jobs(user_id, target_type, target_id);
