import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';

test('Patient video authorization, private Telegram pairing, delivery, retry and revocation',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'nutq-videos-')),fixture=postgresFixture();let updates=[],sent=[],replies=[],failSend=false,clock=Date.now();
 const transport=async(method,payload)=>{if(method==='sendMessage'){replies.push(payload);return {message_id:1};}if(method==='getMe')return {username:'nutq_test_bot'};if(method==='getWebhookInfo')return {url:''};if(method==='getUpdates')return updates.filter(u=>u.update_id>=payload.offset);if(method==='sendVideo'){if(failSend)throw Error('offline');sent.push(payload);return {message_id:42};}return {message_id:1};};
 const {app,db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:'123:fixture',directory,transport,now:()=>clock}});
 await app.locals.media.initialize();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(route,method='GET',body,cookie,headers={}){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...headers},body:body?(Buffer.isBuffer(body)?body:JSON.stringify(body)):undefined});const type=r.headers.get('content-type');return {status:r.status,body:type?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer()),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const mp4=Buffer.from('000000186674797069736f6d0000000069736f6d6d703432','hex');
 try{
  const a=await req('/auth/register','POST',{name:'Logoped',email:'video-owner@test.example',password:'OwnerPassword123'}),b=await req('/auth/register','POST',{name:'Other',email:'other-owner@test.example',password:'OwnerPassword123'});
  const p=await req('/patients','POST',{name:'Video Bemor',telegram:'https://t.me/parent_test',birth_date:'2020-01-01'},a.cookie);assert.equal(p.body.telegram,'parent_test');
  assert.equal((await req('/patients','POST',{name:'Bad',telegram:'../../private',birth_date:'2020-01-01'},a.cookie)).status,400);
  const url='/patients/'+p.body.id;
  assert.equal((await req(url+'/media','GET')).status,401);assert.equal((await req(url+'/media','GET',null,b.cookie)).status,404);
  assert.equal((await req(url+'/videos?title=Invalid','POST',Buffer.from('not mp4'),a.cookie,{'Content-Type':'video/mp4'})).status,400);
  assert.equal((await req(url+'/videos?title=Wrongtype','POST',{},a.cookie)).status,415);
  const video=await req(url+'/videos?title=Uy%20mashqi','POST',mp4,a.cookie,{'Content-Type':'video/mp4'});assert.equal(video.status,201);
  assert.equal((await req(url+'/videos/'+video.body.id,'GET',null,b.cookie)).status,404);assert.deepEqual((await req(url+'/videos/'+video.body.id,'GET',null,a.cookie)).body,mp4);
  await app.locals.media.run();assert.equal(sent.length,0,'Unlinked patient must not receive video');
  const link=await req(url+'/telegram-link','POST',{},a.cookie);assert.equal(link.status,200);const secret=new URL(link.body.url).searchParams.get('start');
  const stored=await db.prepare('SELECT token_hash FROM patient_telegram WHERE patient_id=?').get(p.body.id);assert.notEqual(stored.token_hash,secret);
  const message=(id,type,username='parent_test',text='/start '+secret)=>({update_id:id,message:{chat:{id:789,type},from:{id:789,username},text}});
  updates=[message(1,'group')];await app.locals.media.run();assert.equal(sent.length,0);
  updates=[message(2,'private','stranger_test')];await app.locals.media.run();assert.equal(sent.length,0);
  updates=[message(3,'private')];await app.locals.media.run();assert.equal(sent.length,1);assert.equal(sent[0].chat_id,'789');assert.equal(sent[0].caption,'Uy mashqi');assert.equal(sent[0].protect_content,true);
  await app.locals.media.run();assert.equal(sent.length,1,'Delivered videos must not send again');
  let media=await req(url+'/media','GET',null,a.cookie);assert.equal(media.body.connected,true);assert.equal(media.body.videos[0].state,'sent');assert.equal(JSON.stringify(media.body).includes(secret),false);
  const second=await req(url+'/videos?title=Ikkinchi','POST',mp4,a.cookie,{'Content-Type':'video/mp4'});failSend=true;await app.locals.media.run();assert.equal((await req(url+'/media','GET',null,a.cookie)).body.videos.find(v=>v.id===second.body.id).state,'failed');
  failSend=false;await app.locals.media.run();assert.equal(sent.length,1,'Ambiguous failures require explicit retry');
  assert.equal((await req(url+'/videos/'+second.body.id+'/retry','POST',{},b.cookie)).status,404);
  assert.equal((await req(url+'/videos/'+second.body.id+'/retry','POST',{},a.cookie)).status,200);await app.locals.media.run();assert.equal(sent.length,2);
  updates=[message(4,'private','parent_test','/stop')];await app.locals.media.run();assert.equal((await req(url+'/media','GET',null,a.cookie)).body.connected,false);
  updates=[message(5,'private')];await app.locals.media.run();assert.equal((await req(url+'/media','GET',null,a.cookie)).body.connected,false,'Used link cannot be replayed');
  const newLink=await req(url+'/telegram-link','POST',{},a.cookie);clock+=25*3600000;updates=[message(6,'private','parent_test','/start '+new URL(newLink.body.url).searchParams.get('start'))];await app.locals.media.run();assert.equal((await req(url+'/media','GET',null,a.cookie)).body.connected,false,'Expired links cannot connect');
  const before=(await req(url+'/media','GET',null,a.cookie)).body;
  assert.equal((await req(url+'/telegram','PATCH',{telegram:'@new_parent'},b.cookie,{'If-Match':String(before.patientRevision)})).status,404);
  assert.equal((await req(url+'/telegram','PATCH',{telegram:'bad'},a.cookie,{'If-Match':String(before.patientRevision)})).status,400);
  assert.equal((await req(url+'/telegram','PATCH',{telegram:'@new_parent'},a.cookie,{'If-Match':'-1'})).status,409);
  assert.equal((await req(url+'/telegram','PATCH',{telegram:'@new_parent'},a.cookie,{'If-Match':String(before.patientRevision)})).status,200);
  const after=(await req(url+'/media','GET',null,a.cookie)).body;assert.equal(after.telegram,'new_parent');assert.equal(after.patientRevision,before.patientRevision+1);assert.equal(after.connected,false);
  assert.equal(await db.prepare('SELECT patient_id FROM patient_telegram WHERE patient_id=?').get(p.body.id),undefined);
  assert.equal((await req(url+'/videos/'+video.body.id,'DELETE',null,b.cookie)).status,404);assert.equal((await req(url+'/videos/'+video.body.id,'DELETE',null,a.cookie)).status,200);assert.equal((await req(url+'/videos/'+video.body.id,'GET',null,a.cookie)).status,404);
  const menuLink=await req(url+'/telegram-link','POST',{},a.cookie);
  updates=[message(7,'private','new_parent','/start '+new URL(menuLink.body.url).searchParams.get('start'))];await app.locals.media.run();
  assert.ok(replies.at(-1).reply_markup.keyboard);
  const callback=(id,chat=789)=>({update_id:id,callback_query:{id:'query-'+id,from:{id:chat,username:'new_parent'},message:{chat:{id:chat,type:'private'}},data:'video:'+second.body.id}});
  updates=[callback(8)];await app.locals.media.run();assert.equal(sent.length,3);assert.equal(sent.at(-1).caption,'Ikkinchi');
  updates=[callback(9,999)];await app.locals.media.run();assert.equal(sent.length,3,'A forwarded callback must not reveal the video');
  updates=[message(10,'private','new_parent','/stop')];await app.locals.media.run();
  updates=[callback(11)];await app.locals.media.run();assert.equal(sent.length,3,'Old video buttons must stop working after unlink');

 }finally{await app.locals.media.stop();await new Promise(r=>server.close(r));await db.close();await fixture.cleanup();await rm(directory,{recursive:true,force:true});}
});
