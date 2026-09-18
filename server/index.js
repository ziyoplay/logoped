import {createApp} from './app.js';
import {backupManager} from './backups.js';
import {openStorage} from './storage.js';
import {postgresBackupManager} from './postgres-backups.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const filename=path.resolve(process.env.DATABASE_PATH||path.join(root,'data','nutq.sqlite'));
let db;try{db=await openStorage({filename});}catch(error){console.error('Baza ishga tushmadi:',error.code||error.name);process.exit(1);}
const {app}=createApp({database:db});
const backups=(db.kind==='postgres'?postgresBackupManager:backupManager)(db,process.env.BACKUP_DIRECTORY||path.join(path.dirname(filename),'backups'));
app.locals.backups=backups;
const port=Number(process.env.PORT||3001);
const server=app.listen(port,process.env.HOST||'0.0.0.0',()=>{console.log(`Nutq: http://localhost:${port}`);backups.start();app.locals.media.start();});
server.on('error',async error=>{console.error(error.code==='EADDRINUSE'?'Bu port band. Nutq serveri allaqachon ishlayotgan bo‘lishi mumkin.':error.message);await db.close();process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await app.locals.media.stop();await backups.stop();await db.close();process.exit(0);}));
