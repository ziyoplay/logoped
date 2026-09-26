import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
import {openPostgres} from '../server/storage.js';

test('Course and session completion stay separate, retain history, and enforce ownership and revisions',async()=>{
 const fixture=postgresFixture(),{app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:''}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api';
 async function req(url,method='GET',body,cookie,revision){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...(revision!==undefined?{'If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  const owner=await req('/auth/register','POST',{name:'Iroda',email:'status-owner@test.example',password:'Password12345'}),other=await req('/auth/register','POST',{name:'Other',email:'status-other@test.example',password:'Password12345'});
  const p=(await req('/patients','POST',{name:'Test child',birth_date:'2020-01-01'},owner.cookie)).body;
  const a=(await req('/appointments','POST',{patient_id:p.id,date:'2099-01-01',time:'10:00',duration:30,title:'Session',notes:'PRIVATE'},owner.cookie)).body;
  await req('/results','POST',{patient_id:p.id,date:'2026-01-01',score:80,notes:'Progress'},owner.cookie);
  await req('/patients/'+p.id+'/access','POST',{email:'status-parent@test.example',password:'ParentPassword123'},owner.cookie);
  const client=await req('/auth/login','POST',{email:'status-parent@test.example',password:'ParentPassword123'});
  const path='/patients/'+p.id+'/status',session='/appointments/'+a.id+'/status';
  assert.equal((await req(path,'PATCH',{status:'completed'})).status,401);
  assert.equal((await req(path,'PATCH',{status:'completed'},other.cookie,p.revision)).status,404);
  assert.equal((await req(path,'PATCH',{status:'completed'},client.cookie,p.revision)).status,403);
  assert.equal((await req(path,'PATCH',{status:'unknown'},owner.cookie,p.revision)).status,400);
  assert.equal((await req(path,'PATCH',{status:'completed'},owner.cookie)).status,409);
  let done=await req(session,'PATCH',{status:'completed'},owner.cookie,a.revision);assert.equal(done.status,200);assert.equal(done.body.status,'completed');assert.equal(done.body.notes,'PRIVATE');
  assert.equal((await req('/patients','GET',null,owner.cookie)).body[0].status,'active','Completing one session does not finish the course');
  assert.equal((await req(session,'PATCH',{status:'scheduled'},owner.cookie,a.revision)).status,409,'Old writes cannot undo current changes');
  const same=await req(session,'PATCH',{status:'completed'},owner.cookie,done.body.revision);assert.equal(same.body.revision,done.body.revision,'A repeat must not create another revision');
  assert.equal(Number((await db.prepare("SELECT count(*) AS n FROM appointment_notifications WHERE appointment_id=? AND state='pending'").get(a.id)).n),0,'Completion removes obsolete pending booking messages');
  let restored=await req(session,'PATCH',{status:'scheduled'},owner.cookie,done.body.revision);assert.equal(restored.status,200);
  done=await req(path,'PATCH',{status:'completed'},owner.cookie,p.revision);assert.equal(done.status,200);assert.equal(done.body.status,'completed');
  const overview=(await req('/client/overview','GET',null,client.cookie)).body;
  assert.equal(overview.patient.status,'completed');assert.equal(overview.results[0].score,80);assert.equal(overview.appointments[0].status,'scheduled','Course completion does not silently cancel a booked appointment');assert.ok(!JSON.stringify(overview).includes('PRIVATE'));
  restored=await req(path,'PATCH',{status:'active'},owner.cookie,done.body.revision);assert.equal(restored.status,200);assert.equal(restored.body.status,'active');
  const full=await req('/patients/'+p.id,'PUT',{name:p.name,birth_date:p.birth_date,status:'completed'},owner.cookie,restored.body.revision);assert.equal(full.status,200,'Existing editor also accepts completed');
  assert.equal((await req('/results','GET',null,owner.cookie)).body.length,1);
  assert.ok(Number((await db.prepare("SELECT count(*) AS n FROM audit_log WHERE action='update_status' AND record_id=?").get(p.id)).n)>=2);
 }finally{await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});

test('PostgreSQL upgrades the old patient status constraint without losing records',{skip:process.env.NUTQ_TEST_POSTGRES!=='1'},async()=>{
 const fixture=postgresFixture();let db=await fixture.open();
 try{
  await db.exec("INSERT INTO users(id,name,email,password) VALUES('owner','Test','migration@test.example','fixture'); INSERT INTO patients(id,user_id,name,birth_date,status) VALUES('child','owner','Child','2020-01-01','archived'); ALTER TABLE patients DROP CONSTRAINT patients_status_check; ALTER TABLE patients ADD CONSTRAINT patients_status_check CHECK(status IN ('active','archived')); DELETE FROM schema_migrations WHERE version=6;");
  await db.close();db=await openPostgres({schema:fixture.schema});
  assert.equal((await db.prepare("SELECT status FROM patients WHERE id='child'").get()).status,'archived');
  await db.prepare("UPDATE patients SET status='completed' WHERE id='child'").run();
  await assert.rejects(db.prepare("UPDATE patients SET status='unknown' WHERE id='child'").run());
  await db.close();db=await openPostgres({schema:fixture.schema});
  assert.equal((await db.prepare("SELECT status FROM patients WHERE id='child'").get()).status,'completed');
 }finally{await db.close();await fixture.cleanup();}
});
