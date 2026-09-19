export const botKeyboard={keyboard:[[{text:'📊 Natijalarim'},{text:'🎬 Videolarim'}],[{text:'📅 Keyingi qabul'},{text:'📝 Mashqlarim'}],[{text:'ℹ️ Yordam'}]],resize_keyboard:true};
const clip=(value,length=180)=>String(value||'').slice(0,length);
const access=`JOIN patients p ON p.id=t.patient_id JOIN users u ON u.id=p.user_id
 WHERE t.chat_id=? AND lower(t.username)=lower(?) AND lower(p.telegram)=lower(t.username) AND u.disabled=0`;
export async function telegramMenu(db,{chat,username,text,now}){
 const params=[chat,username||''];
 const reply=(text,extra={})=>({chat_id:chat,text:clip(text,3800),protect_content:true,reply_markup:botKeyboard,...extra});
 const linked=await db.prepare('SELECT p.id FROM patient_telegram t '+access+' LIMIT 1').get(...params);
 if(!linked)return reply('Assalomu alaykum! Natija va videolaringizni ko‘rish uchun logopeddan shaxsiy ulash havolasini oling va shu havolada Start bosing.',{reply_markup:{remove_keyboard:true}});
 const command=text.replace(/^\/(\w+)@\w+/, '/$1').trim();
 if(command==='/natijalar'||command==='📊 Natijalarim'){
  const rows=await db.prepare(`SELECT p.name,r.date,r.score,r.notes,e.title FROM patient_telegram t
   JOIN results r ON r.patient_id=t.patient_id
   LEFT JOIN exercises e ON e.id=r.exercise_id AND e.user_id=r.user_id
   ${access} AND r.user_id=p.user_id ORDER BY r.date DESC,r.id DESC LIMIT 10`).all(...params);
  return reply(rows.length?'So‘nggi natijalar (10 tagacha):\n\n'+rows.map(r=>`${clip(r.name,100)} · ${r.date}\n${clip(r.title,150)||'Mashg‘ulot'}: ${r.score}%${r.notes?'\n'+clip(r.notes):''}`).join('\n\n'):'Hali natija qo‘shilmagan.');
 }
 if(command==='/videolar'||command==='🎬 Videolarim'){
  const rows=await db.prepare(`SELECT v.id,v.title,p.name FROM patient_telegram t JOIN patient_videos v ON v.patient_id=t.patient_id ${access} AND v.owner_id=p.user_id ORDER BY v.created_at DESC,v.id DESC LIMIT 10`).all(...params);
  return reply(rows.length?'So‘nggi videolar (10 tagacha). Ko‘rish uchun tanlang:':'Hali video qo‘shilmagan.',rows.length?{reply_markup:{inline_keyboard:rows.map(v=>[{text:clip(v.name,30)+' · '+clip(v.title,55),callback_data:'video:'+v.id}])}}:{});
 }
 const video=command.match(/^\/video ([a-f0-9-]{36})$/);
 if(video){
  const row=await db.prepare(`SELECT v.id,v.title FROM patient_telegram t JOIN patient_videos v ON v.patient_id=t.patient_id ${access} AND v.owner_id=p.user_id AND v.id=?`).get(...params,video[1]);
  return row?{chat_id:chat,caption:row.title,protect_content:true,supports_streaming:true,_videoId:row.id}:reply('Video topilmadi yoki unga kirish yopilgan.');
 }
 if(command==='/qabul'||command==='📅 Keyingi qabul'){
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent'}).format(new Date(now));
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now));
  const rows=await db.prepare(`SELECT p.name,a.date,a.time,a.duration,a.title FROM patient_telegram t JOIN appointments a ON a.patient_id=t.patient_id ${access} AND a.user_id=p.user_id AND a.status='scheduled' AND (a.date>? OR (a.date=? AND a.time>=?)) ORDER BY a.date,a.time LIMIT 5`).all(...params,date,date,time);
  return reply(rows.length?'Keyingi qabullar · Toshkent vaqti:\n\n'+rows.map(a=>`${clip(a.name,100)}\n${a.date} · ${a.time} · ${a.duration} daqiqa\n${clip(a.title,150)}`).join('\n\n'):'Hozircha kelgusi qabul belgilanmagan.');
 }
 if(command==='/mashqlar'||command==='📝 Mashqlarim'){
  const rows=await db.prepare(`SELECT p.name,e.title,e.duration,e.instructions,pe.note FROM patient_telegram t JOIN patient_exercises pe ON pe.patient_id=t.patient_id JOIN exercises e ON e.id=pe.exercise_id AND e.user_id=pe.owner_id ${access} AND pe.owner_id=p.user_id ORDER BY pe.created_at DESC,pe.id LIMIT 5`).all(...params);
  return reply(rows.length?'Biriktirilgan mashqlar (5 tagacha):\n\n'+rows.map(e=>`${clip(e.name,100)} · ${clip(e.title,100)}\n${e.duration} daqiqa\n${clip(e.instructions,300)}${e.note?'\n'+clip(e.note,150):''}`).join('\n\n'):'Hozircha mashq biriktirilmagan.');
 }
 return reply('Nutq kabinetiga xush kelibsiz!\n\n📊 Natijalarim — logoped qo‘ygan baholar\n🎬 Videolarim — siz uchun yuklangan videolar\n📅 Keyingi qabul — qabul sanasi va vaqti\n📝 Mashqlarim — biriktirilgan uy mashqlari\n\nMa’lumotlar menyuni bosganda yangilanadi. Yangi videolar avtomatik keladi. Botga yozilgan savollar logopedga uzatilmaydi. Ulanishni uzish: /stop');
}
