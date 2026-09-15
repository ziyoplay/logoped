CREATE TABLE IF NOT EXISTS client_accounts (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 patient_id TEXT NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS client_accounts_owner ON client_accounts(owner_id);
CREATE TABLE IF NOT EXISTS patient_exercises (
 id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 note TEXT NOT NULL DEFAULT '',
 created_at BIGINT NOT NULL,
 UNIQUE(patient_id,exercise_id)
);
CREATE INDEX IF NOT EXISTS patient_exercises_owner ON patient_exercises(owner_id,patient_id);
