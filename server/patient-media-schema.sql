CREATE TABLE IF NOT EXISTS patient_telegram (
 patient_id TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
 chat_id TEXT, token_hash TEXT UNIQUE, expires BIGINT NOT NULL DEFAULT 0,
 username TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS patient_videos (
 id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, size BIGINT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending',
 created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
 message_id TEXT, error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS patient_videos_owner ON patient_videos(owner_id,patient_id);
CREATE TABLE IF NOT EXISTS telegram_state (
 id TEXT PRIMARY KEY, next_update BIGINT NOT NULL DEFAULT 0,
 lease_owner TEXT NOT NULL DEFAULT '', lease_until BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS patient_questions (
 id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 chat_id TEXT NOT NULL, telegram TEXT NOT NULL,
 body TEXT NOT NULL, answer TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'new',
 created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS patient_questions_owner ON patient_questions(owner_id,state,created_at);
CREATE TABLE IF NOT EXISTS telegram_question_drafts (
 chat_id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 expires BIGINT NOT NULL
);
