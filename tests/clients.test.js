import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
import {snapshot,restoreSnapshot} from '../server/postgres-backups.js';

test('Logoped provisions isolated client accounts, exercises, reset and revocation',async()=>{
 const fixture=postgresFixture(),{app,db}=createApp({filename:':memory:',database:await fixture.open()});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(route,method='GET',body,cookie,headers={}){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  const a=await req('/auth/register','POST',{name:'Logoped',email:'staff@clients.test',password:'StaffPassword123'}),b=await req('/auth/register','POST',{name:'Other',email:'other@clients.test',password:'StaffPassword123'});
  const patient=await req('/patients','POST',{name:'Client Child',birth_date:'2020-01-01',guardian:'Client Parent',notes:'PRIVATE patient notes'},a.cookie),other=await req('/patients','POST',{name:'Other Child',birth_date:'2020-01-01'},b.cookie);
  const path='/patients/'+patient.body.id;
  const exercise=await req('/exercises','POST',{title:'My assigned exercise',category:'Talaffuz',duration:10,instructions:'Shared instructions'},a.cookie),hidden=await req('/exercises','POST',{title:'Not assigned',category:'Talaffuz',duration:10,instructions:'Not shared'},a.cookie),foreign=await req('/exercises','POST',{title:'Other owner',category:'Talaffuz',duration:10,instructions:'Other owner'},b.cookie);
  assert.equal((await req(path+'/access','POST',{email:'client@clients.test',password:'ClientPassword123'},b.cookie)).status,404);
  const created=await req(path+'/access','POST',{email:'client@clients.test',password:'ClientPassword123'},a.cookie);assert.equal(created.status,201);assert.equal(created.body.account.password,undefined);
  assert.equal((await req(path+'/access','POST',{email:'again@clients.test',password:'ClientPassword123'},a.cookie)).status,409);
  assert.equal((await req(path+'/access','GET',undefined,b.cookie)).status,404);
  assert.equal((await req(path+'/exercises','POST',{exercise_id:foreign.body.id},a.cookie)).status,404);
  assert.equal((await req(path+'/exercises','POST',{exercise_id:exercise.body.id,note:'Parent instructions'},a.cookie)).status,201);
  assert.equal((await req(path+'/exercises','POST',{exercise_id:exercise.body.id},a.cookie)).status,409);
  await req('/appointments','POST',{patient_id:patient.body.id,date:'2026-12-20',time:'11:00',duration:45,title:'My visit',notes:'PRIVATE appointment notes'},a.cookie);
  await req('/results','POST',{patient_id:patient.body.id,date:'2026-12-20',score:80,exercise_id:exercise.body.id,notes:'Shared progress'},a.cookie);
  let client=await req('/auth/login','POST',{email:'client@clients.test',password:'ClientPassword123'});assert.equal(client.status,200);assert.equal(client.body.user.role,'client');
  const view=await req('/client/overview','GET',undefined,client.cookie);assert.equal(view.status,200);assert.equal(view.body.patient.name,'Client Child');assert.equal(view.body.exercises.length,1);assert.equal(view.body.exercises[0].title,'My assigned exercise');assert.equal(view.body.results[0].score,80);assert.equal(view.body.appointments.length,1);
  assert.ok(!JSON.stringify(view.body).includes('PRIVATE'));assert.ok(!JSON.stringify(view.body).includes('Other Child'));assert.ok(!JSON.stringify(view.body).includes(hidden.body.id));
  for(const route of ['/patients','/exercises','/appointments','/results','/export','/backup-status','/team',path+'/access','/patients/'+other.body.id+'/access'])assert.equal((await req(route,'GET',undefined,client.cookie)).status,403,route);
  assert.equal((await req('/patients','POST',{name:'Injected',birth_date:'2020-01-01'},client.cookie)).status,403);
  assert.equal((await req('/me','PATCH',{name:'Escalation'},client.cookie)).status,403);
  assert.equal((await req('/client/overview','GET',undefined,a.cookie)).status,403);
  assert.equal((await req('/password','POST',{current:'ClientPassword123',password:'ChangedPassword123'},client.cookie)).status,200);
  assert.equal((await req(path+'/access','PATCH',{password:'ResetPassword123'},a.cookie)).status,200);
  assert.equal((await req('/client/overview','GET',undefined,client.cookie)).status,401);
  assert.equal((await req('/auth/login','POST',{email:'client@clients.test',password:'ChangedPassword123'})).status,401);
  client=await req('/auth/login','POST',{email:'client@clients.test',password:'ResetPassword123'});assert.equal(client.status,200);
  assert.equal((await req(path+'/access','PATCH',{disabled:true},a.cookie)).status,200);
  assert.equal((await req('/client/overview','GET',undefined,client.cookie)).status,401);
  assert.equal((await req('/auth/login','POST',{email:'client@clients.test',password:'ResetPassword123'})).status,401);
  await req(path+'/access','PATCH',{disabled:false},a.cookie);assert.equal((await req('/auth/login','POST',{email:'client@clients.test',password:'ResetPassword123'})).status,200);
  if(db.kind==='postgres'){
   const target=postgresFixture(),restored=await target.open();try{await restoreSnapshot(restored,await snapshot(db));assert.equal(Number((await restored.prepare('SELECT count(*) n FROM client_accounts').get()).n),1);assert.equal(Number((await restored.prepare('SELECT count(*) n FROM patient_exercises').get()).n),1);}finally{await restored.close();await target.cleanup();}
  }
  const access=await req(path+'/access','GET',undefined,a.cookie);
  assert.equal((await req(path+'/exercises/'+access.body.exercises[0].id,'DELETE',undefined,a.cookie)).status,200);
  client=await req('/auth/login','POST',{email:'client@clients.test',password:'ResetPassword123'});
  assert.equal((await req('/client/overview','GET',undefined,client.cookie)).body.exercises.length,0);
  assert.equal((await req(path,'DELETE',undefined,a.cookie,{'If-Match':'0'})).status,409);
  assert.equal((await req(path+'/access','GET',undefined,a.cookie)).body.account.id,created.body.account.id);
  const empty=await req('/patients','POST',{name:'No history',birth_date:'2020-01-01'},a.cookie);
  const emptyPath='/patients/'+empty.body.id;
  assert.equal((await req(emptyPath+'/access','POST',{email:'remove@clients.test',password:'RemovePassword123'},a.cookie)).status,201);
  const remove=await req('/auth/login','POST',{email:'remove@clients.test',password:'RemovePassword123'});
  assert.equal((await req(emptyPath,'DELETE',undefined,a.cookie,{'If-Match':'0'})).status,200);
  assert.equal((await req('/client/overview','GET',undefined,remove.cookie)).status,401);
  assert.equal((await req('/auth/login','POST',{email:'remove@clients.test',password:'RemovePassword123'})).status,401);
 }finally{await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});
