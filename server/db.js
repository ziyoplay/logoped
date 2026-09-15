import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, clinic TEXT NOT NULL DEFAULT 'Mening amaliyotim',
      demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, birth_date TEXT NOT NULL, guardian TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '', focus TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, category TEXT NOT NULL, duration INTEGER NOT NULL,
      instructions TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      date TEXT NOT NULL, time TEXT NOT NULL, duration INTEGER NOT NULL,
      title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled', notes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
      date TEXT NOT NULL, score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
      notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS patients_owner ON patients(user_id);
    CREATE INDEX IF NOT EXISTS appointments_owner_date ON appointments(user_id,date);
    CREATE INDEX IF NOT EXISTS results_owner_patient ON results(user_id,patient_id,date);
    CREATE INDEX IF NOT EXISTS exercises_owner ON exercises(user_id);
  `);
  // Add profile fields without replacing existing accounts or patient records.
  const columns = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
  const profileColumns = {
    specialty: "TEXT NOT NULL DEFAULT 'Logoped'", phone: "TEXT NOT NULL DEFAULT ''",
    address: "TEXT NOT NULL DEFAULT ''", bio: "TEXT NOT NULL DEFAULT ''",
    experience_years: 'INTEGER', accent: "TEXT NOT NULL DEFAULT 'green'",
    avatar: "TEXT NOT NULL DEFAULT ''"
  };
  db.exec('BEGIN');
  try {
    for (const [name, definition] of Object.entries(profileColumns)) {
      if (!columns.has(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  db.exec('BEGIN');
  try {
    const userColumns=new Set(db.prepare('PRAGMA table_info(users)').all().map(c=>c.name));
    for(const [name,definition] of Object.entries({clinic_id:'TEXT',role:"TEXT NOT NULL DEFAULT 'admin'",disabled:'INTEGER NOT NULL DEFAULT 0',revision:'INTEGER NOT NULL DEFAULT 0'})) {
      if(!userColumns.has(name))db.exec('ALTER TABLE users ADD COLUMN '+name+' '+definition);
    }
    db.exec(`CREATE TABLE IF NOT EXISTS clinics(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS invitations(token TEXT PRIMARY KEY,clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,email TEXT NOT NULL,expires INTEGER NOT NULL,created_by TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY,clinic_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,record_type TEXT NOT NULL,record_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS users_clinic ON users(clinic_id);
      CREATE INDEX IF NOT EXISTS audit_clinic ON audit_log(clinic_id,id);`);
    for(const user of db.prepare('SELECT id,clinic FROM users WHERE clinic_id IS NULL').all()) {
      const id=randomUUID();db.prepare('INSERT INTO clinics(id,owner_id,name) VALUES(?,?,?)').run(id,user.id,user.clinic);
      db.prepare('UPDATE users SET clinic_id=? WHERE id=?').run(id,user.id);
    }
    for(const table of ['patients','appointments','exercises','results']) {
      const cols=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name));
      if(!cols.has('revision'))db.exec('ALTER TABLE '+table+' ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
      if(!cols.has('updated_by'))db.exec('ALTER TABLE '+table+' ADD COLUMN updated_by TEXT');
    }
    const appointmentColumns=new Set(db.prepare('PRAGMA table_info(appointments)').all().map(c=>c.name));
    if(!appointmentColumns.has('therapist_id')) {db.exec('ALTER TABLE appointments ADD COLUMN therapist_id TEXT');db.exec('UPDATE appointments SET therapist_id=user_id');}
    db.exec('CREATE INDEX IF NOT EXISTS appointments_therapist_date ON appointments(therapist_id,date)');
    db.exec('COMMIT');
  } catch(error) {db.exec('ROLLBACK');db.close();throw error;}
  db.exec(readFileSync(new URL('./client-schema.sql',import.meta.url),'utf8'));
  return db;
}
