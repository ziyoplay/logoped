import {card,html,videoCaption} from './telegram-text.js';
import {questionMenu} from './patient-questions.js';
export const botKeyboard={keyboard:[[{text:'📊 Natijalarim'},{text:'🎬 Videolarim'}],[{text:'📅 Keyingi qabul'},{text:'📝 Mashqlarim'}],[{text:'💬 Logopedga murojaat'},{text:'ℹ️ Yordam'}]],resize_keyboard:true};
const clip=(value,length=180)=>String(value||'').slice(0,length);
const access=`JOIN patients p ON p.id=t.patient_id JOIN users u ON u.id=p.user_id
 WHERE t.chat_id=? AND lower(t.username)=lower(?) AND lower(p.telegram)=lower(t.username) AND u.disabled=0`;
export async function telegramMenu(db,{chat,username,text,now}){
 const params=[chat,username||''];
 const reply=(text,extra={})=>({chat_id:chat,text,parse_mode:'HTML',protect_content:true,reply_markup:botKeyboard,...extra});
 const linked=await db.prepare('SELECT p.id FROM patient_telegram t '+access+' LIMIT 1').get(...params);
 if(!linked)return reply(card('🌿 Nutq · Shaxsiy kabinetingiz',['Assalomu alaykum! Natija va videolaringizni ko‘rish uchun logopeddan shaxsiy ulash havolasini oling va shu havolada <b>Start</b> bosing.']),{reply_markup:{remove_keyboard:true}});
 const command=text.replace(/^\/(\w+)@\w+/, '/$1').trim();
 const question=await questionMenu(db,{chat,username,text:command,now});if(question)return reply(question.text,question.reply_markup?{reply_markup:question.reply_markup}:{});
 if(command==='/natijalar'||command==='📊 Natijalarim'){
  const rows=await db.prepare(`SELECT p.name,r.date,r.score,r.notes,e.title FROM patient_telegram t
   JOIN results r ON r.patient_id=t.patient_id
   LEFT JOIN exercises e ON e.id=r.exercise_id AND e.user_id=r.user_id
   ${access} AND r.user_id=p.user_id ORDER BY r.date DESC,r.id DESC LIMIT 10`).all(...params);
  return reply(card('📊 Natijalarim',rows.length?rows.map(r=>`<b>${html(r.name,100)}</b> · ${html(r.date)}\n${html(r.title,150)||'Mashg‘ulot'}\nBaho: <b>${r.score}%</b>\n${'●'.repeat(Math.round(r.score/10))}${'○'.repeat(10-Math.round(r.score/10))}${r.notes?'\n💬 '+html(r.notes):''}`):['Hali natija qo‘shilmagan.'],'So‘nggi 10 natija · Bahoni logoped kiritadi.'));
 }
 if(command==='/videolar'||command==='🎬 Videolarim'){
  const rows=await db.prepare(`SELECT v.id,v.title,p.name FROM patient_telegram t JOIN patient_videos v ON v.patient_id=t.patient_id ${access} AND v.owner_id=p.user_id ORDER BY v.created_at DESC,v.id DESC LIMIT 10`).all(...params);
  return reply(card('🎬 Videolarim',[rows.length?'Siz uchun tayyorlangan mashqlar.\nVideoni olish uchun pastdagi tugmani bosing.':'Hali video qo‘shilmagan.'],'So‘nggi 10 video'),rows.length?{reply_markup:{inline_keyboard:rows.map(v=>[{text:clip(v.name,30)+' · '+clip(v.title,55),callback_data:'video:'+v.id}])}}:{});
 }
 const video=command.match(/^\/video ([a-f0-9-]{36})$/);
 if(video){
  const row=await db.prepare(`SELECT v.id,v.title FROM patient_telegram t JOIN patient_videos v ON v.patient_id=t.patient_id ${access} AND v.owner_id=p.user_id AND v.id=?`).get(...params,video[1]);
  return row?{chat_id:chat,caption:videoCaption(row.title),parse_mode:'HTML',protect_content:true,supports_streaming:true,_videoId:row.id}:reply(card('🎬 Video ochilmadi',['Video topilmadi yoki unga kirish yopilgan.']));
 }
 if(command==='/qabul'||command==='📅 Keyingi qabul'){
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent'}).format(new Date(now));
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now));
  const rows=await db.prepare(`SELECT p.name,a.date,a.time,a.duration,a.title FROM patient_telegram t JOIN appointments a ON a.patient_id=t.patient_id ${access} AND a.user_id=p.user_id AND a.status='scheduled' AND (a.date>? OR (a.date=? AND a.time>=?)) ORDER BY a.date,a.time LIMIT 5`).all(...params,date,date,time);
  return reply(card('📅 Keyingi qabullar',rows.length?rows.map(a=>`<b>${html(a.name,100)}</b>\n🗓 ${html(a.date)} · <b>${html(a.time)}</b>\n⏱ ${a.duration} daqiqa\n${html(a.title,150)}`):['Hozircha kelgusi qabul belgilanmagan.'],'Barcha vaqtlar Toshkent vaqti bilan.'));
 }
 if(command==='/mashqlar'||command==='📝 Mashqlarim'){
  const rows=await db.prepare(`SELECT p.name,e.title,e.duration,e.instructions,pe.note FROM patient_telegram t JOIN patient_exercises pe ON pe.patient_id=t.patient_id JOIN exercises e ON e.id=pe.exercise_id AND e.user_id=pe.owner_id ${access} AND pe.owner_id=p.user_id ORDER BY pe.created_at DESC,pe.id LIMIT 5`).all(...params);
  return reply(card('📝 Uy mashqlarim',rows.length?rows.map(e=>`<b>${html(e.title,100)}</b>\n👤 ${html(e.name,100)} · ⏱ ${e.duration} daqiqa\n${html(e.instructions,300)}${e.note?'\n💬 '+html(e.note,150):''}`):['Hozircha mashq biriktirilmagan.'],'Savol tug‘ilsa, «Logopedga murojaat»ni bosing.'));
 }
 return reply(card('🌿 Nutq · Sizning shaxsiy kabinetingiz',[
  'Assalomu alaykum! Kerakli bo‘limni pastdagi menyudan tanlang.',
  '📊 <b>Natijalarim</b> — baholar va kuzatuvlar\n🎬 <b>Videolarim</b> — siz uchun video mashqlar\n📅 <b>Keyingi qabul</b> — sana va vaqt\n📝 <b>Mashqlarim</b> — uy vazifalari\n💬 <b>Logopedga murojaat</b> — savol yozish va javob olish',
  'Yangi videolar va logoped javoblari shu yerga keladi.\nMurojaat yozish uchun avval tegishli tugmani bosing.'
 ],'Ulanishni uzish: /stop'));
}
