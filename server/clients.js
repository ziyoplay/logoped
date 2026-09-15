import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {admin,audit} from './team.js';

const credentials=z.object({email:z.email().max(200).transform(v=>v.toLowerCase()),password:z.string().min(10).max(128)}).strict();
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
export function mountClients(app,db,{passwordHash}) {
 async function patient(req){
  admin(req);
  const row=await db.prepare('SELECT * FROM patients WHERE id=? AND user_id=?').get(req.params.id,req.ownerId);
  if(!row)fail(404,'Bemor topilmadi.');
  return row;
 }
 async function account(id){return await db.prepare('SELECT u.id,u.email,u.disabled FROM client_accounts c JOIN users u ON u.id=c.user_id WHERE c.patient_id=?').get(id)||null;}
 async function assignments(id,owner){return db.prepare('SELECT p.id,p.exercise_id,p.note,e.title,e.duration,e.instructions FROM patient_exercises p JOIN exercises e ON e.id=p.exercise_id WHERE p.patient_id=? AND p.owner_id=? ORDER BY p.created_at DESC,p.id').all(id,owner);}
 app.get('/api/patients/:id/access',async(req,res)=>{
  await patient(req);res.json({account:await account(req.params.id),exercises:await assignments(req.params.id,req.ownerId)});
 });
 app.post('/api/patients/:id/access',async(req,res)=>{
  if(req.user.demo)fail(403,'Klient akkaunti yaratish uchun shaxsiy hisobga kiring.');
  const v=credentials.parse(req.body),hashed=passwordHash(v.password);
  const result=await db.transaction(async()=>{
   const p=await patient(req);
   if(await account(p.id))fail(409,'Bu bemor uchun akkaunt allaqachon yaratilgan.');
   if(await db.prepare('SELECT id FROM users WHERE email=?').get(v.email))fail(409,'Bu email band. Boshqa email kiriting.');
   const id=randomUUID();
   await db.prepare("INSERT INTO users(id,name,email,password,clinic,clinic_id,role,specialty,demo) VALUES(?,?,?,?,?,?,'client','Klient',?)").run(id,p.guardian||p.name,v.email,hashed,req.user.clinic,req.user.clinic_id,req.user.demo);
   await db.prepare('INSERT INTO client_accounts(user_id,patient_id,owner_id,created_at) VALUES(?,?,?,?)').run(id,p.id,req.ownerId,Date.now());
   await audit(db,req,'create','client_account',id);return account(p.id);
  });res.status(201).json({account:result});
 });
 app.patch('/api/patients/:id/access',async(req,res)=>{
  const v=z.object({disabled:z.boolean().optional(),password:z.string().min(10).max(128).optional()}).strict().refine(v=>Object.keys(v).length>0).parse(req.body);
  const hashed=v.password?passwordHash(v.password):null;
  const result=await db.transaction(async()=>{
   await patient(req);const a=await account(req.params.id);if(!a)fail(404,'Klient akkaunti topilmadi.');
   if(v.disabled!==undefined)await db.prepare('UPDATE users SET disabled=? WHERE id=?').run(Number(v.disabled),a.id);
   if(hashed)await db.prepare('UPDATE users SET password=? WHERE id=?').run(hashed,a.id);
   if(hashed||v.disabled)await db.prepare('DELETE FROM sessions WHERE user_id=?').run(a.id);
   await audit(db,req,hashed?'reset_password':v.disabled?'disable':'enable','client_account',a.id);
   return account(req.params.id);
  });res.json({account:result});
 });
 app.post('/api/patients/:id/exercises',async(req,res)=>{
  const v=z.object({exercise_id:z.uuid(),note:z.string().trim().max(2000).default('')}).strict().parse(req.body);
  await db.transaction(async()=>{
   await patient(req);
   if(!await db.prepare('SELECT id FROM exercises WHERE id=? AND user_id=?').get(v.exercise_id,req.ownerId))fail(404,'Mashq topilmadi.');
   if(await db.prepare('SELECT id FROM patient_exercises WHERE patient_id=? AND exercise_id=?').get(req.params.id,v.exercise_id))fail(409,'Bu mashq allaqachon biriktirilgan.');
   const id=randomUUID();await db.prepare('INSERT INTO patient_exercises(id,patient_id,exercise_id,owner_id,note,created_at) VALUES(?,?,?,?,?,?)').run(id,req.params.id,v.exercise_id,req.ownerId,v.note,Date.now());
   await audit(db,req,'assign','patient_exercise',id);
  });res.status(201).json({ok:true});
 });
 app.delete('/api/patients/:id/exercises/:assignment',async(req,res)=>{
  await db.transaction(async()=>{await patient(req);const result=await db.prepare('DELETE FROM patient_exercises WHERE id=? AND patient_id=? AND owner_id=?').run(req.params.assignment,req.params.id,req.ownerId);if(!result.changes)fail(404,'Mashq biriktirmasi topilmadi.');await audit(db,req,'unassign','patient_exercise',req.params.assignment);});res.json({ok:true});
 });
 app.get('/api/client/overview',async(req,res)=>{
  if(req.user.role!=='client')fail(403,'Bu bo‘lim klientlar uchun.');
  const link=await db.prepare('SELECT c.patient_id,c.owner_id,p.name FROM client_accounts c JOIN patients p ON p.id=c.patient_id AND p.user_id=c.owner_id JOIN users owner ON owner.id=c.owner_id WHERE c.user_id=? AND owner.disabled=0').get(req.user.id);
  if(!link)fail(403,'Kabinetga kirish yopilgan. Logoped bilan bog‘laning.');
  // Explicit columns exclude the logoped's private patient and appointment notes.
  const appointments=await db.prepare('SELECT id,date,time,duration,title,status FROM appointments WHERE patient_id=? AND user_id=? ORDER BY date DESC,time DESC').all(link.patient_id,link.owner_id);
  const results=await db.prepare('SELECT r.id,r.date,r.score,r.notes,e.title AS exercise_title FROM results r LEFT JOIN exercises e ON e.id=r.exercise_id WHERE r.patient_id=? AND r.user_id=? ORDER BY r.date DESC,r.rowid DESC').all(link.patient_id,link.owner_id);
  res.json({patient:{name:link.name},appointments,results,exercises:await assignments(link.patient_id,link.owner_id)});
 });
}
