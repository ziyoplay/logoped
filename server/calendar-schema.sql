CREATE TABLE IF NOT EXISTS calendar_connections (
 owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 credentials TEXT NOT NULL, calendar_id TEXT NOT NULL DEFAULT '', sync_token TEXT NOT NULL DEFAULT '',
 last_sync BIGINT NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '',
 lease_owner TEXT NOT NULL DEFAULT '', lease_until BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS calendar_oauth (
 state_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_token TEXT NOT NULL, verifier TEXT NOT NULL, expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS calendar_events (
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, event_id TEXT NOT NULL,
 appointment_id TEXT, etag TEXT NOT NULL DEFAULT '', local_snapshot TEXT NOT NULL DEFAULT '',
 remote_event TEXT NOT NULL DEFAULT '{}', error TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(owner_id,event_id), UNIQUE(owner_id,appointment_id)
);
CREATE TABLE IF NOT EXISTS appointment_notifications (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE, appointment_id TEXT NOT NULL,
 payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', error TEXT NOT NULL DEFAULT '',
 updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS appointment_notifications_state ON appointment_notifications(state,updated_at);
