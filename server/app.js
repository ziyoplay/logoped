import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { sqliteStorage } from './storage.js';
import { mountClients } from './clients.js';
import { mountTeam, admin, audit, tokenHash } from './team.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = (max = 200) => z.string().trim().min(1).max(max);
const optionalText = (max = 2000) => z.string().trim().max(max).default('');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Sana noto‘g‘ri');
const patientSchema = z.object({ name: text(100), birth_date: date.refine(v => v <= new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date()) && v >= '1900-01-01'), guardian: optionalText(100), phone: optionalText(30), focus: optionalText(150), notes: optionalText(5000), status: z.enum(['active', 'archived']).default('active') });
const exerciseSchema = z.object({ title: text(150), category: z.enum(['Talaffuz', 'Artikulyatsiya', 'Nafas', 'Lug‘at', 'Boshqa']), duration: z.number().int().min(1).max(120), instructions: text(5000) });
const appointmentSchema = z.object({ therapist_id: z.uuid().optional(), patient_id: z.uuid(), date, time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), duration: z.number().int().min(5).max(240), title: text(150), status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'), notes: optionalText(5000) }).refine(v => minutes(v.time) + v.duration <= 1440, 'Qabul bir kun ichida tugashi kerak');
const resultSchema = z.object({ patient_id: z.uuid(), exercise_id: z.uuid().nullable().default(null), date, score: z.number().int().min(0).max(100), notes: optionalText(5000) });
const hashToken = v => createHash('sha256').update(v).digest('hex');
const minutes = v => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
function passwordHash(value) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(value, salt, 64).toString('hex'); }
function passwordMatches(value, stored) { const [salt, hash] = stored.split(':'); return timingSafeEqual(scryptSync(value, salt, 64), Buffer.from(hash, 'hex')); }
const safeUser = u => ({ id: u.id, name: u.name, email: u.email, clinic: u.clinic, demo: !!u.demo, specialty: u.specialty, phone: u.phone, address: u.address, bio: u.bio, experience_years: u.experience_years, accent: u.accent, avatar: u.avatar, role: u.role, clinic_id: u.clinic_id, revision: u.revision });
const avatarSchema = z.string().max(150000).refine(value => {
    if (value === '')
        return true;
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
        return false;
    const bytes = Buffer.from(value.split(',')[1], 'base64');
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
}, 'JPEG rasm tanlang');
const profileSchema = z.object({ name: text(100).optional(), clinic: text(150).optional(), specialty: text(100).optional(), phone: z.string().trim().max(30).optional(), address: z.string().trim().max(200).optional(), bio: z.string().trim().max(1000).optional(), experience_years: z.number().int().min(0).max(80).nullable().optional(), accent: z.enum(['green', 'blue', 'plum', 'orange']).optional(), avatar: avatarSchema.optional() }).strict().refine(v => Object.keys(v).length > 0);
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
export function createApp({ filename = process.env.DATABASE_PATH || path.join(root, 'data', 'nutq.sqlite'), secure = process.env.COOKIE_SECURE === 'true', teamMode = false, database } = {}) {
    const db = database || sqliteStorage(openDatabase(filename));
    const transaction = work => db.transaction(work);
    const app = express();
    app.disable('x-powered-by');
    if (process.env.TRUST_PROXY === '1')
        app.set('trust proxy', 1);
    app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'blob:'], 'upgrade-insecure-requests': secure ? [] : null } }, strictTransportSecurity: secure ? undefined : false }));
    app.use(express.json({ limit: '200kb' }));
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('X-Requested-With') !== 'Nutq')
            return res.status(403).json({ error: 'So‘rovga ruxsat berilmadi.' });
        next();
    });
    app.get('/api/health', async (_, res) => { try {
        await db.health();
        res.json({ ok: true });
    }
    catch {
        res.status(503).json({ ok: false, error: 'Baza bilan aloqa yo‘q.' });
    } });
    const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Urinishlar ko‘p. 15 daqiqadan keyin qayta urinib ko‘ring.' } });
    app.use('/api/auth', authLimit);
    async function session(req, res, user) {
        const token = randomBytes(32).toString('hex');
        await db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
        await db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(hashToken(token), user.id, Date.now() + 7 * 86400000);
        res.cookie('nutq_session', token, { httpOnly: true, sameSite: 'strict', secure, maxAge: 7 * 86400000, path: '/' });
        res.json({ user: safeUser(user) });
    }
    app.post('/api/auth/register', async (req, res) => {
        const v = z.object({ name: text(100), email: z.email().max(200).transform(v => v.toLowerCase()), password: z.string().min(10).max(128), invite: z.string().max(100).optional() }).parse(req.body);
        if (v.invite && !teamMode)
            fail(400, 'Bu ilova shaxsiy foydalanish uchun. Taklif kodi ishlatilmaydi.');
        if (!v.invite && process.env.ALLOW_REGISTRATION === 'false')
            fail(403, 'Ro‘yxatdan o‘tish yopilgan. Mavjud hisobingiz bilan kiring.');
        if (await db.prepare('SELECT id FROM users WHERE email=?').get(v.email))
            fail(409, 'Bu email bilan hisob mavjud. Kirish bo‘limidan foydalaning.');
        const id = randomUUID();
        const invite = v.invite ? await db.prepare('SELECT * FROM invitations WHERE token=? AND email=? AND expires>?').get(tokenHash(v.invite), v.email, Date.now()) : null;
        if (v.invite && !invite)
            fail(400, 'Taklif kodi noto‘g‘ri, eskirgan yoki boshqa email uchun berilgan.');
        const hashed = passwordHash(v.password);
        await transaction(async () => {
            await db.prepare('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)').run(id, v.name, v.email, hashed);
            if (invite) {
                const clinic = await db.prepare('SELECT * FROM clinics WHERE id=?').get(invite.clinic_id);
                await db.prepare("UPDATE users SET clinic_id=?,clinic=?,role='therapist' WHERE id=?").run(clinic.id, clinic.name, id);
                await db.prepare('DELETE FROM invitations WHERE token=?').run(invite.token);
            }
            else {
                const clinicId = randomUUID();
                await db.prepare('INSERT INTO clinics(id,owner_id,name) VALUES(?,?,?)').run(clinicId, id, 'Mening amaliyotim');
                await db.prepare('UPDATE users SET clinic_id=? WHERE id=?').run(clinicId, id);
            }
        });
        await session(req, res, await db.prepare('SELECT * FROM users WHERE id=?').get(id));
    });
    app.post('/api/auth/login', async (req, res) => {
        const v = z.object({ email: z.email().max(200).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) }).parse(req.body);
        const u = await db.prepare('SELECT * FROM users WHERE email=? AND demo=0 AND disabled=0').get(v.email);
        if (!u || !passwordMatches(v.password, u.password))
            fail(401, 'Email yoki parol noto‘g‘ri.');
        await session(req, res, u);
    });
    app.post('/api/auth/demo', async (req, res) => {
        if (process.env.ALLOW_DEMO === 'false')
            fail(403, 'Bu serverda namuna rejimi o‘chirilgan. Shaxsiy hisobingizga kiring.');
        await db.prepare("DELETE FROM users WHERE demo=1 AND created_at < datetime('now','-7 days')").run();
        const id = randomUUID();
        await db.prepare('INSERT INTO users(id,name,email,password,clinic,demo) VALUES(?,?,?,?,?,1)').run(id, 'Aziza', id + '@demo.invalid', passwordHash(randomBytes(32).toString('hex')), 'Nutq rivoji markazi');
        const clinicId = randomUUID();
        await db.prepare('INSERT INTO clinics(id,owner_id,name) VALUES(?,?,?)').run(clinicId, id, 'Nutq rivoji markazi');
        await db.prepare('UPDATE users SET clinic_id=? WHERE id=?').run(clinicId, id);
        await seedDemo(db, id);
        await session(req, res, await db.prepare('SELECT * FROM users WHERE id=?').get(id));
    });
    app.use('/api', async (req, res, next) => {
        const raw = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('nutq_session='))?.slice(13);
        const s = raw && await db.prepare('SELECT users.*,sessions.token FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND expires>? AND users.disabled=0').get(hashToken(raw), Date.now());
        if (!s)
            return res.status(401).json({ error: 'Davom etish uchun hisobingizga kiring.' });
        req.user = s;
        req.ownerId = teamMode ? (await db.prepare('SELECT owner_id FROM clinics WHERE id=?').get(s.clinic_id)).owner_id : s.id;
        next();
    });
    app.use('/api', (req,res,next)=>{
        if(req.user.role==='client' && !(['GET /me','POST /logout','POST /password','GET /client/overview'].includes(req.method+' '+req.path)))return res.status(403).json({error:'Bu amal faqat logoped uchun.'});
        next();
    });
    mountClients(app,db,{passwordHash});
    if (teamMode)
        mountTeam(app, db);
    app.get('/api/backup-status', (req, res) => { admin(req); res.json(app.locals.backups?.status() || { lastSuccess: null, lastError: 'Avtomatik zaxira xizmati ishga tushmagan.', running: false }); });
    app.get('/api/me', (req, res) => res.json({ user: safeUser(req.user) }));
    app.post('/api/logout', async (req, res) => { await db.prepare('DELETE FROM sessions WHERE token=?').run(req.user.token); res.clearCookie('nutq_session', { path: '/', httpOnly: true, sameSite: 'strict', secure }); res.json({ ok: true }); });
    app.patch('/api/me', async (req, res) => {
        const v = profileSchema.parse(req.body);
        const user = await transaction(async () => {
            const current = await db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
            if (req.get('If-Match') !== String(current.revision))
                fail(409, 'Profil boshqa qurilmada yangilangan. Matningizni nusxalab oling va sahifani yangilang.');
            if (current.role !== 'admin' && v.clinic && v.clinic !== current.clinic)
                fail(403, 'Markaz nomini faqat rahbar o‘zgartiradi.');
            if (v.clinic && v.clinic !== current.clinic) {
                await db.prepare('UPDATE clinics SET name=? WHERE id=?').run(v.clinic, current.clinic_id);
                await db.prepare('UPDATE users SET clinic=?,revision=revision+1 WHERE clinic_id=? AND id<>?').run(v.clinic, current.clinic_id, current.id);
            }
            await db.prepare('UPDATE users SET ' + Object.keys(v).map(key => key + '=?').join(',') + ',revision=revision+1 WHERE id=?').run(...Object.values(v), req.user.id);
            await audit(db, req, 'update', 'profile', req.user.id);
            return await db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
        });
        res.json({ user: safeUser(user) });
    });
    app.post('/api/password', async (req, res) => {
        if (req.user.demo)
            fail(403, 'Namuna hisobida parol o‘zgartirilmaydi.');
        const v = z.object({ current: z.string().min(1).max(128), password: z.string().min(10).max(128) }).parse(req.body);
        if (!passwordMatches(v.current, req.user.password))
            fail(400, 'Amaldagi parol noto‘g‘ri.');
        await db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(v.password), req.user.id);
        await db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(req.user.id, req.user.token);
        res.json({ ok: true });
    });
    const tables = { patients: patientSchema, exercises: exerciseSchema, appointments: appointmentSchema, results: resultSchema };
    async function owned(table, id, user) { if (!await db.prepare(`SELECT id FROM ${table} WHERE id=? AND user_id=?`).get(id, user))
        fail(404, 'Yozuv topilmadi.'); }
    async function validateRefs(table, v, user, id = '', req) {
        if (v.patient_id)
            await owned('patients', v.patient_id, user);
        if (v.exercise_id)
            await owned('exercises', v.exercise_id, user);
        if (table === 'appointments') {
            if (!teamMode)
                v.therapist_id = req.user.id;
            v.therapist_id ||= req.user.id;
            if (!await db.prepare('SELECT id FROM users WHERE id=? AND clinic_id=? AND disabled=0').get(v.therapist_id, req.user.clinic_id))
                fail(400, 'Faol logopedni tanlang.');
        }
        if (table === 'appointments' && v.status !== 'cancelled') {
            const rows = await db.prepare("SELECT time,duration FROM appointments WHERE user_id=? AND (? IS NULL OR therapist_id=?) AND date=? AND id<>? AND status<>'cancelled'").all(user, teamMode ? v.therapist_id : null, v.therapist_id, v.date, id);
            if (rows.some(a => minutes(v.time) < minutes(a.time) + a.duration && minutes(v.time) + v.duration > minutes(a.time)))
                fail(409, 'Tanlangan logopedning bu vaqti band. Boshqa vaqtni tanlang.');
        }
    }
    for (const [table, schema] of Object.entries(tables)) {
        app.get('/api/' + table, async (req, res) => res.json(await db.prepare('SELECT * FROM ' + table + ' WHERE user_id=? ORDER BY rowid DESC').all(req.ownerId)));
        app.post('/api/' + table, async (req, res) => {
            const row = await transaction(async () => {
                const v = schema.parse(req.body);
                await validateRefs(table, v, req.ownerId, '', req);
                const id = randomUUID();
                const keys = Object.keys(v);
                await db.prepare('INSERT INTO ' + table + '(id,user_id,' + keys.join(',') + ',updated_by) VALUES(' + Array(keys.length + 3).fill('?').join(',') + ')').run(id, req.ownerId, ...Object.values(v), req.user.id);
                await audit(db, req, 'create', table, id);
                return await db.prepare('SELECT * FROM ' + table + ' WHERE id=?').get(id);
            });
            res.status(201).json(row);
        });
        app.put('/api/' + table + '/:id', async (req, res) => {
            const row = await transaction(async () => {
                await owned(table, req.params.id, req.ownerId);
                const current = await db.prepare('SELECT revision FROM ' + table + ' WHERE id=?').get(req.params.id);
                if (req.get('If-Match') !== String(current.revision))
                    fail(409, 'Yozuv boshqa qurilmada yangilangan. Kiritgan matningizni nusxalab oling, oynani yoping va yangilab qayta oching.');
                const v = schema.parse(req.body);
                await validateRefs(table, v, req.ownerId, req.params.id, req);
                await db.prepare('UPDATE ' + table + ' SET ' + Object.keys(v).map(k => k + '=?').join(',') + ',revision=revision+1,updated_by=? WHERE id=? AND user_id=?').run(...Object.values(v), req.user.id, req.params.id, req.ownerId);
                await audit(db, req, 'update', table, req.params.id);
                return await db.prepare('SELECT * FROM ' + table + ' WHERE id=?').get(req.params.id);
            });
            res.json(row);
        });
        app.delete('/api/' + table + '/:id', async (req, res) => {
            await transaction(async () => {
                await owned(table, req.params.id, req.ownerId);
                admin(req);
                if (table === 'patients' && (await db.prepare('SELECT 1 FROM appointments WHERE patient_id=? LIMIT 1').get(req.params.id) || await db.prepare('SELECT 1 FROM results WHERE patient_id=? LIMIT 1').get(req.params.id)))
                    fail(409, 'Bu bemorning tarixi bor. O‘chirish o‘rniga kartani tahrirlab, Holati → Arxivda ni tanlang.');
                const current = await db.prepare('SELECT revision FROM ' + table + ' WHERE id=?').get(req.params.id);
                if (req.get('If-Match') !== String(current.revision))
                    fail(409, 'Yozuv yangilangan. Sahifani yangilab qayta urinib ko‘ring.');
                if(table==='patients')await db.prepare('DELETE FROM users WHERE id IN (SELECT user_id FROM client_accounts WHERE patient_id=? AND owner_id=?)').run(req.params.id,req.ownerId);
                await db.prepare('DELETE FROM ' + table + ' WHERE id=? AND user_id=?').run(req.params.id, req.ownerId);
                await audit(db, req, 'delete', table, req.params.id);
            });
            res.json({ ok: true });
        });
    }
    app.get('/api/export', async (req, res) => {
        admin(req);
        const data = { version: 1, exported_at: new Date().toISOString(), profile: safeUser(req.user) };
        for (const table of Object.keys(tables))
            data[table] = (await db.prepare(`SELECT * FROM ${table} WHERE user_id=?`).all(req.ownerId)).map(({ user_id, ...row }) => row);
        if (teamMode)
            data.team = await db.prepare('SELECT id,name,specialty,role,disabled FROM users WHERE clinic_id=?').all(req.user.clinic_id);
        res.set('Content-Disposition', 'attachment; filename="nutq-backup.json"').json(data);
    });
    app.use('/api', (_, res) => res.status(404).json({ error: 'Manzil topilmadi.' }));
    app.use(express.static(path.join(root, 'dist')));
    app.get('/{*path}', (_, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
    app.use((err, req, res, next) => {
        if (res.headersSent)
            return next(err);
        if (err instanceof z.ZodError)
            return res.status(400).json({ error: 'Maydonlarni tekshiring: ' + err.issues.map(i => i.path.join('.')).filter(Boolean).join(', ') });
        if (err.type === 'entity.parse.failed')
            return res.status(400).json({ error: 'So‘rov formati noto‘g‘ri.' });
        if (err.status)
            return res.status(err.status).json({ error: err.message });
        console.error('API error:', err.code || err.name);
        res.status(500).json({ error: 'Saqlashda xatolik. Qayta urinib ko‘ring.' });
    });
    return { app, db };
}
async function seedDemo(db, user) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
    const names = [['Ali Valiyev', '2020-03-15', 'Madina Valiyeva', 'R tovushi'], ['Malika Karimova', '2019-08-21', 'Dilnoza Karimova', 'Lug‘at boyligi'], ['Yusuf Salimov', '2021-01-09', 'Shahnoza Salimova', 'S va Sh tovushlari'], ['Sofiya Akbarova', '2020-11-02', 'Nargiza Akbarova', 'Ravon nutq']];
    const patients = [];
    for (const [name, birth, guardian, focus] of names) {
        const id = randomUUID();
        await db.prepare('INSERT INTO patients(id,user_id,name,birth_date,guardian,focus,notes) VALUES(?,?,?,?,?,?,?)').run(id, user, name, birth, guardian, focus, 'Namuna ma’lumoti — haqiqiy bemor emas.');
        patients.push(id);
    }
    const ex = [['Tovushni so‘zda topamiz', 'Talaffuz', 10, 'Logoped tanlagan tovush qatnashgan so‘zlar bilan ishlash. So‘zlar va takrorlash sonini bemorga moslab belgilang.'], ['Ko‘zgu bilan mashg‘ulot', 'Artikulyatsiya', 5, 'Logoped ko‘rsatgan harakatlarni ko‘zgu oldida bajarish. Mashq tarkibini logoped individual belgilaydi.'], ['Rasm haqida hikoya', 'Lug‘at', 15, 'Rasmni tanlang. Bola bilan rasmda kim va nima borligi haqida suhbat quring. Kuzatuvlaringizni natijalarga yozing.'], ['Nafasni kuzatish', 'Nafas', 5, 'Logoped nazoratidagi individual mashg‘ulot uchun shablon. Bajarish tartibini mutaxassis kiritadi.']];
    const exercises = [];
    for (const [title, category, duration, instructions] of ex) {
        const id = randomUUID();
        await db.prepare('INSERT INTO exercises(id,user_id,title,category,duration,instructions) VALUES(?,?,?,?,?,?)').run(id, user, title, category, duration, instructions);
        exercises.push(id);
    }
    for (const [i, time] of ['09:00', '10:00', '11:30', '14:00'].entries()) {
        await db.prepare('INSERT INTO appointments(id,user_id,patient_id,date,time,duration,title,status,therapist_id) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(), user, patients[i], day, time, 45, ['Talaffuz mashg‘uloti', 'Lug‘at bilan ishlash', 'Tovushlarni farqlash', 'Individual mashg‘ulot'][i], i === 0 ? 'completed' : 'scheduled', user);
    }
    for (const [i, p] of patients.entries()) {
        for (const [j, score] of [42, 58, 72].entries()) {
            const d = new Date(day + 'T12:00:00Z');
            d.setUTCDate(d.getUTCDate() - 14 + j * 7);
            await db.prepare('INSERT INTO results(id,user_id,patient_id,exercise_id,date,score,notes) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), user, p, exercises[i], d.toISOString().slice(0, 10), score - i * 4, 'Namuna: logoped kiritgan mashg‘ulot bahosi.');
        }
    }
}
