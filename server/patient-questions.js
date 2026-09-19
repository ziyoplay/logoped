import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {card,html} from './telegram-text.js';
const access=`JOIN patients p ON p.id=t.patient_id JOIN users u ON u.id=p.user_id WHERE t.chat_id=? AND lower(t.username)=lower(?) AND lower(p.telegram)=lower(t.username) AND u.disabled=0`;
export async function questionMenu(db,{chat,username,text,now}){
 const params=[chat,username||''];
 if(text==='/cancel'||text==='Bekor qilish'){
  await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);
  return {text:card('↩️ Murojaat bekor qilindi', ['Boshqa bo‘limni menyudan tanlang.'])};
 }
 const selected=text.match(/^\/ask ([a-f0-9-]{36})$/);
 if(text==='/murojaat'||text==='💬 Logopedga murojaat'||selected){
  await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);
  const patients=await db.prepare('SELECT p.id,p.name FROM patient_telegram t '+access+' ORDER BY p.name').all(...params);
  const patient=selected?patients.find(p=>p.id===selected[1]):patients.length===1?patients[0]:null;
  if(!patient)return {text:card('💬 Logopedga murojaat',['Murojaat qaysi bemor haqida?']),reply_markup:{inline_keyboard:patients.slice(0,30).map(p=>[{text:p.name.slice(0,80),callback_data:'ask:'+p.id}])}};
  await db.prepare('INSERT INTO telegram_question_drafts(chat_id,patient_id,expires) VALUES(?,?,?) ON CONFLICT(chat_id) DO UPDATE SET patient_id=excluded.patient_id,expires=excluded.expires').run(chat,patient.id,now+30*60000);
  return {text:card('✍️ Savolingizni yozing',[`Bemor: <b>${html(patient.name,100)}</b>`, 'Savol yoki murojaatingizni bitta matnli xabar qilib yuboring (2000 belgigacha).\nLogoped javobi shu botga keladi.'],'Bekor qilish: /cancel · 30 daqiqa ichida yuboring.')};
 }
 if(text.startsWith('/')||['📊 Natijalarim','🎬 Videolarim','📅 Keyingi qabul','📝 Mashqlarim','ℹ️ Yordam'].includes(text)){
  await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);return;
 }
 const draft=await db.prepare('SELECT * FROM telegram_question_drafts WHERE chat_id=?').get(chat);
 if(!draft)return;
 if(Number(draft.expires)<now){await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);return {text:card('⌛ Vaqt tugadi',['Qayta yozish uchun «Logopedga murojaat»ni bosing.'])};}
 const patient=await db.prepare('SELECT p.id,p.user_id FROM patient_telegram t '+access+' AND p.id=?').get(...params,draft.patient_id);
 if(!patient){await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);return {text:card('🔗 Ulanish yopilgan',['Logopeddan yangi ulash havolasini oling.'])};}
 const body=text.trim();if(!body||body.length>2000)return {text:card('✍️ Matnli murojaat',['1–2000 belgidan iborat matn yuboring. Fayl va ovozli xabar hozircha qabul qilinmaydi.'])};
 const recent=await db.prepare('SELECT count(*) AS n FROM patient_questions WHERE chat_id=? AND created_at>?').get(chat,now-3600000);
 if(Number(recent.n)>=10)return {text:card('⏳ Biroz kuting',['Bir soatda 10 tagacha murojaat yuborish mumkin. Keyinroq qayta urinib ko‘ring.'])};
 await db.prepare('INSERT INTO patient_questions(id,patient_id,owner_id,chat_id,telegram,body,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),patient.id,patient.user_id,chat,username,body,now,now);
 await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);
 return {text:card('✅ Murojaatingiz qabul qilindi',['Savolingiz logoped kabinetiga yetkazildi.\nJavob tayyor bo‘lganda shu yerga keladi.'],'Yangi savol uchun «Logopedga murojaat»ni bosing.')};
}
export function mountQuestions(app,db,now){
 const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
 app.get('/api/telegram/questions',async(req,res)=>{
  if(req.user.role==='client')fail(403,'Bu bo‘lim logoped uchun.');
  const rows=await db.prepare(`SELECT q.id,q.patient_id,p.name AS patient_name,q.body,q.answer,q.state,q.created_at FROM patient_questions q JOIN patients p ON p.id=q.patient_id AND p.user_id=q.owner_id WHERE q.owner_id=? ORDER BY CASE WHEN q.state='new' THEN 0 ELSE 1 END,q.created_at DESC LIMIT 100`).all(req.ownerId);
  res.json(rows);
 });
 app.post('/api/telegram/questions/:id/reply',async(req,res)=>{
  if(req.user.role==='client'||req.user.demo)fail(403,'Bu amal shaxsiy logoped hisobi uchun.');
  const {answer}=z.object({answer:z.string().trim().min(1).max(2000)}).strict().parse(req.body);
  const result=await db.prepare("UPDATE patient_questions SET answer=?,state='pending',updated_at=? WHERE id=? AND owner_id=? AND state='new'").run(answer,now(),req.params.id,req.ownerId);
  if(!result.changes)fail(409,'Murojaat topilmadi yoki unga javob berilgan. Ro‘yxatni yangilang.');res.json({ok:true});
 });
 app.post('/api/telegram/questions/:id/retry',async(req,res)=>{
  if(req.user.role==='client'||req.user.demo)fail(403,'Bu amal shaxsiy logoped hisobi uchun.');
  const result=await db.prepare("UPDATE patient_questions SET state='pending',updated_at=? WHERE id=? AND owner_id=? AND state='failed'").run(now(),req.params.id,req.ownerId);
  if(!result.changes)fail(409,'Murojaat qayta yuborish holatida emas.');res.json({ok:true});
 });
}
export async function deliverAnswer(db,call,now){
 await db.prepare("UPDATE patient_questions SET state='failed' WHERE state='sending' AND updated_at<?").run(now-600000);
 const q=await db.transaction(async()=>{const row=await db.prepare("SELECT * FROM patient_questions WHERE state='pending' ORDER BY updated_at LIMIT 1").get();if(row)await db.prepare("UPDATE patient_questions SET state='sending',updated_at=? WHERE id=?").run(now,row.id);return row;});
 if(!q)return;
 const link=await db.prepare('SELECT p.name FROM patient_telegram t '+access+' AND p.id=? AND p.user_id=?').get(q.chat_id,q.telegram,q.patient_id,q.owner_id);
 if(!link){await db.prepare("UPDATE patient_questions SET state='failed' WHERE id=?").run(q.id);return;}
 try{
  await call('sendMessage',{chat_id:q.chat_id,parse_mode:'HTML',protect_content:true,text:card('💬 Logopedingizdan javob',[`Bemor: <b>${html(link.name,100)}</b>`,`<b>Savolingiz</b>\n${html(q.body,200)}`,`<b>Javob</b>\n${html(q.answer,2000)}`])});
  await db.prepare("UPDATE patient_questions SET state='sent',updated_at=? WHERE id=?").run(now,q.id);
 }catch{await db.prepare("UPDATE patient_questions SET state='failed',updated_at=? WHERE id=?").run(now,q.id);}
}
