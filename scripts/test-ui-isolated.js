import {createApp} from '../server/app.js';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const directory=await mkdtemp(path.join(tmpdir(),'nutq-ui-media-'));
const {app,db}=createApp({filename:':memory:',mediaOptions:{directory,token:'123:ui-fixture',transport:async(method)=>method==='getMe'?{username:'nutq_test_bot'}:method==='getWebhookInfo'?{url:''}:method==='getUpdates'?[]:{message_id:1}}});
await app.locals.media.initialize();
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try{
 const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,PLAYWRIGHT_BASE_URL:'http://127.0.0.1:'+server.address().port}});
 process.exitCode=await new Promise((resolve,reject)=>{child.once('exit',code=>resolve(code??1));child.once('error',reject);});
}finally{await new Promise(r=>server.close(r));await db.close();await rm(directory,{recursive:true,force:true});}
