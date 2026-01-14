PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reflections (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	date_ymd TEXT NOT NULL,
	tags TEXT,
	content TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reflections_user_date ON reflections(user_id, date_ymd);
CREATE INDEX IF NOT EXISTS idx_reflections_date ON reflections(date_ymd);
