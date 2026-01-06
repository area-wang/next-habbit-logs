PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	name TEXT,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS habits (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	frequency_type TEXT NOT NULL,
	frequency_n INTEGER,
	active INTEGER NOT NULL DEFAULT 1,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

CREATE TABLE IF NOT EXISTS habit_checkins (
	id TEXT PRIMARY KEY,
	habit_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	date_ymd TEXT NOT NULL,
	note TEXT,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (habit_id, date_ymd)
);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_id_date ON habit_checkins(user_id, date_ymd);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_id_date ON habit_checkins(habit_id, date_ymd);

CREATE TABLE IF NOT EXISTS daily_states (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	date_ymd TEXT NOT NULL,
	energy INTEGER,
	stress INTEGER,
	note TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (user_id, date_ymd)
);
CREATE INDEX IF NOT EXISTS idx_daily_states_user_id_date ON daily_states(user_id, date_ymd);
