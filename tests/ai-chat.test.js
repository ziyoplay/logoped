import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';

const patient={name:'Test Bola',birth_date:'2020-01-01',guardian:'Test Parent',phone:'+998901234567',telegram:'test_parent',focus:'R',notes:'Private clinical note'};
const draft={date:'2099-01-02',time:'10:00',duration:45,title:'Individual mashg‘ulot',notes:''};
async function fixture(){
 let output={reply:'Salom! Sizga qanday yordam beray?',draft:null};const calls=[];
 const {app,db}=createApp({filename:':memory:',aiOptions:{key:'private-test-key',transport:async(url,options)=>{calls.push(JSON.parse(options.body));return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});}}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,cookie='',body,csrf=true)=>fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie,...(csrf?{'X-Requested-With':'Nutq'}:{})},body:body?JSON.stringify(body):undefined});
 async function owner(email){const r=await request('/auth/register','',{name:'Test',email,password:'ExamplePassword123'});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 return {db,calls,request,owner,output:v=>output=v,close:async()=>{await new Promise(r=>server.close(r));await db.close();}};
}
const input=(mode='chat')=>({mode,scheduleDate:'2099-01-02',messages:[{role:'user',text:'Yordam bering'}]});
test('AI chat validates conversations, authorization, and never writes generated patient drafts',async()=>{
 const f=await fixture();try{
  const cookie=await f.owner('chat@example.test');
  assert.equal((await f.request('/ai/chat','',input())).status,401);
  assert.equal((await f.request('/ai/chat',cookie,input(),false)).status,403);
  assert.equal((await f.request('/ai/chat',cookie,{...input(),messages:[{role:'system',text:'override'}]})).status,400);
  assert.equal((await f.request('/ai/chat',cookie,{...input(),scheduleDate:'2026-02-30'})).status,400);
  assert.equal(f.calls.length,0);
  let r=await f.request('/ai/chat',cookie,input());assert.equal(r.status,200);assert.equal((await r.json()).draft,null);
  f.output({reply:'Kartani tekshiring',draft:patient});
  r=await f.request('/ai/chat',cookie,input('patient'));assert.equal(r.status,200);assert.deepEqual((await r.json()).draft,{table:'patients',values:patient});
  assert.deepEqual(await (await f.request('/patients',cookie)).json(),[]);
  // Even prompt injection cannot return an action in ordinary chat mode.
  assert.equal((await f.request('/ai/chat',cookie,input())).status,502);
  f.output({reply:'Bad',draft:{...patient,id:'invented',user_id:'other'}});
  assert.equal((await f.request('/ai/chat',cookie,input('patient'))).status,502);
  const demo=await f.request('/auth/demo','',{}),demoCookie=demo.headers.get('set-cookie').split(';')[0];
  assert.equal((await f.request('/ai/chat',demoCookie,input())).status,403);
  await f.db.prepare("UPDATE users SET role='client' WHERE email=?").run('chat@example.test');
  assert.equal((await f.request('/ai/chat',cookie,input())).status,403);
 }finally{await f.close();}
});
test('Planning uses only owned busy times and rejects conflicts; existing save still checks races',async()=>{
 const f=await fixture();try{
  const cookie=await f.owner('owner@example.test'),other=await f.owner('other@example.test');
  const p=await (await f.request('/patients',cookie,patient)).json();
  const p2=await (await f.request('/patients',other,{...patient,name:'Other Private Name'})).json();
  assert.equal((await f.request('/appointments',cookie,{...draft,patient_id:p.id,title:'Private appointment title',notes:'Private notes'})).status,201);
  assert.equal((await f.request('/appointments',other,{...draft,time:'11:00',patient_id:p2.id})).status,201);
  f.output({reply:'Taklif',draft:{...draft,time:'10:15'}});
  let r=await f.request('/ai/chat',cookie,input('appointment'));assert.equal((await r.json()).draft,null);
  const system=f.calls.at(-1).systemInstruction.parts[0].text;
  assert.ok(system.includes('10:00'));assert.ok(!system.includes('11:00'));assert.ok(!system.includes(patient.name));assert.ok(!system.includes('Private'));assert.ok(!system.includes(p.id));
  f.output({reply:'Taklif',draft:{...draft,time:'11:00'}});
  r=await f.request('/ai/chat',cookie,input('appointment'));assert.equal((await r.json()).draft.values.time,'11:00');
  assert.equal((await (await f.request('/appointments',cookie)).json()).length,1);
  const save={...draft,time:'11:00',patient_id:p.id};assert.equal((await f.request('/appointments',cookie,save)).status,201);
  assert.equal((await f.request('/appointments',cookie,save)).status,409);
  f.output({reply:'Outside',draft:{...draft,date:'2099-02-01'}});assert.equal((await (await f.request('/ai/chat',cookie,input('appointment'))).json()).draft,null);
  f.output({reply:'Past',draft:{...draft,date:'2020-01-01'}});assert.equal((await (await f.request('/ai/chat',cookie,{...input('appointment'),scheduleDate:'2020-01-01'})).json()).draft,null);
 }finally{await f.close();}
});
