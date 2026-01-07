PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS push_subscriptions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	endpoint TEXT NOT NULL,
	expiration_time INTEGER,
	p256dh TEXT NOT NULL,
	auth TEXT NOT NULL,
	tz_offset_min INTEGER NOT NULL DEFAULT 480,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	disabled_at INTEGER,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_disabled_at ON push_subscriptions(disabled_at);

CREATE TABLE IF NOT EXISTS reminders (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	target_type TEXT NOT NULL,
	target_id TEXT NOT NULL,
	anchor TEXT NOT NULL,
	offset_min INTEGER,
	time_min INTEGER,
	enabled INTEGER NOT NULL DEFAULT 1,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reminders_user_target ON reminders(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_anchor ON reminders(user_id, anchor, enabled);

CREATE TABLE IF NOT EXISTS push_deliveries (
	id TEXT PRIMARY KEY,
	subscription_id TEXT NOT NULL,
	event_key TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE,
	UNIQUE (subscription_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_subscription_id ON push_deliveries(subscription_id);
