import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';

test('Removed contact feature exposes no routes or commands and sends no queued replies',async()=>{
 const fixture=postgresFixture();let updates=[],messages=[],commands=[];
 const transport=async(method,payload)=>{if(method==='getMe')return {username:'nutq_test_bot'};if(method==='getWebhookInfo')return {url:''};if(method==='getUpdates')return updates.filter(u=>u.update_id>=payload.offset);if(method==='sendMessage')messages.push(payload);if(method==='setMyCommands')commands=payload.commands;return {message_id:1};};
 const {app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:'123:removed-feature-fixture',transport}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(route,method='GET',body,cookie){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  const a=await req('/auth/register','POST',{name:'Doctor',email:'removed-contact@test.example',password:'Password12345'});
  const p=(await req('/patients','POST',{name:'Ali',telegram:'parent_test',birth_date:'2020-01-01'},a.cookie)).body;
  await db.prepare('INSERT INTO patient_telegram(patient_id,chat_id,username) VALUES(?,?,?)').run(p.id,'789','parent_test');
  const owner=(await db.prepare('SELECT user_id FROM patients WHERE id=?').get(p.id)).user_id,id=randomUUID();
  await db.prepare("INSERT INTO patient_questions(id,patient_id,owner_id,chat_id,telegram,body,answer,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'pending',?,?)").run(id,p.id,owner,'789','parent_test','Old question','Old answer',Date.now(),Date.now());
  await db.prepare('INSERT INTO telegram_question_drafts(chat_id,patient_id,expires) VALUES(?,?,?)').run('789',p.id,Date.now()+60000);
  assert.equal((await req('/telegram/questions','GET',null,a.cookie)).status,404);
  assert.equal((await req('/telegram/questions/'+id+'/reply','POST',{answer:'New answer'},a.cookie)).status,404);
  assert.equal((await req('/telegram/questions/'+id+'/retry','POST',{},a.cookie)).status,404);
  await app.locals.media.run();assert.equal(messages.length,0,'Previously queued contact replies remain unsent');
  assert.ok(commands.every(c=>!['murojaat','cancel'].includes(c.command)));
  let updateId=0;
  for(const text of ['/murojaat','💬 Logopedga murojaat','Another question']){
   updates=[{update_id:++updateId,message:{chat:{id:789,type:'private'},from:{id:789,username:'parent_test'},text}}];await app.locals.media.run();
   const reply=messages.at(-1);assert.match(reply.text,/Natijalarim/);assert.doesNotMatch(JSON.stringify(reply.reply_markup),/murojaat/);
  }
  assert.equal(Number((await db.prepare('SELECT count(*) AS n FROM patient_questions').get()).n),1,'Old draft must not capture new questions');
  assert.equal((await db.prepare('SELECT answer FROM patient_questions WHERE id=?').get(id)).answer,'Old answer','Historical records remain intact');
 }finally{await app.locals.media.stop();await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});
