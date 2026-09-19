import {AsyncLocalStorage} from 'node:async_hooks';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {openDatabase} from './db.js';

// SQLite calls retain their original SQL; PostgreSQL uses the same small query contract.
export function sqliteStorage(native){
 const context=new AsyncLocalStorage();let tail=Promise.resolve();
 async function exclusive(work){if(context.getStore())return work();const previous=tail;let release;tail=new Promise(r=>{release=r});await previous;try{return await context.run(true,work)}finally{release()}}
 const db={kind:'sqlite',native,exclusive,prepare(sql){return {get:(...p)=>exclusive(()=>native.prepare(sql).get(...p)),all:(...p)=>exclusive(()=>native.prepare(sql).all(...p)),run:(...p)=>exclusive(()=>native.prepare(sql).run(...p))}},
  exec:sql=>exclusive(()=>native.exec(sql)),transaction:work=>exclusive(async()=>{native.exec('BEGIN IMMEDIATE');try{const result=await work();native.exec('COMMIT');return result}catch(e){native.exec('ROLLBACK');throw e}}),
  close:()=>exclusive(()=>native.close()),health:()=>exclusive(()=>native.prepare('SELECT 1').get())};return db;
}
export function postgresSQL(sql){
 let n=0;return sql.replace(/'(?:''|[^'])*'|\?/g,token=>token==='?'?'$'+(++n):token)
 .replace(/\browid\b/g,'created_order')
 .replace("datetime('now','-7 days')", "to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - INTERVAL '7 days','YYYY-MM-DD HH24:MI:SS')")
 .replace(/(\$\d+) IS NULL/g,'$1::text IS NULL');
}
export async function openPostgres({connectionString=process.env.DATABASE_URL,schema=process.env.DATABASE_SCHEMA||'nutq'}={}){
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(schema)||['public','pg_catalog','information_schema'].includes(schema))throw Error('DATABASE_SCHEMA uchun nutq kabi alohida nom kiriting.');
 const pool=new pg.Pool({connectionString,options:'-c search_path='+schema+',pg_catalog',max:5,connectionTimeoutMillis:8000,idleTimeoutMillis:30000,statement_timeout:20000,application_name:'nutq'});
 pool.on('error',e=>console.error('PostgreSQL pool:',e.code||'connection error'));
 const context=new AsyncLocalStorage();
 const query=(sql,p=[])=> (context.getStore()||pool).query(postgresSQL(sql),p);
 const db={kind:'postgres',schema,pool,prepare(sql){return {get:async(...p)=>(await query(sql,p)).rows[0],all:async(...p)=>(await query(sql,p)).rows,run:async(...p)=>({changes:(await query(sql,p)).rowCount})}},
  exec:sql=>query(sql),async transaction(work,{isolation}={}){if(context.getStore())return work();const client=await pool.connect();try{await client.query(isolation==='repeatable read'?'BEGIN ISOLATION LEVEL REPEATABLE READ':'BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['nutq:'+schema]);const result=await context.run(client,work);await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}},
  health:()=>query('SELECT 1'),close:()=>pool.end()};
 try{await db.transaction(async()=>{await poolSchema(db,schema)});return db}catch(e){await pool.end();throw e;}
}
async function poolSchema(db,schema){
 await db.exec('CREATE SCHEMA IF NOT EXISTS "'+schema+'"');
 const sql=await readFile(new URL('./postgres.sql',import.meta.url),'utf8');await db.exec(sql);
 await db.exec("ALTER TABLE patients ADD COLUMN IF NOT EXISTS telegram TEXT NOT NULL DEFAULT ''");
 await db.exec(await readFile(new URL('./client-schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('./patient-media-schema.sql',import.meta.url),'utf8'));
 const version=await db.prepare('SELECT version FROM schema_migrations WHERE version=1').get();if(!version)await db.prepare('INSERT INTO schema_migrations(version) VALUES(?)').run(1);
 await db.prepare('INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING').run();
 await db.prepare('INSERT INTO schema_migrations(version) VALUES(3) ON CONFLICT DO NOTHING').run();
 await db.prepare('INSERT INTO schema_migrations(version) VALUES(4) ON CONFLICT DO NOTHING').run();
}
export async function openStorage({filename,connectionString=process.env.DATABASE_URL,schema}={}){
 return connectionString?openPostgres({connectionString,schema}):sqliteStorage(openDatabase(filename));
}
