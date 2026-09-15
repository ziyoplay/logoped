import {backup,DatabaseSync} from 'node:sqlite';
import {mkdir,readdir,rename,rm,stat} from 'node:fs/promises';
import path from 'node:path';
export function backupManager(db,directory,{intervalMs=6*60*60*1000,retain=30}={}){
 const state={lastSuccess:null,lastError:null,running:false};let timer,pending;
 async function list(){await mkdir(directory,{recursive:true});return (await readdir(directory)).filter(f=>/^nutq-\d{4}-.*\.sqlite$/.test(f)).sort();}
 async function run(){if(pending)return pending;pending=(async()=>{state.running=true;let partial;
  try{const files=await list();if(files.length&&!state.lastSuccess){const info=await stat(path.join(directory,files.at(-1)));state.lastSuccess=info.mtime.toISOString();}
   const target=path.join(directory,'nutq-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');partial=target+'.partial';await (db.exclusive?db.exclusive(()=>backup(db.native,partial)):backup(db,partial));
   const check=new DatabaseSync(partial,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Zaxira yaxlitligi tekshiruvdan o‘tmadi');}finally{check.close();}
   await rename(partial,target);partial=null;state.lastSuccess=new Date().toISOString();state.lastError=null;
   const saved=await list();for(const file of saved.slice(0,Math.max(0,saved.length-retain)))await rm(path.join(directory,file));return {...state,running:false};
  }catch(e){state.lastError='Zaxira nusxa olinmadi. Disk joyi va papkaga yozish ruxsatini tekshiring.';console.error('Backup failed:',e.message);throw e;}finally{if(partial)await rm(partial,{force:true}).catch(()=>{});state.running=false;pending=null;}
 })();return pending;}
 return {status:()=>({...state}),run,start(){void run().catch(()=>{});timer=setInterval(()=>void run().catch(()=>{}),intervalMs);timer.unref();},async stop(){clearInterval(timer);await pending?.catch(()=>{});}};
}
