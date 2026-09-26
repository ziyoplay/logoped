import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
import {normalizePhone} from '../server/telegram-access.js';
import {openDatabase} from '../server/db.js';

test('Phone contact pairing requires a private patient link and own matching contact; revocation blocks delivery',async()=>{
 const fixture=postgresFixture(),directory=await mkdtemp(path.join(tmpdir(),'nutq-phone-'));
 let updates=[],clock=Date.now(),id=0;const sent=[],videos=[];
 const transport=async(method,payload)=>{
  if(method==='getMe')return {username:'nutq_test_bot'};
  if(method==='getWebhookInfo')return {url:''};
  if(method==='getUpdates')return updates.filter(u=>u.update_id>=payload.offset);
  if(method==='sendMessage')sent.push(payload);
  if(method==='sendVideo')videos.push(payload);
  return {message_id:1};
 };
 const {app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:'987:fixture',directory,transport,now:()=>clock}});
 await app.locals.media.initialize();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port+'/api';let cookie;
 async function req(url,method='GET',body,headers={}){
  const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...headers},body:body?(Buffer.isBuffer(body)?body:JSON.stringify(body)):undefined});
  return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 const message=async(fields={},chat=789)=>{updates=[{update_id:++id,message:{chat:{id:chat,type:'private'},from:{id:chat},...fields}}];await app.locals.media.run();};
 const contact=(phone,user_id=789)=>({contact:{phone_number:phone,user_id,first_name:'Parent'}});
 const linked=async(patient)=>(await req('/patients/'+patient+'/media')).body.connected;
 const link=async(patient)=>new URL((await req('/patients/'+patient+'/telegram-link','POST',{})).body.url).searchParams.get('start');
 try{
  cookie=(await req('/auth/register','POST',{name:'Owner',email:'phone-owner@test.example',password:'OwnerPassword123'})).cookie;
  const p=(await req('/patients','POST',{name:'Phone patient',birth_date:'2020-01-01',phone:'90 123 45 67'})).body;
  assert.equal(p.phone,'+998901234567');assert.equal(p.telegram,'');
  const sibling=(await req('/patients','POST',{name:'Sibling',birth_date:'2020-01-01',phone:p.phone})).body;
  const mp4=Buffer.from('000000186674797069736f6d0000000069736f6d6d703432','hex');
  await req('/patients/'+p.id+'/videos?title=Practice','POST',mp4,{'Content-Type':'video/mp4'});
  await req('/appointments','POST',{patient_id:p.id,date:'2099-01-01',time:'10:00',duration:30,title:'Phone appointment',status:'scheduled'});
  await message(contact(p.phone));assert.equal(await linked(p.id),false,'Phone alone must never discover a patient');
  let secret=await link(p.id);
  await message({text:'/start '+secret,chat:{id:789,type:'group'}});assert.equal(await linked(p.id),false);
  await message({text:'/start '+secret});assert.equal(sent.at(-1).reply_markup.keyboard[0][0].request_contact,true);
  await message(contact(p.phone,999));assert.equal(await linked(p.id),false,'Forwarded contacts cannot authorize');
  await message(contact('+998909999999'));assert.equal(await linked(p.id),false);
  assert.equal(videos.length,0);
  await message(contact('998901234567'));assert.equal(await linked(p.id),true,'No username is required');
  assert.equal(await linked(sibling.id),false,'Same phone does not link another patient without its private link');
  assert.equal(videos.length,1);assert.equal(videos[0].chat_id,'789');
  assert.ok(sent.some(m=>m.text.includes('Phone appointment')),'Verified phone receives appointment notification');
  await message({text:'/qabul',from:{id:789,username:'changed_username'}});assert.match(sent.at(-1).text,/Phone appointment/);
  await message({text:'/start '+secret},999);await message(contact(p.phone,999),999);assert.equal((await db.prepare('SELECT chat_id FROM patient_telegram WHERE patient_id=?').get(p.id)).chat_id,'789','Consumed link cannot be replayed');
  await message({text:'/qabul'},999);assert.doesNotMatch(sent.at(-1).text,/Phone appointment/);
  const saved=(await req('/patients/'+p.id,'PUT',{name:p.name,birth_date:p.birth_date,phone:'+998909999999'},{'If-Match':String(p.revision)}));assert.equal(saved.status,200);
  assert.equal(await linked(p.id),false,'Changing card phone revokes old chat');
  await message({text:'/qabul'});assert.doesNotMatch(sent.at(-1).text,/Phone appointment/);
  secret=await link(p.id);await message({text:'/start '+secret});
  await link(p.id);await message(contact('+998909999999'));assert.equal(await linked(p.id),false,'Regenerating link invalidates pending contact');
  secret=await link(p.id);await message({text:'/start '+secret});clock+=16*60000;
  await message(contact('+998909999999'));assert.equal(await linked(p.id),false,'Contact prompt expires');
  await message({text:'/start '+secret});await message({text:'/stop'});await message(contact('+998909999999'));assert.equal(await linked(p.id),false,'Stop cancels pending pairing');
  await message({text:'/start '+secret});await message(contact('+998909999999'));assert.equal(await linked(p.id),true);
  await message({text:'/stop'});assert.equal(await linked(p.id),false);
  secret=await link(p.id);clock+=25*3600000;await message({text:'/start '+secret});await message(contact('+998909999999'));assert.equal(await linked(p.id),false,'Expired link cannot pair');
 }finally{await app.locals.media.stop();await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();await rm(directory,{recursive:true,force:true});}
});

test('Phone normalization and additive migration preserve existing Telegram links',async()=>{
 assert.equal(normalizePhone('(90) 123-45-67'),'+998901234567');assert.equal(normalizePhone('+44 7700 900123'),'+447700900123');assert.equal(normalizePhone('call123456789'),'');
 const directory=await mkdtemp(path.join(tmpdir(),'nutq-migrate-')),filename=path.join(directory,'old.sqlite');let db;
 try{
  db=openDatabase(filename);db.exec("ALTER TABLE patient_telegram DROP COLUMN verified_phone; INSERT INTO users(id,name,email,password) VALUES('owner','Test','test@test.example','x'); INSERT INTO patients(id,user_id,name,birth_date,telegram) VALUES('patient','owner','Patient','2020-01-01','parent_test'); INSERT INTO patient_telegram(patient_id,chat_id,username) VALUES('patient','123','parent_test');");db.close();
  db=openDatabase(filename);const link=db.prepare('SELECT * FROM patient_telegram').get();assert.equal(link.chat_id,'123');assert.equal(link.verified_phone,'');
 }finally{db?.close();await rm(directory,{recursive:true,force:true});}
});
