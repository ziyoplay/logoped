import {randomBytes,randomUUID,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {z} from 'zod';
import {appointmentChanged,appointmentSnapshot} from './appointment-notifications.js';

const scope='https://www.googleapis.com/auth/calendar.app.created';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const enc=encodeURIComponent;
const tz='Asia/Tashkent';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:tz}).format(new Date());
const minute=s=>Number(s.slice(0,2))*60+Number(s.slice(3,5));
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;

export function tokenVault(key){
 const bytes=Buffer.from(key||'','base64');
 if(bytes.length!==32)throw Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes');
 return {
  seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',bytes,iv);const body=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');},
  open(value){const b=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',bytes,b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString());}
 };
}

export function googleSlot(event){
 if(event.recurrence||event.recurringEventId)fail(422,'Takrorlanuvchi qabulni alohida tadbir sifatida yarating.');
 if(!event.start?.dateTime||!event.end?.dateTime)fail(422,'Google’da boshlanish va tugash soatini belgilang (butun kun emas).');
 const start=new Date(event.start.dateTime),end=new Date(event.end.dateTime);
 if(!Number.isFinite(+start)||!Number.isFinite(+end))fail(422,'Google tadbirining sanasi noto‘g‘ri.');
 const parts=d=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));
 const a=parts(start),b=parts(end),date=`${a.year}-${a.month}-${a.day}`,last=`${b.year}-${b.month}-${b.day}`;
 const duration=(end-start)/60000;
 const midnightEnd=b.hour==='00'&&b.minute==='00'&&duration<=240&&minute(`${a.hour}:${a.minute}`)+duration===1440;
 if((date!==last&&!midnightEnd)||!Number.isInteger(duration)||duration<5||duration>240||start.getUTCSeconds()||end.getUTCSeconds())fail(422,'Qabul bir kun ichida, 5–240 daqiqa bo‘lishi kerak.');
 return {date,time:`${a.hour}:${a.minute}`,duration};
}
const scheduleOf=a=>JSON.stringify([a.date,a.time,a.duration,a.status==='cancelled']);
const baseSchedule=s=>{const a=JSON.parse(s);return JSON.stringify([a[1],a[2],a[3],a[5]==='cancelled']);};

export function googleCalendar(db,{clientId=process.env.GOOGLE_CLIENT_ID||'',clientSecret=process.env.GOOGLE_CLIENT_SECRET||'',redirectUri=process.env.GOOGLE_REDIRECT_URI||'',encryptionKey=process.env.GOOGLE_TOKEN_ENCRYPTION_KEY||'',transport,now=Date.now}={}){
 let vault;try{vault=tokenVault(encryptionKey);}catch{}
 const configured=!!(clientId&&clientSecret&&vault&&/^https?:\/\//.test(redirectUri));
 const worker=randomUUID();let pending,timer,stopped=false;
 const abort=new AbortController();
 async function request(url,{method='GET',body,token,etag,form=false}={}){
  const options={method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(etag?{'If-Match':etag}:{}),...(body?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json'}:{})},body:body?(form?new URLSearchParams(body).toString():JSON.stringify(body)):undefined};
  if(transport)return transport(url,options);
  const res=await fetch(url,{...options,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(15000)])});
  if(!res.ok)throw Object.assign(new Error('Google request failed'),{status:res.status});
  return res.status===204?{}:res.json();
 }
 async function tokenFor(c){
  const token=vault.open(c.credentials);
  if(token.expires>now()+60000)return token.access_token;
  const fresh=await request('https://oauth2.googleapis.com/token',{method:'POST',form:true,body:{client_id:clientId,client_secret:clientSecret,refresh_token:token.refresh_token,grant_type:'refresh_token'}});
  const encrypted=vault.seal({...token,...fresh,expires:now()+fresh.expires_in*1000});
  await db.prepare('UPDATE calendar_connections SET credentials=? WHERE owner_id=? AND lease_owner=?').run(encrypted,c.owner_id,worker);c.credentials=encrypted;
  return fresh.access_token;
 }
 async function google(c,path,options={}){return request('https://www.googleapis.com/calendar/v3'+path,{...options,token:await tokenFor(c)});}
 const eventPath=(c,id='')=>'/calendars/'+enc(c.calendar_id)+'/events'+(id?'/'+enc(id):'');
 async function validate(owner,row,id=''){
  if(!await db.prepare('SELECT id FROM patients WHERE id=? AND user_id=?').get(row.patient_id,owner))fail(404,'Bemor topilmadi.');
  if(row.status==='cancelled')return;
  const rows=await db.prepare("SELECT time,duration FROM appointments WHERE user_id=? AND therapist_id=? AND date=? AND id<>? AND status<>'cancelled'").all(owner,row.therapist_id,row.date,id);
  if(rows.some(a=>minute(row.time)<minute(a.time)+a.duration&&minute(row.time)+row.duration>minute(a.time)))fail(409,'Bu vaqt band. Google’da boshqa vaqt belgilang.');
 }
 async function applyRemote(c,m,event,force=false){
  await db.transaction(async()=>{
   const a=await db.prepare('SELECT * FROM appointments WHERE id=? AND user_id=?').get(m.appointment_id,c.owner_id);
   if(!a){
    if(force&&event.status!=='cancelled')await db.prepare("UPDATE calendar_events SET appointment_id=NULL,local_snapshot='',etag='',error='' WHERE owner_id=? AND event_id=?").run(c.owner_id,event.id);
    else if(event.status!=='cancelled'&&m.local_snapshot)await db.prepare("UPDATE calendar_events SET error='Qabul saytda o‘chirilgan, Google’da esa o‘zgargan. Versiyani tanlang.' WHERE owner_id=? AND event_id=?").run(c.owner_id,event.id);
    else await db.prepare("UPDATE calendar_events SET local_snapshot='deleted',etag='',error='' WHERE owner_id=? AND event_id=?").run(c.owner_id,event.id);
    return;
   }
   if(event.status==='cancelled'&&a.status==='cancelled'){
    await db.prepare("UPDATE calendar_events SET etag=?,local_snapshot=?,error='' WHERE owner_id=? AND event_id=?").run(event.etag||'',appointmentSnapshot(a),c.owner_id,event.id);return;
   }
   const next=event.status==='cancelled'?{...a,status:'cancelled'}:{...a,...googleSlot(event)};
   const remoteChanged=!m.local_snapshot||m.local_snapshot==='deleted'||baseSchedule(m.local_snapshot)!==scheduleOf(next);
   if(remoteChanged&&!force&&appointmentSnapshot(a)!==m.local_snapshot)fail(409,'Qabul ikkala tomonda o‘zgargan. Saqlanadigan versiyani tanlang.');
   if(remoteChanged||force){
    await validate(c.owner_id,next,a.id);
    await db.prepare('UPDATE appointments SET date=?,time=?,duration=?,status=?,revision=revision+1,updated_by=? WHERE id=? AND user_id=?').run(next.date,next.time,next.duration,next.status,c.owner_id,a.id,c.owner_id);
    const u=await db.prepare('SELECT clinic_id FROM users WHERE id=?').get(c.owner_id);
    await db.prepare('INSERT INTO audit_log(clinic_id,actor_id,action,record_type,record_id) VALUES(?,?,?,?,?)').run(u.clinic_id,c.owner_id,'google_update','appointments',a.id);
    await appointmentChanged(db,a,next,now());
   }
   // A local-only edit remains dirty and is pushed below.
   await db.prepare("UPDATE calendar_events SET etag=?,local_snapshot=?,error='' WHERE owner_id=? AND event_id=?").run(event.etag||'',remoteChanged||force?appointmentSnapshot(next):m.local_snapshot,c.owner_id,event.id);
  });
 }
 async function pull(c){
  let pageToken='',nextToken='',events=[];
  do{
   const params=new URLSearchParams({showDeleted:'true',maxResults:'250',singleEvents:'false',...(c.sync_token?{syncToken:c.sync_token}:{}),...(pageToken?{pageToken}:{})});
   let result;
   try{result=await google(c,eventPath(c)+'?'+params);}catch(e){if(e.status===410&&c.sync_token){c.sync_token='';await db.prepare("UPDATE calendar_connections SET sync_token='' WHERE owner_id=? AND lease_owner=?").run(c.owner_id,worker);return pull(c);}throw e;}
   events.push(...(result.items||[]));pageToken=result.nextPageToken||'';nextToken=result.nextSyncToken||'';
   if(events.length>20000)fail(422,'Taqvim juda katta. Alohida Nutq taqvimidan foydalaning.');
  }while(pageToken);
  for(const event of events){
   const m=await db.prepare('SELECT * FROM calendar_events WHERE owner_id=? AND event_id=?').get(c.owner_id,event.id);
   if(!m){
    if(event.status==='cancelled')continue;
    let error='';try{googleSlot(event);}catch(e){error=e.message;}
    await db.prepare('INSERT INTO calendar_events(owner_id,event_id,remote_event,error) VALUES(?,?,?,?)').run(c.owner_id,event.id,JSON.stringify(event),error);continue;
   }
   await db.prepare('UPDATE calendar_events SET remote_event=? WHERE owner_id=? AND event_id=?').run(JSON.stringify(event),c.owner_id,event.id);
   if(!m.appointment_id){if(event.status==='cancelled')await db.prepare('DELETE FROM calendar_events WHERE owner_id=? AND event_id=?').run(c.owner_id,event.id);else{let error='';try{googleSlot(event);}catch(e){error=e.message;}await db.prepare('UPDATE calendar_events SET error=? WHERE owner_id=? AND event_id=?').run(error,c.owner_id,event.id);}continue;}
   if(m.etag===event.etag||!m.local_snapshot)continue;
   try{await applyRemote(c,m,event);}catch(e){await db.prepare('UPDATE calendar_events SET error=? WHERE owner_id=? AND event_id=?').run(e.status?e.message:'Google qabulini yangilab bo‘lmadi.',c.owner_id,event.id);}
  }
  if(nextToken)await db.prepare('UPDATE calendar_connections SET sync_token=? WHERE owner_id=? AND lease_owner=?').run(nextToken,c.owner_id,worker);
 }
 async function push(c){
  const upcoming=await db.prepare("SELECT * FROM appointments WHERE user_id=? AND date>=? AND status='scheduled'").all(c.owner_id,today());
  for(const a of upcoming)await db.prepare('INSERT INTO calendar_events(owner_id,event_id,appointment_id) VALUES(?,?,?) ON CONFLICT(owner_id,appointment_id) DO NOTHING').run(c.owner_id,'nutq'+a.id.replaceAll('-',''),a.id);
  const mappings=await db.prepare("SELECT * FROM calendar_events WHERE owner_id=? AND appointment_id IS NOT NULL AND error='' ORDER BY event_id").all(c.owner_id);
  for(const m of mappings){
   const a=await db.prepare('SELECT * FROM appointments WHERE id=? AND user_id=?').get(m.appointment_id,c.owner_id);
   if(a&&appointmentSnapshot(a)===m.local_snapshot)continue;
   try{
    if(!a||a.status==='cancelled'){
     if(m.etag)try{await google(c,eventPath(c,m.event_id),{method:'DELETE',etag:m.etag});}catch(e){if(![404,410].includes(e.status))throw e;}
     await db.prepare('UPDATE calendar_events SET local_snapshot=?,etag=? WHERE owner_id=? AND event_id=?').run(a?appointmentSnapshot(a):'deleted','',c.owner_id,m.event_id);continue;
    }
    const p=await db.prepare('SELECT name FROM patients WHERE id=? AND user_id=?').get(a.patient_id,c.owner_id);
    const end=minute(a.time)+a.duration;
    const endDate=end===1440?new Date(Date.parse(a.date+'T00:00:00Z')+86400000).toISOString().slice(0,10):a.date;
    const body={summary:'Qabul · '+p.name,status:'confirmed',start:{dateTime:a.date+'T'+a.time+':00+05:00',timeZone:tz},end:{dateTime:endDate+'T'+time(end%1440)+':00+05:00',timeZone:tz}};
    let saved;
    if(m.etag)saved=await google(c,eventPath(c,m.event_id),{method:'PATCH',etag:m.etag,body});
    else try{saved=await google(c,eventPath(c),{method:'POST',body:{...body,id:m.event_id}});}catch(e){
     if(e.status!==409)throw e;
     // A previous insert may have succeeded before the process stopped.
     saved=await google(c,eventPath(c,m.event_id));
     if(saved.status==='cancelled'||scheduleOf({...googleSlot(saved),status:'scheduled'})!==scheduleOf(a))fail(409,'Google’da boshqa versiya bor. Versiyani tanlang.');
    }
    await db.prepare("UPDATE calendar_events SET etag=?,local_snapshot=?,remote_event=?,error='' WHERE owner_id=? AND event_id=?").run(saved.etag,appointmentSnapshot(a),JSON.stringify(saved),c.owner_id,m.event_id);
   }catch(e){
    if([409,412,404,410].includes(e.status)){
     let remote={};try{remote=await google(c,eventPath(c,m.event_id));}catch{}
     await db.prepare('UPDATE calendar_events SET remote_event=?,error=? WHERE owner_id=? AND event_id=?').run(JSON.stringify(remote),'Qabul ikkala tomonda o‘zgargan yoki o‘chirilgan. Versiyani tanlang.',c.owner_id,m.event_id);
    }else throw e;
   }
  }
 }
 async function syncOwner(owner,action){
  const c=await db.transaction(async()=>{
   const row=await db.prepare('SELECT c.* FROM calendar_connections c JOIN users u ON u.id=c.owner_id WHERE c.owner_id=? AND u.disabled=0').get(owner);
   if(!row||Number(row.lease_until)>now())return;
   await db.prepare('UPDATE calendar_connections SET lease_owner=?,lease_until=? WHERE owner_id=?').run(worker,now()+120000,owner);return row;
  });if(!c)return false;
  const heartbeat=setInterval(()=>void db.prepare('UPDATE calendar_connections SET lease_until=? WHERE owner_id=? AND lease_owner=?').run(now()+120000,owner,worker).catch(()=>{}),20000);
  try{
   if(!c.calendar_id){const calendar=await google(c,'/calendars',{method:'POST',body:{summary:'Nutq — Qabullar',timeZone:tz}});c.calendar_id=calendar.id;await db.prepare('UPDATE calendar_connections SET calendar_id=? WHERE owner_id=? AND lease_owner=?').run(calendar.id,owner,worker);}
   if(action)await action(c);else{await pull(c);await push(c);}
   await db.prepare("UPDATE calendar_connections SET last_sync=?,error='' WHERE owner_id=? AND lease_owner=?").run(now(),owner,worker);return true;
  }catch(e){await db.prepare('UPDATE calendar_connections SET error=? WHERE owner_id=? AND lease_owner=?').run([400,401,403].includes(e.status)?'Google ruxsati tugagan yoki API yoqilmagan. Google’ni qayta ulang.':'Google bilan sinxronlash bajarilmadi. Qayta uriniladi.',owner,worker);if(action)throw e;return false;}
  finally{clearInterval(heartbeat);await db.prepare('UPDATE calendar_connections SET lease_until=0 WHERE owner_id=? AND lease_owner=?').run(owner,worker);}
 }
 function mountPublic(app){
  app.get('/api/google/callback',async(req,res)=>{
   if(!configured)return res.status(503).send('Google Calendar sozlanmagan.');
   const state=typeof req.query.state==='string'?req.query.state:'';
   const flow=await db.transaction(async()=>{
    const f=await db.prepare('SELECT o.* FROM calendar_oauth o JOIN sessions s ON s.token=o.session_token JOIN users u ON u.id=o.owner_id WHERE o.state_hash=? AND o.expires>? AND s.expires>? AND u.disabled=0').get(hash(state),now(),now());
    await db.prepare('DELETE FROM calendar_oauth WHERE state_hash=? OR expires<?').run(hash(state),now());return f;
   });
   if(!flow)return res.status(400).send('Ulash havolasi eskirgan. Kabinetdan qayta ulang.');
   if(req.query.error||typeof req.query.code!=='string')return res.redirect('/?google=cancelled#kirish');
   try{
    const token=await request('https://oauth2.googleapis.com/token',{method:'POST',form:true,body:{client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code:req.query.code,code_verifier:flow.verifier,grant_type:'authorization_code'}});
    if(!token.refresh_token)throw Error('No offline grant');
    if(token.scope&&!token.scope.split(' ').includes(scope))throw Error('Calendar permission missing');
    await db.transaction(async()=>{
     const existing=await db.prepare('SELECT lease_until FROM calendar_connections WHERE owner_id=?').get(flow.owner_id);
     if(existing&&Number(existing.lease_until)>now())fail(409,'Sinxronlash tugashini kuting.');
     // Reauthorization intentionally starts a fresh app calendar: an account switch cannot mix patients with a previous Google account.
     await db.prepare('DELETE FROM calendar_events WHERE owner_id=?').run(flow.owner_id);
     await db.prepare('DELETE FROM calendar_connections WHERE owner_id=?').run(flow.owner_id);
     await db.prepare('INSERT INTO calendar_connections(owner_id,credentials) VALUES(?,?)').run(flow.owner_id,vault.seal({...token,expires:now()+token.expires_in*1000}));
    });
    res.redirect('/?google=connected#kirish');
   }catch{res.redirect('/?google=failed#kirish');}
  });
 }
 function mount(app){
  const owner=req=>{if(req.user.id!==req.ownerId||req.user.demo)fail(403,'Google ulanishini shaxsiy hisob egasi boshqaradi.');};
  app.get('/api/google/status',async(req,res)=>{
   const c=await db.prepare('SELECT calendar_id,last_sync,error,lease_until FROM calendar_connections WHERE owner_id=?').get(req.ownerId);
   const rows=await db.prepare("SELECT event_id,appointment_id,remote_event,error FROM calendar_events WHERE owner_id=? AND (appointment_id IS NULL OR error<>'')").all(req.ownerId);
   const notifications=await db.prepare("SELECT n.id,n.patient_id,n.state,n.error,n.payload FROM appointment_notifications n WHERE owner_id=? AND state IN ('pending','failed') ORDER BY updated_at DESC LIMIT 50").all(req.ownerId);
   res.json({configured,connected:!!c,calendarReady:!!c?.calendar_id,lastSync:Number(c?.last_sync||0),error:c?.error||'',busy:Number(c?.lease_until||0)>now(),redirectUri:configured?redirectUri:'',canManage:req.user.id===req.ownerId&&!req.user.demo,
    events:rows.map(r=>{const e=JSON.parse(r.remote_event);let slot;try{slot=googleSlot(e);}catch{}return {id:r.event_id,appointmentId:r.appointment_id,title:String(e.summary||'Google qabuli').slice(0,150),...slot,error:r.error,cancelled:e.status==='cancelled'};}),notifications:notifications.map(n=>({...n,payload:JSON.parse(n.payload)}))});
  });
  app.post('/api/google/connect',async(req,res)=>{
   owner(req);if(!configured)fail(503,'Serverda Google OAuth sozlamalari kiritilmagan.');
   const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
   await db.prepare('DELETE FROM calendar_oauth WHERE owner_id=? OR expires<?').run(req.ownerId,now());
   await db.prepare('INSERT INTO calendar_oauth(state_hash,owner_id,session_token,verifier,expires) VALUES(?,?,?,?,?)').run(hash(state),req.ownerId,req.user.token,verifier,now()+600000);
   res.json({url:'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope,access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})});
  });
  app.post('/api/google/disconnect',async(req,res)=>{
   owner(req);await db.transaction(async()=>{
    const c=await db.prepare('SELECT lease_until FROM calendar_connections WHERE owner_id=?').get(req.ownerId);if(Number(c?.lease_until)>now())fail(409,'Sinxronlash tugashini kuting.');
    for(const table of ['calendar_connections','calendar_events','calendar_oauth'])await db.prepare('DELETE FROM '+table+' WHERE owner_id=?').run(req.ownerId);
   });res.json({ok:true});
  });
  app.post('/api/google/sync',async(req,res)=>{owner(req);if(!configured)fail(503,'Google sozlanmagan.');const ok=await syncOwner(req.ownerId);res.json({ok});});
  app.post('/api/google/events/:id/link',async(req,res)=>{
   owner(req);if(!configured)fail(503,'Google sozlanmagan.');const patientId=z.uuid().parse(req.body.patient_id);
   const ok=await syncOwner(req.ownerId,async c=>{
    const event=await google(c,eventPath(c,req.params.id));if(event.status==='cancelled')fail(409,'Google qabuli bekor qilingan.');
    const slot=googleSlot(event);
    await db.transaction(async()=>{
     const m=await db.prepare('SELECT * FROM calendar_events WHERE owner_id=? AND event_id=?').get(req.ownerId,event.id);if(!m||m.appointment_id)fail(409,'Qabul allaqachon ulangan yoki topilmadi.');
     const p=await db.prepare("SELECT id FROM patients WHERE id=? AND user_id=? AND status='active'").get(patientId,req.ownerId);if(!p)fail(404,'Faol bemor topilmadi.');
     const a={id:randomUUID(),user_id:req.ownerId,patient_id:patientId,therapist_id:req.ownerId,...slot,title:String(event.summary||'Google qabuli').slice(0,150),status:'scheduled',notes:''};await validate(req.ownerId,a);
     await db.prepare('INSERT INTO appointments(id,user_id,patient_id,therapist_id,date,time,duration,title,status,notes,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(a.id,a.user_id,a.patient_id,a.therapist_id,a.date,a.time,a.duration,a.title,a.status,a.notes,req.user.id);
     await db.prepare('INSERT INTO audit_log(clinic_id,actor_id,action,record_type,record_id) VALUES(?,?,?,?,?)').run(req.user.clinic_id,req.user.id,'google_import','appointments',a.id);
     await db.prepare("UPDATE calendar_events SET appointment_id=?,etag=?,local_snapshot=?,remote_event=?,error='' WHERE owner_id=? AND event_id=?").run(a.id,event.etag,appointmentSnapshot(a),JSON.stringify(event),req.ownerId,event.id);await appointmentChanged(db,null,a,now());
    });
   });if(!ok)fail(409,'Sinxronlash band yoki ulanish yo‘q.');res.json({ok:true});
  });
  app.post('/api/google/events/:id/resolve',async(req,res)=>{
   owner(req);if(!configured)fail(503,'Google sozlanmagan.');const choice=z.enum(['site','google']).parse(req.body.choice);
   const ok=await syncOwner(req.ownerId,async c=>{
    const m=await db.prepare('SELECT * FROM calendar_events WHERE owner_id=? AND event_id=?').get(req.ownerId,req.params.id);if(!m?.appointment_id)fail(404,'Qabul topilmadi.');
    let event;try{event=await google(c,eventPath(c,m.event_id));}catch(e){if([404,410].includes(e.status))event={id:m.event_id,status:'cancelled'};else throw e;}
    if(choice==='google')await applyRemote(c,m,event,true);
    else {
     if(event.status==='cancelled'){
      // Deleted Google IDs cannot be reused. A new deterministic mapping is allocated once.
      await db.prepare("UPDATE calendar_events SET event_id=?,etag='',local_snapshot='',error='' WHERE owner_id=? AND event_id=?").run('nutq'+randomUUID().replaceAll('-',''),req.ownerId,m.event_id);
     }else await db.prepare("UPDATE calendar_events SET etag=?,local_snapshot='',error='' WHERE owner_id=? AND event_id=?").run(event.etag,req.ownerId,m.event_id);
     await push(c);
    }
   });if(!ok)fail(409,'Sinxronlash band yoki ulanish yo‘q.');res.json({ok:true});
  });
  app.post('/api/appointment-notifications/:id/retry',async(req,res)=>{
   const r=await db.prepare("UPDATE appointment_notifications SET state='pending',error='',updated_at=? WHERE id=? AND owner_id=? AND state='failed'").run(now(),req.params.id,req.ownerId);if(!r.changes)fail(404,'Xabar topilmadi.');res.json({ok:true});
  });
 }
 function run(){if(pending)return pending;pending=(async()=>{if(!configured||stopped)return;const rows=await db.prepare('SELECT owner_id FROM calendar_connections').all();for(const c of rows){if(stopped)break;await syncOwner(c.owner_id);}})().finally(()=>pending=null);return pending;}
 return {mount,mountPublic,run,syncOwner,start(){if(!configured)return;const tick=()=>void run().catch(()=>console.error('Google Calendar: sinxronlash bajarilmadi.'));tick();timer=setInterval(tick,60000);timer.unref();},async stop(){stopped=true;clearInterval(timer);abort.abort();await pending?.catch(()=>{});}};
}
