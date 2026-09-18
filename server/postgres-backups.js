import {createHash} from 'node:crypto';
import {mkdir,readdir,rename,rm,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
export const snapshotTables=['users','clinics','patients','exercises','appointments','results','sessions','invitations','audit_log','client_accounts','patient_exercises','patient_telegram','patient_videos'];
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function snapshot(db){return db.transaction(async()=>{const tables={};for(const table of snapshotTables)tables[table]=await db.prepare('SELECT * FROM '+table+(['patients','exercises','appointments','results'].includes(table)?' ORDER BY created_order':table==='audit_log'?' ORDER BY id':'')).all();return {schemaVersion:3,createdAt:new Date().toISOString(),tables};},{isolation:'repeatable read'});}
export async function writeSnapshot(db,directory){await mkdir(directory,{recursive:true});const data=await snapshot(db);const archive={format:'nutq-postgres-backup-v1',sha256:digest(data),data};
 const target=path.join(directory,'nutq-pg-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');const partial=target+'.partial';try{await writeFile(partial,JSON.stringify(archive),{mode:0o600,flag:'wx'});await readSnapshot(partial);await rename(partial,target);return target}catch(e){await rm(partial,{force:true}).catch(()=>{});throw e;}}
export async function readSnapshot(filename){const archive=JSON.parse(await readFile(filename,'utf8'));if(archive.format!=='nutq-postgres-backup-v1'||![1,2,3].includes(archive.data?.schemaVersion)||archive.sha256!==digest(archive.data))throw Error('Zaxira formati yoki nazorat xeshi noto‘g‘ri.');if(archive.data.schemaVersion===1){archive.data.tables.client_accounts=[];archive.data.tables.patient_exercises=[];}if(archive.data.schemaVersion<3){archive.data.tables.patient_telegram=[];archive.data.tables.patient_videos=[];}for(const table of snapshotTables)if(!Array.isArray(archive.data.tables[table]))throw Error('Zaxira jadvali yetishmaydi: '+table);return archive.data;}
export async function restoreSnapshot(db,data){
 if(!db.schema.startsWith('nutq_restore_')&&!db.schema.startsWith('nutq_test_'))throw Error('Tiklash uchun nutq_restore_ bilan boshlanuvchi yangi schema tanlang.');
 await db.transaction(async()=>{
  for(const table of snapshotTables)if(Number((await db.prepare('SELECT count(*) AS n FROM '+table).get()).n)!==0)throw Error('Tiklash faqat bo‘sh jadvallarga ruxsat etiladi.');
  for(const table of snapshotTables){if(['sessions','invitations','patient_telegram'].includes(table))continue;
   const metadata=await db.prepare('SELECT column_name,is_identity FROM information_schema.columns WHERE table_schema=? AND table_name=?').all(db.schema,table);const columns=metadata.filter(c=>c.is_identity==='NO').map(c=>c.column_name);
   for(const original of (data.tables[table]||[])){const row=table==='patient_videos'?{...original,state:original.state==='sent'?'sent':'failed',error:original.state==='sent'?'':'Zaxiradan tiklangan. Telegramni tekshirib, qayta yuboring.'}:original;const keys=Object.keys(row).filter(k=>columns.includes(k));if(!keys.length)throw Error('Zaxira qatori noto‘g‘ri.');await db.prepare('INSERT INTO '+table+'('+keys.map(k=>'"'+k+'"').join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));}
  }
 });
}
export function postgresBackupManager(db,directory,{intervalMs=6*60*60*1000,retain=30}={}){
 const state={lastSuccess:null,lastError:null,running:false,engine:'postgres'};let timer,pending;
 async function run(){if(pending)return pending;pending=(async()=>{state.running=true;try{const file=await writeSnapshot(db,directory);state.lastSuccess=new Date().toISOString();state.lastError=null;
   const files=(await readdir(directory)).filter(f=>/^nutq-pg-\d{4}-.*\.json$/.test(f)).sort();for(const f of files.slice(0,Math.max(0,files.length-retain)))await rm(path.join(directory,f));return file;
  }catch(e){state.lastError='PostgreSQL zaxirasi olinmadi. Baza ulanishi va zaxira papkasini tekshiring.';console.error('PostgreSQL backup:',e.code||e.name);throw e;}finally{state.running=false;pending=null;}})();return pending;}
 return {status:()=>({...state}),run,start(){void run().catch(()=>{});timer=setInterval(()=>void run().catch(()=>{}),intervalMs);timer.unref();},async stop(){clearInterval(timer);await pending?.catch(()=>{});}};
}
