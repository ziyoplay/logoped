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
