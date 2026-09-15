import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
import {readSnapshot,writeSnapshot,restoreSnapshot} from '../server/postgres-backups.js';
test('PostgreSQL concurrent writes and full snapshot restore',{skip:process.env.NUTQ_TEST_POSTGRES!=='1'},async()=>{
 const source=postgresFixture(),target=postgresFixture(),db=await source.open(),restored=await target.open();const {app}=createApp({database:db});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;const dir=await mkdtemp(path.join(tmpdir(),'nutq-pg-backup-'));let cookie;
 async function request(route,method='GET',body,headers={}){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...(cookie?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};}
 try{const user=await request('/auth/register','POST',{name:'PG Test',email:'pg-test@example.test',password:'TestPostgres12345'});assert.equal(user.status,200);
 const p=await request('/patients','POST',{name:'PG Patient',birth_date:'2020-01-01'});assert.equal(p.status,201);
 const values={patient_id:p.body.id,date:'2026-12-20',time:'12:00',duration:45,title:'Concurrent visit'};
 const simultaneous=await Promise.all([request('/appointments','POST',values),request('/appointments','POST',values)]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[201,409]);
 const edits=await Promise.all(['A','B'].map(name=>request('/patients/'+p.body.id,'PUT',{...p.body,name},{'If-Match':'0'})));assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
 const filename=await writeSnapshot(db,dir),snapshot=await readSnapshot(filename);await restoreSnapshot(restored,snapshot);
 assert.equal(Number((await restored.prepare('SELECT count(*) AS n FROM users').get()).n),1);assert.equal(Number((await restored.prepare('SELECT count(*) AS n FROM appointments').get()).n),1);assert.equal(Number((await restored.prepare('SELECT count(*) AS n FROM sessions').get()).n),0);
 await assert.rejects(()=>restoreSnapshot(restored,snapshot),/bo‘sh/);
 const archive=JSON.parse(await readFile(filename,'utf8'));archive.data.tables.users[0].name='tampered';const changed=path.join(dir,'tampered.json');await writeFile(changed,JSON.stringify(archive));await assert.rejects(()=>readSnapshot(changed),/xeshi/);
 }finally{await new Promise(r=>server.close(r));await db.close();await restored.close();await source.cleanup();await target.cleanup();await rm(dir,{recursive:true,force:true});}
});
