PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	scope_type TEXT NOT NULL,
	scope_key TEXT NOT NULL,
	start_min INTEGER,
	end_min INTEGER,
	remind_before_min INTEGER,
	status TEXT NOT NULL DEFAULT 'todo',
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_scope ON tasks(user_id, scope_type, scope_key);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
