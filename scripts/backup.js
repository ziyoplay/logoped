import {openPostgres} from '../server/storage.js';
import {postgresBackupManager} from '../server/postgres-backups.js';
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=process.env.BACKUP_DIRECTORY||path.join(root,'data','backups');
if(process.env.DATABASE_URL){const db=await openPostgres();try{const manager=postgresBackupManager(db,directory);console.log('Zaxira saqlandi: '+await manager.run())}finally{await db.close()}}
else{const source=process.env.DATABASE_PATH||path.join(root,'data','nutq.sqlite');if(!existsSync(source))throw Error('Baza topilmadi.');mkdirSync(directory,{recursive:true});const target=path.join(directory,'nutq-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');const db=new DatabaseSync(source,{readOnly:true});try{await backup(db,target);console.log('Zaxira saqlandi: '+target)}finally{db.close()}}
