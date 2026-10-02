import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';

test('Recurring appointments are atomic, private, conflict-safe and independently completable',async()=>{
 const fixture=postgresFixture(),{app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:''}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port+'/api';
 async function req(url,method='GET',body,cookie,revision){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...(revision!==undefined?{'If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  const owner=await req('/auth/register','POST',{name:'Logoped',email:'series@test.example',password:'Password12345'});
  const other=await req('/auth/register','POST',{name:'Other',email:'series-other@test.example',password:'Password12345'});
  const patient=(await req('/patients','POST',{name:'Test child',birth_date:'2020-01-01'},owner.cookie)).body;
  const appointment={patient_id:patient.id,date:'2028-02-28',time:'09:00',duration:45,title:'Rejali mashg‘ulot',notes:'Test'};
  const payload={appointment,interval_days:2,count:10};
  assert.equal((await req('/appointments/series','POST',payload)).status,401);
  assert.equal((await req('/appointments/series','POST',payload,other.cookie)).status,404);
  for(const invalid of [{count:0},{count:61},{count:2.5},{interval_days:0},{interval_days:3},{appointment:{...appointment,status:'completed'}},{appointment:{...appointment,date:'2028-02-30'}}])assert.equal((await req('/appointments/series','POST',{...payload,...invalid},owner.cookie)).status,400);
  const result=await req('/appointments/series','POST',payload,owner.cookie);assert.equal(result.status,201);assert.equal(result.body.count,10);
  const rows=result.body.appointments;
  assert.deepEqual(rows.slice(0,3).map(a=>a.date),['2028-02-28','2028-03-01','2028-03-03']);assert.equal(rows[9].date,'2028-03-17');
  assert.equal(new Set(rows.map(a=>a.id)).size,10);assert.ok(rows.every(a=>a.patient_id===patient.id&&a.time==='09:00'&&a.status==='scheduled'));
  assert.equal(Number((await db.prepare('SELECT count(*) AS n FROM appointment_notifications WHERE owner_id=?').get(owner.body.user.id)).n),10);
  assert.equal((await req('/appointments/series','POST',payload,owner.cookie)).status,409,'A retry cannot duplicate the saved course');
  const done=await req('/appointments/'+rows[0].id+'/status','PATCH',{status:'completed'},owner.cookie,rows[0].revision);assert.equal(done.status,200);
  assert.equal((await req('/appointments','GET',null,owner.cookie)).body.filter(a=>a.status==='scheduled').length,9);
  assert.equal((await req('/patients','GET',null,owner.cookie)).body[0].status,'active');
  const occupied={...appointment,date:'2029-01-05',time:'12:00'};
  assert.equal((await req('/appointments','POST',occupied,owner.cookie)).status,201);
  const countBefore=(await req('/appointments','GET',null,owner.cookie)).body.length;
  const noticeBefore=Number((await db.prepare('SELECT count(*) AS n FROM appointment_notifications').get()).n);
  const conflict=await req('/appointments/series','POST',{appointment:{...occupied,date:'2029-01-01'},interval_days:2,count:3},owner.cookie);
  assert.equal(conflict.status,409);assert.match(conflict.body.error,/2029-01-05/);
  assert.equal((await req('/appointments','GET',null,owner.cookie)).body.length,countBefore);
  assert.equal(Number((await db.prepare('SELECT count(*) AS n FROM appointment_notifications').get()).n),noticeBefore);
  const concurrent={appointment:{...appointment,date:'2030-01-01'},interval_days:7,count:3};
  const race=await Promise.all([req('/appointments/series','POST',concurrent,owner.cookie),req('/appointments/series','POST',concurrent,owner.cookie)]);
  assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
  assert.equal((await req('/appointments','GET',null,owner.cookie)).body.length,countBefore+3);
 }finally{await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});

test('A missed session slides the whole remaining plan one step without losing sessions',async()=>{
 const fixture=postgresFixture(),{app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:''}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port+'/api';
 async function req(url,method='GET',body,cookie,revision){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...(revision!==undefined?{'If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const dates=async cookie=>(await req('/appointments','GET',null,cookie)).body.filter(a=>a.status==='scheduled').map(a=>a.date).sort();
 try{
  const owner=await req('/auth/register','POST',{name:'Logoped',email:'missed@test.example',password:'Password12345'});
  const other=await req('/auth/register','POST',{name:'Other',email:'missed-other@test.example',password:'Password12345'});
  const patient=(await req('/patients','POST',{name:'Kelmagan bola',birth_date:'2020-01-01'},owner.cookie)).body;
  const appointment={patient_id:patient.id,date:'2028-02-28',time:'09:00',duration:45,title:'Rejali mashg‘ulot'};
  const plan=(await req('/appointments/series','POST',{appointment,interval_days:2,count:5},owner.cookie)).body.appointments;
  assert.deepEqual(plan.map(a=>a.date),['2028-02-28','2028-03-01','2028-03-03','2028-03-05','2028-03-07']);
  const first=plan[0];
  assert.equal((await req('/appointments/'+first.id+'/missed','POST',{},undefined,first.revision)).status,401);
  assert.equal((await req('/appointments/'+first.id+'/missed','POST',{},other.cookie,first.revision)).status,404);
  assert.equal((await req('/appointments/'+first.id+'/missed','POST',{},owner.cookie,first.revision+7)).status,409);
  assert.deepEqual(await dates(owner.cookie),plan.map(a=>a.date),'A rejected attempt must not move anything');
  const moved=await req('/appointments/'+first.id+'/missed','POST',{},owner.cookie,first.revision);
  assert.equal(moved.status,200);assert.deepEqual(moved.body,{moved:5,date:'2028-03-01',last:'2028-03-09',step:2});
  // Reja bir pog‘ona suriladi: seanslar soni o‘sha-o‘sha, ritm saqlanadi.
  assert.deepEqual(await dates(owner.cookie),['2028-03-01','2028-03-03','2028-03-05','2028-03-07','2028-03-09']);
  const rows=(await req('/appointments','GET',null,owner.cookie)).body;
  assert.equal(rows.find(a=>a.id===first.id).date,'2028-03-01','The missed session keeps its identity and Google event');
  const marker=rows.filter(a=>a.status==='cancelled');
  assert.equal(marker.length,1);assert.equal(marker[0].date,'2028-02-28');assert.equal(marker[0].time,'09:00');assert.equal(marker[0].notes,'Bemor kelmadi.');
  // Ota-onaga 5 ta xabar emas, faqat kelishi kerak bo‘lgan kun haqida bitta xabar.
  const pending=await db.prepare("SELECT appointment_id FROM appointment_notifications WHERE owner_id=? AND state='pending'").all(owner.body.user.id);
  assert.deepEqual(pending.map(n=>n.appointment_id),[first.id]);
  assert.equal((await req('/appointments/'+marker[0].id+'/missed','POST',{},owner.cookie,marker[0].revision)).status,400,'Only a scheduled session can slide');
  // Oxirgi kun band bo‘lsa, hech narsa surilmaydi.
  const blocked=(await req('/patients','POST',{name:'Boshqa bola',birth_date:'2020-02-02'},owner.cookie)).body;
  assert.equal((await req('/appointments','POST',{...appointment,patient_id:blocked.id,date:'2028-03-11',time:'09:00'},owner.cookie)).status,201);
  const next=(await req('/appointments','GET',null,owner.cookie)).body.find(a=>a.id===first.id);
  const refused=await req('/appointments/'+first.id+'/missed','POST',{},owner.cookie,next.revision);
  assert.equal(refused.status,409);assert.match(refused.body.error,/2028-03-11, 09:00 band/);
  assert.deepEqual(await dates(owner.cookie),['2028-03-01','2028-03-03','2028-03-05','2028-03-07','2028-03-09','2028-03-11']);
  // Yolg‘iz qabul: ritm oldingi seansdan olinadi.
  const lone=(await req('/appointments','POST',{...appointment,date:'2031-03-17',time:'11:00'},owner.cookie)).body;
  assert.equal((await req('/appointments','POST',{...appointment,date:'2031-03-10',time:'11:00',status:'completed'},owner.cookie)).status,201);
  const slid=await req('/appointments/'+lone.id+'/missed','POST',{},owner.cookie,lone.revision);
  assert.deepEqual(slid.body,{moved:1,date:'2031-03-24',last:'2031-03-24',step:7});
 }finally{await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});
