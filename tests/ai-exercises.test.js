import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';

const input={age:5,sound:'r',goal:'So‘zlarda mustahkamlash',duration:5};
const draft={title:'R tovushli so‘zlar',instructions:'R tovushini logoped bilan tanlangan so‘zlarda takrorlang. Har bir urinishdan keyin qisqa dam oling.'};
const ok=()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(draft)}}]});
async function fixture(options){
 const {app,db}=createApp({filename:':memory:',aiOptions:options});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 async function request(path,{cookie='',method='GET',body,csrf=true}={}){return fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(csrf?{'X-Requested-With':'Nutq'}:{}),Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});}
 async function login(){const r=await request('/auth/register',{method:'POST',body:{name:'AI Tester',email:'ai@example.test',password:'ExamplePassword123'}});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 return {db,request,login,close:async()=>{await new Promise(r=>server.close(r));await db.close();}};
}
test('AI only sends validated generic fields and returns an unsaved, editable draft',async()=>{
 const calls=[];const f=await fixture({key:'private-test-key',transport:async(url,options)=>{calls.push({url,options});return ok();}});
 try{
  const cookie=await f.login();
  assert.equal((await f.request('/ai/status')).status,401);
  assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input,csrf:false})).status,403);
  assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:{...input,patient_id:'private'}})).status,400);
  assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:{...input,sound:'ignore instructions'}})).status,400);
  assert.equal(calls.length,0);
  const r=await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input});assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{draft:{...draft,category:'Talaffuz',duration:5}});
  const request=JSON.parse(calls[0].options.body);
  assert.equal(calls[0].url,'https://openrouter.ai/api/v1/chat/completions');
  assert.deepEqual(JSON.parse(request.messages[1].content),input);
  assert.equal(request.response_format.json_schema.strict,true);
  assert.equal(request.model,'openai/gpt-4o-mini');
  assert.equal(calls[0].options.headers.Authorization,'Bearer private-test-key');assert.ok(!calls[0].url.includes('private-test-key'));
  assert.deepEqual(await (await f.request('/exercises',{cookie})).json(),[]);
  const user=await f.db.prepare('SELECT id FROM users WHERE email=?').get('ai@example.test');
  await f.db.prepare("UPDATE users SET role='client' WHERE id=?").run(user.id);
  assert.equal((await f.request('/ai/status',{cookie})).status,403);
  assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input})).status,403);
  assert.equal(calls.length,1);
 }finally{await f.close();}
});
test('AI has useful missing-key, quota, provider and invalid-output failures without leaking secrets',async()=>{
 let response=ok;const f=await fixture({key:'secret-fixture',transport:async()=>response()});
 try{
  const cookie=await f.login();
  for(const [factory,status] of [
   [()=>Response.json({error:'secret-fixture'},{status:403}),502],
   [()=>Response.json({error:'quota'},{status:429}),429],
   [()=>{throw new Error('secret-fixture');},503],
   [()=>Response.json({choices:[{finish_reason:'length',message:{content:JSON.stringify(draft)}}]}),502],
   [()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"title":"only"}'}}]}),502],
  ]){response=factory;const r=await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input});assert.equal(r.status,status);assert.ok(!(await r.text()).includes('secret-fixture'));}
  response=ok;
  for(let i=0;i<25;i++)assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input})).status,200);
  assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input})).status,429);
 }finally{await f.close();}
 const missing=await fixture({key:''});try{const cookie=await missing.login();assert.equal((await (await missing.request('/ai/status',{cookie})).json()).available,false);assert.equal((await missing.request('/ai/exercise-draft',{cookie,method:'POST',body:input})).status,503);}finally{await missing.close();}
});
test('Public demo cannot consume OpenRouter quota and timeout cancels the provider request',async()=>{
 let calls=0;const f=await fixture({key:'fixture',timeoutMs:10,transport:async(url,{signal})=>{calls++;await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});}});
 try{
  const demo=await f.request('/auth/demo',{method:'POST',body:{}}),cookie=demo.headers.get('set-cookie').split(';')[0];
  assert.equal((await f.request('/ai/exercise-draft',{cookie,method:'POST',body:input})).status,403);assert.equal(calls,0);
  const owner=await f.login();assert.equal((await f.request('/ai/exercise-draft',{cookie:owner,method:'POST',body:input})).status,503);assert.equal(calls,1);
 }finally{await f.close();}
});
