// Server tomoni: PostgreSQL ulanishi.
// DATABASE_URL berilmagan bo'lsa ilova baza-siz (brauzer xotirasi) rejimida ishlaydi.
import { Pool } from "pg";
import { randomBytes } from "crypto";
import { DEFAULT_EXERCISES } from "@/lib/helpers";

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
        -- mijozlar jadvali "users" deb ataladi (eski nomi logoped_client bo'lsa, o'zgartiramiz)
        DO $$
        BEGIN
          IF to_regclass('public.users') IS NULL AND to_regclass('public.logoped_client') IS NOT NULL THEN
            ALTER TABLE logoped_client RENAME TO users;
          END IF;
        END $$;
        CREATE TABLE IF NOT EXISTS users (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          name text NOT NULL DEFAULT '',
          birth_date text,
          gender text,
          father_name text,
          father_phone text,
          mother_name text,
          mother_phone text,
          parent_name text,
          phone text,
          diagnosis text,
          note text,
          login text,
          auth_salt text,
          auth_hash text,
          auth_fhash text,
          archived boolean NOT NULL DEFAULT false,
          created text,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS phone text,
          ADD COLUMN IF NOT EXISTS note text,
          ADD COLUMN IF NOT EXISTS auth_salt text,
          ADD COLUMN IF NOT EXISTS auth_hash text,
          ADD COLUMN IF NOT EXISTS auth_fhash text,
          ADD COLUMN IF NOT EXISTS created text,
          ADD COLUMN IF NOT EXISTS gender text,
          ADD COLUMN IF NOT EXISTS father_name text,
          ADD COLUMN IF NOT EXISTS mother_name text;
        CREATE TABLE IF NOT EXISTS logoped_referral (
          id text PRIMARY KEY,
          client_id text NOT NULL,
          date text,
          by_whom text,
          prev_state text
        );
        CREATE INDEX IF NOT EXISTS logoped_referral_client_idx
          ON logoped_referral (client_id);
        CREATE TABLE IF NOT EXISTS logoped_appt (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          client_id text,
          date text,
          time text,
          dur integer,
          service text,
          price integer NOT NULL DEFAULT 0,
          paid boolean NOT NULL DEFAULT false,
          note text,
          status text
        );
        CREATE INDEX IF NOT EXISTS logoped_appt_client_idx ON logoped_appt (client_id);
        CREATE TABLE IF NOT EXISTS logoped_task (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          client_id text,
          title text NOT NULL DEFAULT '',
          descr text,
          given text,
          due text,
          status text,
          video_id text
        );
        CREATE INDEX IF NOT EXISTS logoped_task_client_idx ON logoped_task (client_id);
        CREATE TABLE IF NOT EXISTS logoped_exercise (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          name text NOT NULL DEFAULT '',
          cat text,
          descr text
        );
        CREATE TABLE IF NOT EXISTS logoped_progress (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          client_id text,
          type text,
          date text,
          text text,
          video_id text
        );
        CREATE INDEX IF NOT EXISTS logoped_progress_client_idx ON logoped_progress (client_id);
        CREATE TABLE IF NOT EXISTS logoped_product (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          name text NOT NULL DEFAULT '',
          price integer NOT NULL DEFAULT 0,
          stock integer NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS logoped_sale (
          id text PRIMARY KEY,
          pos integer NOT NULL DEFAULT 0,
          product_id text,
          client_id text,
          qty integer NOT NULL DEFAULT 1,
          total integer NOT NULL DEFAULT 0,
          date text
        );
        CREATE TABLE IF NOT EXISTS logoped_image (
          id text PRIMARY KEY,
          kind text NOT NULL,
          owner_id text NOT NULL,
          data text NOT NULL
        );
        CREATE INDEX IF NOT EXISTS logoped_image_owner_idx ON logoped_image (kind, owner_id);
        -- oraliq formatdan ko'chirish: jsonb ustunli logoped_client bo'lsa,
        -- ichidagi maydonlarni ustunlar va rasm jadvaliga tarqatib, jsonb ustunini olib tashlaymiz
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'data') THEN
            UPDATE users SET
              phone      = data->>'phone',
              note       = data->>'note',
              auth_salt  = data#>>'{auth,salt}',
              auth_hash  = data#>>'{auth,hash}',
              auth_fhash = data#>>'{auth,fhash}',
              created    = data->>'created';
            INSERT INTO logoped_image (id, kind, owner_id, data)
              SELECT id || ':photo', 'client_photo', id, data->>'photo'
              FROM users WHERE COALESCE(data->>'photo', '') <> ''
              ON CONFLICT (id) DO NOTHING;
            INSERT INTO logoped_image (id, kind, owner_id, data)
              SELECT id || ':doc', 'client_doc', id, data->>'guvohnoma'
              FROM users WHERE COALESCE(data->>'guvohnoma', '') <> ''
              ON CONFLICT (id) DO NOTHING;
            INSERT INTO logoped_referral (id, client_id, date, by_whom, prev_state)
              SELECT r->>'id', c.id, r->>'date', r->>'byWhom', r->>'prevState'
              FROM users c,
                   jsonb_array_elements(COALESCE(c.data->'referrals', '[]'::jsonb)) r
              ON CONFLICT (id) DO NOTHING;
            ALTER TABLE users DROP COLUMN data;
          END IF;
        END $$;
        -- rasm ustunlaridan ko'chirish: photo/guvohnoma ustunlari qolgan bo'lsa,
        -- qiymatlarini logoped_image jadvaliga o'tkazib, ustunlarni olib tashlaymiz
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'photo') THEN
            INSERT INTO logoped_image (id, kind, owner_id, data)
              SELECT id || ':photo', 'client_photo', id, photo
              FROM users WHERE COALESCE(photo, '') <> ''
              ON CONFLICT (id) DO NOTHING;
            INSERT INTO logoped_image (id, kind, owner_id, data)
              SELECT id || ':doc', 'client_doc', id, guvohnoma
              FROM users WHERE COALESCE(guvohnoma, '') <> ''
              ON CONFLICT (id) DO NOTHING;
            ALTER TABLE users DROP COLUMN photo, DROP COLUMN guvohnoma;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'logoped_progress' AND column_name = 'photo') THEN
            INSERT INTO logoped_image (id, kind, owner_id, data)
              SELECT id || ':photo', 'progress_photo', id, photo
              FROM logoped_progress WHERE COALESCE(photo, '') <> ''
              ON CONFLICT (id) DO NOTHING;
            ALTER TABLE logoped_progress DROP COLUMN photo;
          END IF;
        END $$;
        CREATE TABLE IF NOT EXISTS logoped_meta (
          key text PRIMARY KEY,
          value text NOT NULL
        );
        CREATE TABLE IF NOT EXISTS logoped_task_video (
          id text PRIMARY KEY,
          task_id text NOT NULL,
          client_id text NOT NULL,
          mime text NOT NULL,
          bytes integer NOT NULL,
          data bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS logoped_task_video_task_idx
          ON logoped_task_video (task_id);
        CREATE TABLE IF NOT EXISTS logoped_progress_video (
          id text PRIMARY KEY,
          client_id text NOT NULL,
          mime text NOT NULL,
          bytes integer NOT NULL,
          data bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        -- eski JSON blob (logoped_data) bilan xayrlashish: bo'sh bo'lsa o'chirib yuboramiz,
        -- ichida ma'lumot bo'lsa birinchi saqlashgacha turadi (getData undan o'qiy oladi)
        DO $$
        BEGIN
          IF to_regclass('public.logoped_data') IS NOT NULL THEN
            DELETE FROM logoped_data WHERE
              COALESCE(jsonb_array_length(data->'clients'), 0) = 0 AND
              COALESCE(jsonb_array_length(data->'appts'), 0) = 0 AND
              COALESCE(jsonb_array_length(data->'tasks'), 0) = 0 AND
              COALESCE(jsonb_array_length(data->'exercises'), 0) = 0 AND
              COALESCE(jsonb_array_length(data->'progress'), 0) = 0 AND
              COALESCE(jsonb_array_length(data->'products'), 0) = 0 AND
              COALESCE(jsonb_array_length(data->'sales'), 0) = 0;
            IF NOT EXISTS (SELECT 1 FROM logoped_data) THEN
              DROP TABLE logoped_data;
            END IF;
          END IF;
          -- jadvallarda ma'lumot bor bo'lsa, "baza jadvallarda" belgisini qo'yamiz
          IF EXISTS (SELECT 1 FROM users) OR EXISTS (SELECT 1 FROM logoped_appt)
             OR EXISTS (SELECT 1 FROM logoped_task) OR EXISTS (SELECT 1 FROM logoped_exercise) THEN
            INSERT INTO logoped_meta (key, value) VALUES ('db_ready', '1')
              ON CONFLICT (key) DO NOTHING;
          END IF;
        END $$;
      `);
      // standart mashq kutubxonasi: jadval bo'sh bo'lsa (yangi baza), 8 ta standart
      // mashqni urug'lab qo'yamiz — mijoz bazasi bo'sh bo'lib qolgan holatlarda ham
      // (masalan hisob qayta yaratilganda) kutubxona bo'm-bo'sh chiqib qolmasligi uchun
      const exCount = await p.query("SELECT count(*) FROM logoped_exercise");
      if (+exCount.rows[0].count === 0) {
        for (let i = 0; i < DEFAULT_EXERCISES.length; i++) {
          const e = DEFAULT_EXERCISES[i];
          await p.query(
            `INSERT INTO logoped_exercise (id, pos, name, cat, descr) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [e.id, i, e.name, e.cat, e.desc]
          );
        }
      }
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

/* ---- asosiy ma'lumotlar ----
   Hamma bo'lim o'z jadvalida: mijozlar, qabullar, topshiriqlar, mashqlar,
   oldin/keyin yozuvlari, tovarlar, sotuvlar. Rasmlar (avatar, guvohnoma,
   holat rasmi) videolar kabi alohida logoped_image jadvalida — asosiy
   jadvallar ixcham va o'qish oson bo'lib qoladi. JSON saqlanmaydi.
   Ilova uchun farqi yo'q: getData hammasini qo'shib bitta obyekt qaytaradi.

   toRow: ilova obyekti → jadval ustunlari; toObj: qator → ilova obyekti. */

const TABLES = {
  clients: {
    table: "users",
    toRow: (c) => ({
      name: c.name || "", birth_date: c.birthDate || null, gender: c.gender || null,
      father_name: c.fatherName || null, father_phone: c.fatherPhone || null,
      mother_name: c.motherName || null, mother_phone: c.motherPhone || null,
      parent_name: c.parent || null, phone: c.phone || null,
      diagnosis: c.diagnosis || null, note: c.note || null,
      login: c.login || null,
      auth_salt: c.auth?.salt || null, auth_hash: c.auth?.hash || null, auth_fhash: c.auth?.fhash || null,
      archived: !!c.archived, created: c.created || null,
    }),
    toObj: (r) => {
      const c = {
        id: r.id, name: r.name || "", birthDate: r.birth_date || "", gender: r.gender || "",
        fatherName: r.father_name || "", fatherPhone: r.father_phone || "",
        motherName: r.mother_name || "", motherPhone: r.mother_phone || "",
        parent: r.parent_name || "", diagnosis: r.diagnosis || "", note: r.note || "",
        photo: "", guvohnoma: "", login: r.login || "", // rasmlar logoped_image'dan qo'shiladi
        referrals: [],
      };
      if (r.phone) c.phone = r.phone; // eski yozuvlardagi umumiy telefon
      if (r.created) c.created = r.created;
      if (r.archived) c.archived = true;
      if (r.auth_salt) c.auth = { salt: r.auth_salt, hash: r.auth_hash || undefined, fhash: r.auth_fhash || undefined };
      return c;
    },
  },
  appts: {
    table: "logoped_appt",
    toRow: (a) => ({
      client_id: a.clientId || null, date: a.date || null, time: a.time || null,
      dur: Math.round(+a.dur) || null, service: a.service || null,
      price: Math.round(+a.price) || 0, paid: !!a.paid, note: a.note || null, status: a.status || null,
    }),
    toObj: (r) => ({
      id: r.id, clientId: r.client_id || "", date: r.date || "", time: r.time || "",
      dur: r.dur ?? 30, service: r.service || "", price: r.price ?? 0,
      paid: !!r.paid, note: r.note || "", status: r.status || "rejalashtirilgan",
    }),
  },
  tasks: {
    table: "logoped_task",
    toRow: (k) => ({
      client_id: k.clientId || null, title: k.title || "", descr: k.desc || null,
      given: k.given || null, due: k.due || null, status: k.status || null, video_id: k.videoId || null,
    }),
    toObj: (r) => ({
      id: r.id, clientId: r.client_id || "", title: r.title || "", desc: r.descr || "",
      given: r.given || "", due: r.due || "", status: r.status || "berildi",
      ...(r.video_id ? { videoId: r.video_id } : {}),
    }),
  },
  exercises: {
    table: "logoped_exercise",
    toRow: (e) => ({ name: e.name || "", cat: e.cat || null, descr: e.desc || null }),
    toObj: (r) => ({ id: r.id, name: r.name || "", cat: r.cat || "", desc: r.descr || "" }),
  },
  progress: {
    table: "logoped_progress",
    toRow: (p) => ({
      client_id: p.clientId || null, type: p.type || null, date: p.date || null,
      text: p.text || null, video_id: p.videoId || null,
    }),
    toObj: (r) => ({
      id: r.id, clientId: r.client_id || "", type: r.type || "oldin", date: r.date || "",
      text: r.text || "", photo: "", ...(r.video_id ? { videoId: r.video_id } : {}),
    }),
  },
  products: {
    table: "logoped_product",
    toRow: (p) => ({ name: p.name || "", price: Math.round(+p.price) || 0, stock: Math.round(+p.stock) || 0 }),
    toObj: (r) => ({ id: r.id, name: r.name || "", price: r.price ?? 0, stock: r.stock ?? 0 }),
  },
  sales: {
    table: "logoped_sale",
    toRow: (s) => ({
      product_id: s.productId || null, client_id: s.clientId || null,
      qty: Math.round(+s.qty) || 1, total: Math.round(+s.total) || 0, date: s.date || null,
    }),
    toObj: (r) => ({
      id: r.id, productId: r.product_id || "", clientId: r.client_id || "",
      qty: r.qty ?? 1, total: r.total ?? 0, date: r.date || "",
    }),
  },
};

export async function getData() {
  // eski format: hamma narsa hali JSON blobda — birinchi saqlashda jadvallarga ko'chadi
  const ready = await q("SELECT 1 FROM logoped_meta WHERE key = 'db_ready'");
  if (!ready.rows.length) {
    const old = await q("SELECT to_regclass('public.logoped_data') IS NOT NULL AS mavjud");
    if (old.rows[0]?.mavjud) {
      const r = await q("SELECT data FROM logoped_data WHERE id = 1");
      if (r.rows[0]?.data) return r.rows[0].data;
    }
    return null;
  }
  const out = {};
  for (const [key, t] of Object.entries(TABLES)) {
    out[key] = (await q(`SELECT * FROM ${t.table} ORDER BY pos`)).rows.map(t.toObj);
  }
  const clientById = Object.fromEntries(out.clients.map((c) => [c.id, c]));
  const progById = Object.fromEntries(out.progress.map((p) => [p.id, p]));
  for (const x of (await q("SELECT * FROM logoped_referral")).rows) {
    clientById[x.client_id]?.referrals.push({ id: x.id, date: x.date || "", byWhom: x.by_whom || "", prevState: x.prev_state || "" });
  }
  for (const im of (await q("SELECT kind, owner_id, data FROM logoped_image")).rows) {
    if (im.kind === "client_photo" && clientById[im.owner_id]) clientById[im.owner_id].photo = im.data;
    else if (im.kind === "client_doc" && clientById[im.owner_id]) clientById[im.owner_id].guvohnoma = im.data;
    else if (im.kind === "progress_photo" && progById[im.owner_id]) progById[im.owner_id].photo = im.data;
  }
  return out;
}

async function upsertRow(pc, table, id, pos, row) {
  const cols = ["id", "pos", ...Object.keys(row)];
  const vals = [id, pos, ...Object.values(row)];
  const ph = cols.map((_, i) => "$" + (i + 1));
  const sets = cols.slice(1).map((c, i) => `${c} = $${i + 2}`);
  await pc.query(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${ph.join(", ")})
     ON CONFLICT (id) DO UPDATE SET ${sets.join(", ")}`,
    vals
  );
}

export async function setData(data) {
  await ensureSchema();
  const pc = await getPool().connect();
  try {
    await pc.query("BEGIN");
    for (const [key, t] of Object.entries(TABLES)) {
      const items = Array.isArray(data[key]) ? data[key] : [];
      if (items.length) await pc.query(`DELETE FROM ${t.table} WHERE NOT (id = ANY($1))`, [items.map((x) => x.id)]);
      else await pc.query(`DELETE FROM ${t.table}`);
      for (let i = 0; i < items.length; i++) {
        await upsertRow(pc, t.table, items[i].id, i, t.toRow(items[i]));
      }
    }
    await pc.query("DELETE FROM logoped_referral");
    for (const c of data.clients || []) {
      for (const ref of c.referrals || []) {
        await pc.query(
          `INSERT INTO logoped_referral (id, client_id, date, by_whom, prev_state)
           VALUES ($1, $2, $3, $4, $5)`,
          [ref.id, c.id, ref.date || null, ref.byWhom || null, ref.prevState || null]
        );
      }
    }
    await pc.query("DELETE FROM logoped_image");
    const putImage = (kind, suffix, ownerId, data_) =>
      pc.query("INSERT INTO logoped_image (id, kind, owner_id, data) VALUES ($1, $2, $3, $4)",
        [ownerId + suffix, kind, ownerId, data_]);
    for (const c of data.clients || []) {
      if (c.photo) await putImage("client_photo", ":photo", c.id, c.photo);
      if (c.guvohnoma) await putImage("client_doc", ":doc", c.id, c.guvohnoma);
    }
    for (const p of data.progress || []) {
      if (p.photo) await putImage("progress_photo", ":photo", p.id, p.photo);
    }
    // belgi: ma'lumotlar endi jadvallarda; eski JSON blob qolgan bo'lsa tozalaymiz
    await pc.query("INSERT INTO logoped_meta (key, value) VALUES ('db_ready', '1') ON CONFLICT (key) DO NOTHING");
    const old = await pc.query("SELECT to_regclass('public.logoped_data') IS NOT NULL AS mavjud");
    if (old.rows[0]?.mavjud) await pc.query("DELETE FROM logoped_data");
    await pc.query("COMMIT");
  } catch (e) {
    await pc.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    pc.release();
  }
}

/* ---- topshiriq videolari ----
   Video asosiy JSON blobiga EMAS, alohida jadvalga yoziladi: blob har saqlashda
   butunligicha qayta yuboriladi, video esa uni bir zumda ishlatib bo'lmas holga
   keltirardi. */

export async function saveTaskVideo({ id, taskId, clientId, mime, data }) {
  // bitta topshiriqda bitta video: qayta yuborilsa eskisi almashtiriladi
  await q("DELETE FROM logoped_task_video WHERE task_id = $1", [taskId]);
  await q(
    `INSERT INTO logoped_task_video (id, task_id, client_id, mime, bytes, data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, taskId, clientId, mime, data.length, data]
  );
}

export async function getTaskVideo(id) {
  const r = await q(
    "SELECT client_id, mime, data FROM logoped_task_video WHERE id = $1",
    [id]
  );
  return r.rows[0] || null;
}

/* ---- "oldin / keyin" (до и после) videolari ----
   Topshiriq videolari kabi alohida jadvalda: asosiy JSON blobini shishirmaslik uchun. */

export async function saveProgressVideo({ id, clientId, mime, data }) {
  await q(
    `INSERT INTO logoped_progress_video (id, client_id, mime, bytes, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, clientId, mime, data.length, data]
  );
}

export async function getProgressVideo(id) {
  const r = await q(
    "SELECT client_id, mime, data FROM logoped_progress_video WHERE id = $1",
    [id]
  );
  return r.rows[0] || null;
}

export async function deleteProgressVideo(id) {
  await q("DELETE FROM logoped_progress_video WHERE id = $1", [id]);
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
