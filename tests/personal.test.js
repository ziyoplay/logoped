import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
test('Default personal mode isolates accounts and disables team invitations',async()=>{
 const fixture=postgresFixture();const {app,db}=createApp({filename:':memory:',database:await fixture.open()});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(route,method='GET',body,cookie){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{const a=await req('/auth/register','POST',{name:'Personal A',email:'a@personal.test',password:'PersonalPassword123'}),b=await req('/auth/register','POST',{name:'Personal B',email:'b@personal.test',password:'PersonalPassword123'});assert.equal(a.status,200);assert.equal(b.status,200);
 assert.equal((await req('/team','GET',undefined,a.cookie)).status,404);assert.equal((await req('/team/invites','POST',{email:'x@personal.test'},a.cookie)).status,404);
 const p=await req('/patients','POST',{name:'Personal Patient',birth_date:'2020-01-01'},a.cookie);assert.equal(p.status,201);assert.equal((await req('/patients','GET',undefined,b.cookie)).body.length,0);
 const ap={patient_id:p.body.id,date:'2026-12-01',time:'09:00',duration:45,title:'Personal visit',therapist_id:b.body.user.id};const saved=await req('/appointments','POST',ap,a.cookie);assert.equal(saved.status,201);assert.equal(saved.body.therapist_id,a.body.user.id);assert.equal((await req('/appointments','POST',{...ap,time:'09:15'},a.cookie)).status,409);
 const exported=await req('/export','GET',undefined,a.cookie);assert.equal(exported.status,200);assert.equal(exported.body.patients.length,1);assert.equal(exported.body.team,undefined);
 assert.equal((await req('/auth/register','POST',{name:'Invited',email:'i@personal.test',password:'PersonalPassword123',invite:'unused'})).status,400);
 }finally{await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});
