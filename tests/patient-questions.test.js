import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
import {telegramMenu} from '../server/telegram-menu.js';

test('Patient question, owner reply, delivery, retry, cancellation and revocation',async()=>{
 const fixture=postgresFixture();let updates=[],messages=[],clock=Date.now(),fail=false;
 const transport=async(method,payload)=>{if(method==='getMe')return {username:'nutq_test_bot'};if(method==='getWebhookInfo')return {url:''};if(method==='getUpdates')return updates.filter(u=>u.update_id>=payload.offset);if(method==='sendMessage'){if(fail)throw Error('offline');messages.push(payload);}return {message_id:1};};
 const {app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:'123:questions-fixture',transport,now:()=>clock}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(route,method='GET',body,cookie){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const menu=text=>db.transaction(()=>telegramMenu(db,{chat:'789',username:'parent_test',text,now:clock}));
 try{
  const a=await req('/auth/register','POST',{name:'Doctor',email:'questions@test.example',password:'Password12345'}),b=await req('/auth/register','POST',{name:'Other',email:'qother@test.example',password:'Password12345'});
  const p=(await req('/patients','POST',{name:'Ali <b> & Vali',telegram:'parent_test',birth_date:'2020-01-01'},a.cookie)).body;
  await db.prepare('INSERT INTO patient_telegram(patient_id,chat_id,username) VALUES(?,?,?)').run(p.id,'789','parent_test');
  const prompt=await menu('💬 Logopedga murojaat');assert.match(prompt.text,/Ali &lt;b&gt; &amp; Vali/);assert.equal(prompt.parse_mode,'HTML');
  const msg=(id,text)=>({update_id:id,message:{chat:{id:789,type:'private'},from:{id:789,username:'parent_test'},text}});
  updates=[msg(1,'Uyda qancha mashq qilamiz?')];await app.locals.media.run();assert.match(messages.at(-1).text,/qabul qilindi/);
  await app.locals.media.run();let questions=(await req('/telegram/questions','GET',null,a.cookie)).body;assert.equal(questions.length,1,'Repeated update does not create duplicates');assert.equal(questions[0].body,'Uyda qancha mashq qilamiz?');
  const id=questions[0].id;
  await req('/patients/'+p.id+'/access','POST',{email:'parent-login@example.test',password:'ParentPassword123'},a.cookie);
  const client=await req('/auth/login','POST',{email:'parent-login@example.test',password:'ParentPassword123'});
  assert.equal((await req('/telegram/questions','GET',null,client.cookie)).status,403);
  assert.equal((await req('/telegram/questions/'+id+'/reply','POST',{answer:'Wrong'},client.cookie)).status,403);
  assert.equal((await req('/telegram/questions')).status,401);assert.deepEqual((await req('/telegram/questions','GET',null,b.cookie)).body,[]);
  assert.equal((await req('/telegram/questions/'+id+'/reply','POST',{answer:'Wrong'},b.cookie)).status,409);
  assert.equal((await req('/telegram/questions/'+id+'/reply','POST',{answer:' '},a.cookie)).status,400);
  const answer='Har kuni <b>10</b> daqiqa & dam oling.';
  assert.equal((await req('/telegram/questions/'+id+'/reply','POST',{answer},a.cookie)).status,200);
  assert.equal((await req('/telegram/questions/'+id+'/reply','POST',{answer},a.cookie)).status,409);
  await app.locals.media.run();assert.equal(messages.at(-1).chat_id,'789');assert.match(messages.at(-1).text,/&lt;b&gt;10&lt;\/b&gt;/);assert.equal(messages.at(-1).protect_content,true);
  questions=(await req('/telegram/questions','GET',null,a.cookie)).body;assert.equal(questions[0].state,'sent');const delivered=messages.length;await app.locals.media.run();assert.equal(messages.length,delivered);
  await menu('/murojaat');await menu('/cancel');await menu('Cancelled text');assert.equal((await req('/telegram/questions','GET',null,a.cookie)).body.length,1);
  await menu('/murojaat');assert.match((await menu('x'.repeat(2001))).text,/2000/);clock+=31*60000;assert.match((await menu('Expired')).text,/Vaqt tugadi/);
  const sibling=(await req('/patients','POST',{name:'Sibling',telegram:'parent_test',birth_date:'2021-01-01'},a.cookie)).body;
  await db.prepare('INSERT INTO patient_telegram(patient_id,chat_id,username) VALUES(?,?,?)').run(sibling.id,'789','parent_test');
  const choose=await menu('/murojaat');assert.equal(choose.reply_markup.inline_keyboard.length,2);
  await menu('No patient selected');assert.equal((await req('/telegram/questions','GET',null,a.cookie)).body.length,1);
  await menu('/ask '+p.id);await menu('Ikkinchi savol');const second=(await req('/telegram/questions','GET',null,a.cookie)).body.find(q=>q.state==='new');
  await req('/telegram/questions/'+second.id+'/reply','POST',{answer:'Second answer'},a.cookie);fail=true;await app.locals.media.run();assert.equal((await req('/telegram/questions','GET',null,a.cookie)).body.find(q=>q.id===second.id).state,'failed');fail=false;
  await app.locals.media.run();assert.equal(messages.length,delivered,'Uncertain replies are not automatically resent');
  assert.equal((await req('/telegram/questions/'+second.id+'/retry','POST',{},b.cookie)).status,409);
  assert.equal((await req('/telegram/questions/'+second.id+'/retry','POST',{},a.cookie)).status,200);
  await db.prepare('DELETE FROM patient_telegram WHERE patient_id=?').run(p.id);await app.locals.media.run();assert.equal(messages.length,delivered,'Revoked connection must not receive reply');
  assert.equal((await req('/telegram/questions','GET',null,a.cookie)).body.find(q=>q.id===second.id).state,'failed');
 }finally{await app.locals.media.stop();await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();}
});
