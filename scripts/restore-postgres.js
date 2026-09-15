import pg from 'pg';
import {openPostgres} from '../server/storage.js';
import {readSnapshot,restoreSnapshot} from '../server/postgres-backups.js';
const [filename,schema]=process.argv.slice(2);
if(!process.env.DATABASE_URL||!filename||!/^nutq_restore_[a-z0-9_]{1,45}$/.test(schema||''))throw Error('Qo‘llash: npm run restore:postgres -- zaxira.json nutq_restore_yangi');
const data=await readSnapshot(filename);
// CREATE (without IF NOT EXISTS) makes accidental overwrite impossible.
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
try{await client.connect();await client.query('CREATE SCHEMA "'+schema+'"')}finally{await client.end()}
const db=await openPostgres({schema});try{await restoreSnapshot(db,data);console.log('Tiklandi: '+schema+'. DATABASE_SCHEMA ni shu nomga o‘zgartirib serverni qayta ishga tushiring. Hisoblarga qayta kirish kerak.')}finally{await db.close()}
