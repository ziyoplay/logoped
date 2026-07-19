// Server tomoni: PostgreSQL ulanishi.
// DATABASE_URL berilmagan bo'lsa ilova baza-siz (brauzer xotirasi) rejimida ishlaydi.
import { Pool } from "pg";
import { randomBytes } from "crypto";

let pool = null;
let schemaReady = null;

export const hasDb = () => !!process.env.DATABASE_URL;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_SSL === "1" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS logoped_account (
          id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          name text NOT NULL,
          salt text NOT NULL,
          hash text,
          fhash text
        );
        CREATE TABLE IF NOT EXISTS logoped_data (
          id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS logoped_meta (
          key text PRIMARY KEY,
          value text NOT NULL
        );
      `);
    })().catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

export async function q(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}

export async function getAccount() {
  const r = await q("SELECT name, salt, hash, fhash FROM logoped_account WHERE id = 1");
  return r.rows[0] || null;
}

export async function setAccount(acc) {
  await q(
    `INSERT INTO logoped_account (id, name, salt, hash, fhash) VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name = $1, salt = $2, hash = $3, fhash = $4`,
    [acc.name, acc.salt, acc.hash || null, acc.fhash || null]
  );
}

export async function getData() {
  const r = await q("SELECT data FROM logoped_data WHERE id = 1");
  return r.rows[0]?.data || null;
}

export async function setData(data) {
  await q(
    `INSERT INTO logoped_data (id, data, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
    [JSON.stringify(data)]
  );
}

// sessiya imzosi uchun maxfiy kalit — birinchi so'rovda yaratilib bazada saqlanadi
export async function getSecret() {
  const r = await q("SELECT value FROM logoped_meta WHERE key = 'auth_secret'");
  if (r.rows[0]) return r.rows[0].value;
  const secret = randomBytes(32).toString("hex");
  await q(
    "INSERT INTO logoped_meta (key, value) VALUES ('auth_secret', $1) ON CONFLICT (key) DO NOTHING",
    [secret]
  );
  const r2 = await q("SELECT value FROM logoped_meta WHERE key = 'auth_secret'");
  return r2.rows[0].value;
}
