PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS daily_item_notes (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	date_ymd TEXT NOT NULL,
	item_type TEXT NOT NULL,
	item_id TEXT NOT NULL,
	note TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (user_id, date_ymd, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_item_notes_user_date ON daily_item_notes(user_id, date_ymd);
CREATE INDEX IF NOT EXISTS idx_daily_item_notes_user_item ON daily_item_notes(user_id, item_type, item_id);
