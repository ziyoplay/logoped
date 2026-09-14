import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.env.DATABASE_PATH||path.join(root,'data','nutq.sqlite');
if(!existsSync(source))throw new Error('Baza topilmadi. Avval ilovani ishga tushiring.');
const directory=process.env.BACKUP_DIRECTORY||path.join(path.dirname(path.resolve(source)),'backups');mkdirSync(directory,{recursive:true});
const target=path.join(directory,'nutq-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,target);console.log('Zaxira saqlandi: '+target);}finally{db.close();}
