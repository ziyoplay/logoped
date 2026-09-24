import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createApp} from '../server/app.js';
import {tokenVault,googleSlot} from '../server/google-calendar.js';
import {deliverAppointmentNotification} from '../server/appointment-notifications.js';

test('Google time conversion and encrypted credentials reject malformed input',()=>{
 const vault=tokenVault(randomBytes(32).toString('base64')),secret={refresh_token:'test-private-token'};
 const stored=vault.seal(secret);assert.ok(!stored.includes(secret.refresh_token));assert.deepEqual(vault.open(stored),secret);
 assert.throws(()=>tokenVault('invalid'));assert.throws(()=>vault.open(stored.slice(0,-5)+'aaaaa'));
 assert.deepEqual(googleSlot({start:{dateTime:'2026-10-01T04:00:00Z'},end:{dateTime:'2026-10-01T04:45:00Z'}}),{date:'2026-10-01',time:'09:00',duration:45});
 assert.deepEqual(googleSlot({start:{dateTime:'2026-10-01T23:30:00+05:00'},end:{dateTime:'2026-10-02T00:00:00+05:00'}}),{date:'2026-10-01',time:'23:30',duration:30});
 assert.throws(()=>googleSlot({start:{date:'2026-10-01'},end:{date:'2026-10-02'}}));
 assert.throws(()=>googleSlot({start:{dateTime:'2026-10-01T04:00:00Z'},end:{dateTime:'2026-10-01T04:45:00Z'},recurrence:['RRULE:FREQ=DAILY']}));
});

test('Google OAuth, two-way schedule, conflicts, patient binding, Telegram queue and catalog isolation',async()=>{
 const key=randomBytes(32).toString('base64');let version=1,requests=[],events=new Map(),expiredSync=false;
 const remote=(id,time='09:00')=>({id,etag:'"'+version+++'"',summary:'Test appointment',start:{dateTime:'2099-10-01T'+time+':00+05:00'},end:{dateTime:'2099-10-01T'+time.slice(0,2)+':45:00+05:00'}});
 const transport=async(url,options)=>{
  requests.push({url,...options});const u=new URL(url),body=options.body?JSON.parse(options.headers['Content-Type']==='application/json'?options.body:'{}'):{};
  if(u.hostname==='oauth2.googleapis.com')return {access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,scope:'https://www.googleapis.com/auth/calendar.app.created'};
  if(u.pathname.endsWith('/calendars'))return {id:'test-calendar'};
  if(u.pathname.endsWith('/events')){
   if(options.method==='POST'){if(events.has(body.id))throw {status:409};const saved={...body,etag:'"'+version+++'"'};events.set(body.id,saved);return saved;}
   if(expiredSync&&u.searchParams.has('syncToken')){expiredSync=false;throw {status:410};}
   return {items:[...events.values()],nextSyncToken:'test-sync-'+version};
  }
  const id=decodeURIComponent(u.pathname.split('/').at(-1)),e=events.get(id);if(!e)throw {status:404};
  if(options.method==='GET')return e;
  if(options.headers['If-Match']&&options.headers['If-Match']!==e.etag)throw {status:412};
  if(options.method==='DELETE'){const saved={id,status:'cancelled',etag:'"'+version+++'"'};events.set(id,saved);return {};}
  const saved={...e,...body,etag:'"'+version+++'"'};events.set(id,saved);return saved;
 };
 const {app,db}=createApp({filename:':memory:',mediaOptions:{token:''},calendarOptions:{clientId:'test-id',clientSecret:'test-secret',redirectUri:'https://example.test/api/google/callback',encryptionKey:key,transport}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,{cookie,method='GET',body,revision}={})=>{const r=await fetch(base+'/api'+path,{method,redirect:'manual',headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{cookie}:{}),...(revision!==undefined?{'If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text(),cookie:r.headers.get('set-cookie')?.split(';')[0],location:r.headers.get('location')};};
 try{
  const reg=await request('/auth/register',{method:'POST',body:{name:'Calendar Test',email:'calendar@example.test',password:'testpassword123'}}),cookie=reg.cookie,owner=reg.data.user.id;
  const other=await request('/auth/register',{method:'POST',body:{name:'Other Test',email:'othercalendar@example.test',password:'testpassword123'}});
  assert.equal((await request('/google/status')).status,401);
  const auth=await request('/google/connect',{cookie,method:'POST'});assert.equal(auth.status,200);const authUrl=new URL(auth.data.url),state=authUrl.searchParams.get('state');
  assert.equal(authUrl.searchParams.get('scope'),'https://www.googleapis.com/auth/calendar.app.created');assert.ok(authUrl.searchParams.get('code_challenge'));
  assert.equal((await request('/google/callback?code=fake&state=wrong')).status,400);
  assert.equal((await request('/google/callback?code=fake&state='+state)).location,'/?google=connected#kirish');
  assert.equal((await request('/google/callback?code=fake&state='+state)).status,400,'state is single-use');
  const stored=await db.prepare('SELECT credentials FROM calendar_connections WHERE owner_id=?').get(owner);assert.ok(!stored.credentials.includes('test-refresh'));
  const p=(await request('/patients',{cookie,method:'POST',body:{name:'Calendar <patient>',birth_date:'2020-01-01',telegram:'parent_test'}})).data;
  const q=(await request('/patients',{cookie:other.cookie,method:'POST',body:{name:'Other patient',birth_date:'2020-01-01'}})).data;
  let a=(await request('/appointments',{cookie,method:'POST',body:{patient_id:p.id,date:'2099-10-01',time:'09:00',duration:45,title:'Session',notes:'Do not send clinical notes'}})).data;
  await app.locals.calendar.run();const id='nutq'+a.id.replaceAll('-','');assert.ok(events.has(id));assert.ok(!JSON.stringify(events.get(id)).includes('clinical'));
  assert.equal((await request('/google/status',{cookie:other.cookie})).data.connected,false);
  await app.locals.calendar.run();assert.equal(requests.filter(r=>r.method==='POST'&&r.url.endsWith('/events')).length,1,'no duplicate event');
  events.set(id,remote(id,'10:00'));await app.locals.calendar.run();a=(await request('/appointments',{cookie})).data.find(x=>x.id===a.id);assert.equal(a.time,'10:00');assert.equal(a.revision,1);
  let queue=await db.prepare("SELECT * FROM appointment_notifications WHERE state='pending'").all();assert.equal(queue.length,1,'older pending notice superseded');assert.equal(JSON.parse(queue[0].payload).time,'10:00');
  const messages=[];await deliverAppointmentNotification(db,async(...args)=>messages.push(args));assert.equal(messages.length,0,'never guess recipient from username');
  await db.prepare('INSERT INTO patient_telegram(patient_id,chat_id,username) VALUES(?,?,?)').run(p.id,'123','wrong_parent');
  await deliverAppointmentNotification(db,async(...args)=>messages.push(args));assert.equal(messages.length,0);
  await db.prepare('UPDATE patient_telegram SET username=? WHERE patient_id=?').run('parent_test',p.id);
  await deliverAppointmentNotification(db,async(...args)=>{messages.push(args);return {message_id:1};});assert.equal(messages.length,1);assert.equal(messages[0][1].chat_id,'123');assert.match(messages[0][1].text,/10:00/);assert.match(messages[0][1].text,/Calendar &lt;patient&gt;/);
  await app.locals.calendar.run();await deliverAppointmentNotification(db,async(...args)=>messages.push(args));assert.equal(messages.length,1,'echo does not send duplicate');
  a=(await request('/appointments/'+a.id,{cookie,method:'PUT',revision:a.revision,body:{...a,time:'11:00'}})).data;events.set(id,remote(id,'12:00'));await app.locals.calendar.run();
  let s=(await request('/google/status',{cookie})).data;assert.equal(s.events.length,1);assert.match(s.events[0].error,/ikkala/);assert.equal((await request('/appointments',{cookie})).data[0].time,'11:00');assert.equal(events.get(id).start.dateTime.slice(11,16),'12:00');
  assert.equal((await request('/google/events/'+id+'/resolve',{cookie,method:'POST',body:{choice:'google'}})).status,200);a=(await request('/appointments',{cookie})).data[0];assert.equal(a.time,'12:00');
  expiredSync=true;await app.locals.calendar.run();assert.equal((await request('/appointments',{cookie})).data.length,1,'410 reset preserves local records');
  events.set('fromgoogle',remote('fromgoogle','14:00'));await app.locals.calendar.run();s=(await request('/google/status',{cookie})).data;assert.equal(s.events.find(e=>e.id==='fromgoogle').appointmentId,null);
  assert.equal((await request('/google/events/fromgoogle/link',{cookie,method:'POST',body:{patient_id:q.id}})).status,404);
  assert.equal((await request('/google/events/fromgoogle/link',{cookie,method:'POST',body:{patient_id:p.id}})).status,200);
  assert.equal((await request('/google/events/fromgoogle/link',{cookie,method:'POST',body:{patient_id:p.id}})).status,409);
  const count=(await request('/appointments',{cookie})).data.length;await app.locals.calendar.run();assert.equal((await request('/appointments',{cookie})).data.length,count);
  events.set(id,remote(id,'14:00'));await app.locals.calendar.run();
  assert.equal((await request('/appointments',{cookie})).data.find(x=>x.id===a.id).time,'12:00','remote overlap cannot corrupt local schedule');
  assert.match((await request('/google/status',{cookie})).data.events.find(e=>e.id===id).error,/band/);
  assert.equal((await request('/google/events/'+id+'/resolve',{cookie,method:'POST',body:{choice:'site'}})).status,200);assert.equal(events.get(id).start.dateTime.slice(11,16),'12:00');
  events.set(id,{id,status:'cancelled',etag:'"'+version+++'"'});await app.locals.calendar.run();assert.equal((await request('/appointments',{cookie})).data.find(x=>x.id===a.id).status,'cancelled');
  const catalog=(await request('/exercise-catalog',{cookie})).data;assert.equal(catalog.length,8);assert.ok(catalog.every(e=>e.source.url.startsWith('https://')));
  const ex=await request('/exercise-catalog/'+catalog[0].id+'/import',{cookie,method:'POST'});assert.equal(ex.status,200);assert.match(ex.data.instructions,/Manba:/);assert.equal((await request('/exercise-catalog/'+catalog[0].id+'/import',{cookie,method:'POST'})).data.id,ex.data.id);
  assert.equal((await request('/exercises',{cookie})).data.length,1);assert.equal((await request('/exercises',{cookie:other.cookie})).data.length,0);
  assert.equal((await request('/google/disconnect',{cookie,method:'POST'})).status,200);assert.equal((await request('/appointments',{cookie})).data.length,count);assert.equal((await request('/google/status',{cookie})).data.connected,false);
 }finally{await app.locals.calendar.stop();await new Promise(r=>server.close(r));await db.close();}
});
