import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const [sourceArg,targetArg]=process.argv.slice(2);
if(!sourceArg||!targetArg)throw Error('Qo‘llash: node scripts/restore.js zaxira.sqlite yangi-baza.sqlite');
const source=path.resolve(sourceArg),target=path.resolve(targetArg);
if(!existsSync(source))throw Error('Zaxira topilmadi.');
if(source===target||existsSync(target)||existsSync(target+'-wal')||existsSync(target+'-shm'))throw Error('Yangi, mavjud bo‘lmagan fayl nomini tanlang.');
const db=new DatabaseSync(source,{readOnly:true});
try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Zaxira buzilgan.');for(const table of ['users','patients','appointments','results','exercises'])db.prepare('SELECT 1 FROM '+table+' LIMIT 1').get();mkdirSync(path.dirname(target),{recursive:true});await backup(db,target);}finally{db.close();}
const restored=new DatabaseSync(target);try{restored.exec('DELETE FROM sessions');if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='invitations'").get())restored.exec('DELETE FROM invitations');}finally{restored.close();}
console.log('Tiklandi: '+target+'\nServerni to‘xtating va DATABASE_PATH ni shu faylga yo‘naltiring. Barcha foydalanuvchilar qayta kiradi.');
