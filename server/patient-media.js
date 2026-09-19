import {card,videoCaption} from './telegram-text.js';
import {telegramMenu,botKeyboard} from './telegram-menu.js';
import express from 'express';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,unlink,readdir,stat} from 'node:fs/promises';
import {openAsBlob} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
const hash=v=>createHash('sha256').update(v).digest('hex');
const MAX_VIDEO=45*1024*1024;
function fail(status,message){const e=new Error(message);e.status=status;throw e;}

export function patientMedia(db,{token=process.env.TELEGRAM_BOT_TOKEN||'',directory=process.env.VIDEO_DIRECTORY||path.join(path.dirname(process.env.DATABASE_PATH||'data/nutq.sqlite'),'videos'),transport,now=Date.now}={}){
 const root=path.resolve(directory),workerId=randomUUID(),botId=token.split(':')[0],enabled=Boolean(token);
 let username='',timer,pending,stopped=false;
 const abort=new AbortController();
 const filename=id=>path.join(root,id+'.mp4');
 async function call(method,payload,file){
  if(transport)return transport(method,payload,file);
  try{
   let body,headers;
   if(file){body=new FormData();for(const [key,value] of Object.entries(payload))body.set(key,String(value));body.set('video',await openAsBlob(file,{type:'video/mp4'}),'mashgulot.mp4');}
   else{body=JSON.stringify(payload);headers={'Content-Type':'application/json'};}
   const r=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',body,headers,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(file?90000:10000)])});
   const data=await r.json();if(!data.ok){const e=new Error('Telegram error');e.status=data.error_code;throw e;}return data.result;
  }catch(e){const safe=new Error('Telegram request failed');safe.status=e.status;throw safe;}
 }
 async function owned(req){
  if(req.user.role==='client')fail(403,'Bu amal logoped uchun.');
  const row=await db.prepare('SELECT * FROM patients WHERE id=? AND user_id=?').get(req.params.id,req.ownerId);
  if(!row)fail(404,'Bemor topilmadi.');return row;
 }
 function mount(app){
  app.get('/api/patients/:id/media',async(req,res)=>{
   const p=await owned(req),link=await db.prepare('SELECT chat_id,username FROM patient_telegram WHERE patient_id=?').get(p.id);
   const videos=await db.prepare('SELECT id,title,size,state,created_at,error FROM patient_videos WHERE patient_id=? AND owner_id=? ORDER BY created_at DESC').all(p.id,req.ownerId);
   res.json({telegram:p.telegram,patientRevision:p.revision,enabled,ready:Boolean(username),connected:Boolean(link?.chat_id&&link.username.toLowerCase()===p.telegram.toLowerCase()),videos});
  });
  app.patch('/api/patients/:id/telegram',async(req,res)=>{
   const v=z.object({telegram:z.string().trim().max(80).transform(value=>value.replace(/^https:\/\/t\.me\//i,'').replace(/^@/,'')).refine(value=>/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value),'Telegram username noto‘g‘ri')}).strict().parse(req.body);
   await db.transaction(async()=>{
    const p=await owned(req);
    if(req.get('If-Match')!==String(p.revision))fail(409,'Bemor kartasi yangilangan. Holatni yangilab, qayta saqlang.');
    await db.prepare('UPDATE patients SET telegram=?,revision=revision+1,updated_by=? WHERE id=? AND user_id=?').run(v.telegram,req.user.id,p.id,req.ownerId);
    if(p.telegram.toLowerCase()!==v.telegram.toLowerCase())await db.prepare('DELETE FROM patient_telegram WHERE patient_id=?').run(p.id);
   });res.json({ok:true});
  });
  app.post('/api/patients/:id/telegram-link',async(req,res)=>{
   const p=await owned(req);if(req.user.demo)fail(403,'Telegram uchun shaxsiy hisobingizga kiring.');
   if(!enabled||!username)fail(503,'Telegram bot tayyor emas. Server sozlamalarini tekshiring.');
   if(!p.telegram)fail(400,'Avval bemor kartasiga Telegram username kiriting.');
   const secret=randomBytes(24).toString('base64url');
   await db.prepare('INSERT INTO patient_telegram(patient_id,token_hash,expires) VALUES(?,?,?) ON CONFLICT(patient_id) DO UPDATE SET token_hash=excluded.token_hash,expires=excluded.expires').run(p.id,hash(secret),now()+24*3600000);
   res.json({url:'https://t.me/'+username+'?start='+secret});
  });
  app.delete('/api/patients/:id/telegram-link',async(req,res)=>{
   await owned(req);await db.prepare('DELETE FROM patient_telegram WHERE patient_id=?').run(req.params.id);res.json({ok:true});
  });
  const uploadLimit=rateLimit({windowMs:3600000,limit:30,keyGenerator:req=>req.user.id,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Video yuklash chegarasiga yetdingiz. Keyinroq urinib ko‘ring.'}});
  app.post('/api/patients/:id/videos',uploadLimit,async(req,res,next)=>{
   try{await owned(req);if(req.user.demo)fail(403,'Video yuborish uchun shaxsiy hisobingizga kiring.');
    if(!req.is('video/mp4'))fail(415,'MP4 formatidagi video tanlang.');
    const count=await db.prepare('SELECT count(*) AS n,COALESCE(sum(size),0) AS bytes FROM patient_videos WHERE owner_id=?').get(req.ownerId);
    if(Number(count.n)>=200||Number(count.bytes)>=1024*1024*1024)fail(409,'Video saqlash chegarasi to‘lgan. Eski videolarni olib tashlang.');next();
   }catch(e){next(e);}
  },express.raw({type:'video/mp4',limit:MAX_VIDEO}),async(req,res)=>{
   const title=z.string().trim().min(1).max(150).parse(req.query.title);
   if(!Buffer.isBuffer(req.body)||req.body.length<12||req.body.toString('ascii',4,8)!=='ftyp')fail(400,'MP4 fayl noto‘g‘ri. Boshqa video tanlang.');
   const id=randomUUID();await mkdir(root,{recursive:true});await writeFile(filename(id),req.body,{flag:'wx',mode:0o600});
   try{await db.prepare('INSERT INTO patient_videos(id,patient_id,owner_id,title,size,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,req.params.id,req.ownerId,title,req.body.length,now(),now());}
   catch(e){await unlink(filename(id)).catch(()=>{});throw e;}
   res.status(201).json({id,state:'pending'});
  });
  app.get('/api/patients/:id/videos/:video',async(req,res)=>{
   await owned(req);
   const video=await db.prepare('SELECT id FROM patient_videos WHERE id=? AND patient_id=? AND owner_id=?').get(req.params.video,req.params.id,req.ownerId);
   if(!video)fail(404,'Video topilmadi.');res.type('video/mp4');res.sendFile(filename(video.id),{cacheControl:false},e=>{if(e&&!res.headersSent)res.status(404).json({error:'Video fayli topilmadi.'});});
  });
  app.post('/api/patients/:id/videos/:video/retry',async(req,res)=>{
   await owned(req);
   const result=await db.prepare("UPDATE patient_videos SET state='pending',error='',updated_at=? WHERE id=? AND patient_id=? AND owner_id=? AND state='failed'").run(now(),req.params.video,req.params.id,req.ownerId);
   if(!result.changes)fail(409,'Video qayta yuborish holatida emas.');res.json({ok:true});
  });
  app.delete('/api/patients/:id/videos/:video',async(req,res)=>{
   await owned(req);
   const id=await db.transaction(async()=>{
    const v=await db.prepare('SELECT id,state FROM patient_videos WHERE id=? AND patient_id=? AND owner_id=?').get(req.params.video,req.params.id,req.ownerId);
    if(!v)fail(404,'Video topilmadi.');if(v.state==='sending')fail(409,'Video yuborilmoqda. Tugashini kuting.');
    await db.prepare('DELETE FROM patient_videos WHERE id=?').run(v.id);return v.id;
   });await unlink(filename(id)).catch(()=>{});res.json({ok:true});
  });
 }
 async function initialize(){
  if(!enabled||username)return;
  const me=await call('getMe',{}),hook=await call('getWebhookInfo',{});
  if(hook.url)throw new Error('Existing webhook must be reviewed');
  await call('setMyCommands',{commands:[{command:'start',description:'Bosh menyu'},{command:'natijalar',description:'Natijalarim'},{command:'videolar',description:'Videolarim'},{command:'qabul',description:'Keyingi qabul'},{command:'mashqlar',description:'Uy mashqlarim'},{command:'help',description:'Yordam'},{command:'stop',description:'Ulanishni uzish'}]});
  username=me.username;
 }
 async function processUpdate(update){
  const callback=update.callback_query;
  const m=callback?{chat:callback.message?.chat,from:callback.from,text:typeof callback.data==='string'&&callback.data.startsWith('video:')?'/video '+callback.data.slice(6):'/help'}:update.message;
  if(!m||m.chat?.type!=='private'||m.from?.is_bot||m.chat.id!==m.from?.id||!Number.isSafeInteger(m.chat.id))return;
  const chat=String(m.chat.id);
  if(/^\/stop(?:@\w+)?\s*$/.test(m.text||'')){await db.prepare('DELETE FROM patient_telegram WHERE chat_id=?').run(chat);return {chat_id:chat,text:card('🔕 Ulanish uzildi',['Botdan xabarlar kelishi to‘xtatildi.\nQayta ulash uchun logopeddan yangi havola oling.']),parse_mode:'HTML',reply_markup:{remove_keyboard:true}};}
  const match=(m.text||'').match(/^\/start(?:@\w+)? ([A-Za-z0-9_-]{32})\s*$/);if(!match)return telegramMenu(db,{chat,username:m.from.username,text:m.text||'',now:now()});
  const link=await db.prepare('SELECT t.patient_id,p.telegram FROM patient_telegram t JOIN patients p ON p.id=t.patient_id JOIN users u ON u.id=p.user_id WHERE t.token_hash=? AND t.expires>? AND u.disabled=0').get(hash(match[1]),now());
  if(!link)return {chat_id:chat,text:card('🔗 Havola eskirgan',['Logopeddan yangi ulash havolasini oling.']),parse_mode:'HTML'};
  if(!m.from.username||m.from.username.toLowerCase()!==link.telegram.toLowerCase())return {chat_id:chat,text:card('🔗 Akkaunt mos kelmadi',['Bu Telegram akkaunti bemor kartasidagi username bilan mos emas. Logoped bilan bog‘laning.']),parse_mode:'HTML'};
  await db.prepare('UPDATE patient_telegram SET chat_id=?,username=?,token_hash=NULL,expires=0 WHERE patient_id=?').run(chat,m.from.username,link.patient_id);
  await db.prepare('DELETE FROM telegram_question_drafts WHERE chat_id=?').run(chat);
  return {chat_id:chat,text:card('✅ Kabinetingiz ulandi',['Natijalar, videolar va mashqlar endi shu yerda.'],'Kerakli bo‘limni pastdagi menyudan tanlang.'),parse_mode:'HTML',reply_markup:botKeyboard};
 }
 async function cleanFiles(){
  // Remove orphaned files after patient/account deletion, allowing active uploads to finish.
  for(const name of await readdir(root).catch(()=>[])){
   if(!/^[a-f0-9-]{36}\.mp4$/.test(name))continue;
   const file=path.join(root,name),s=await stat(file).catch(()=>null);
   if(s&&s.mtimeMs<now()-86400000&&!await db.prepare('SELECT id FROM patient_videos WHERE id=?').get(name.slice(0,-4)))await unlink(file).catch(()=>{});
  }
 }
 let cleanedAt=0;
 async function tick(){
  if(stopped||!enabled)return;
  const acquired=await db.transaction(async()=>{
   await db.prepare('INSERT INTO telegram_state(id) VALUES(?) ON CONFLICT(id) DO NOTHING').run(botId);
   const s=await db.prepare('SELECT * FROM telegram_state WHERE id=?').get(botId);
   if(Number(s.lease_until)>now()&&s.lease_owner!==workerId)return false;
   await db.prepare('UPDATE telegram_state SET lease_owner=?,lease_until=? WHERE id=?').run(workerId,now()+300000,botId);return true;
  });if(!acquired)return;
  try{
   await initialize();
   const s=await db.prepare('SELECT next_update FROM telegram_state WHERE id=?').get(botId);
   const updates=await call('getUpdates',{offset:Number(s.next_update),limit:1,timeout:0,allowed_updates:['message','callback_query']});
   for(const item of updates){
    const reply=await db.transaction(async()=>{
     const current=await db.prepare('SELECT next_update FROM telegram_state WHERE id=?').get(botId);
     if(item.update_id<Number(current.next_update))return;
     const reply=await processUpdate(item);await db.prepare('UPDATE telegram_state SET next_update=? WHERE id=?').run(item.update_id+1,botId);return reply;
    });
    if(item.callback_query)await call('answerCallbackQuery',{callback_query_id:item.callback_query.id}).catch(()=>{});
    if(reply){
     const {_videoId,...payload}=reply;
     if(_videoId){
      try{await call('sendVideo',payload,filename(_videoId));}
      catch{await call('sendMessage',{chat_id:payload.chat_id,text:'Video yuborilmadi. Birozdan so‘ng qayta tanlang yoki logopedga murojaat qiling.'}).catch(()=>{});}
     }else await call('sendMessage',payload).catch(()=>{});
    }
   }
   await db.prepare("UPDATE patient_videos SET state='failed',error='Yuborish yakuni noma’lum. Telegramni tekshirib, kerak bo‘lsa qayta yuboring.' WHERE state='sending' AND updated_at<?").run(now()-600000);
   const video=await db.transaction(async()=>{
    const v=await db.prepare(`SELECT v.*,t.chat_id FROM patient_videos v JOIN patient_telegram t ON t.patient_id=v.patient_id
     JOIN patients p ON p.id=v.patient_id AND p.user_id=v.owner_id JOIN users u ON u.id=v.owner_id
     WHERE v.state='pending' AND t.chat_id IS NOT NULL AND lower(t.username)=lower(p.telegram) AND u.disabled=0 ORDER BY v.created_at LIMIT 1`).get();
    if(v)await db.prepare("UPDATE patient_videos SET state='sending',updated_at=? WHERE id=?").run(now(),v.id);return v;
   });
   if(video){
    try{const sent=await call('sendVideo',{chat_id:video.chat_id,caption:videoCaption(video.title),parse_mode:'HTML',protect_content:true,supports_streaming:true},filename(video.id));
     await db.prepare("UPDATE patient_videos SET state='sent',message_id=?,updated_at=?,error='' WHERE id=?").run(String(sent.message_id),now(),video.id);
    }catch(e){
     if(e.status===403)await db.prepare('DELETE FROM patient_telegram WHERE patient_id=? AND chat_id=?').run(video.patient_id,video.chat_id);
     await db.prepare("UPDATE patient_videos SET state='failed',updated_at=?,error=? WHERE id=?").run(now(),e.status===403?'Bemor botni bloklagan. Qayta ulash kerak.':'Yuborish tasdiqlanmadi. Telegramni tekshiring, zarur bo‘lsa qayta yuboring.',video.id);
    }
   }
   if(now()-cleanedAt>86400000){await cleanFiles();cleanedAt=now();}
  }finally{await db.prepare('UPDATE telegram_state SET lease_until=0 WHERE id=? AND lease_owner=?').run(botId,workerId);}
 }
 function run(){if(pending)return pending;pending=tick().finally(()=>{pending=null});return pending;}
 return {mount,initialize,run,start(){if(!enabled)return;const work=()=>void run().catch(()=>console.error('Telegram: ulanish bajarilmadi; qayta uriniladi.'));work();timer=setInterval(work,5000);timer.unref();},async stop(){stopped=true;clearInterval(timer);abort.abort();await pending?.catch(()=>{});}};
}
