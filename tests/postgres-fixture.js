import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {openPostgres} from '../server/storage.js';
export function postgresFixture(){
 const enabled=process.env.NUTQ_TEST_POSTGRES==='1';
 const schema='nutq_test_'+randomUUID().replaceAll('-','');
 return {schema,enabled,open:()=>enabled?openPostgres({schema}):undefined,async cleanup(){if(!enabled)return;if(!/^nutq_test_[a-f0-9]{32}$/.test(schema))throw Error('Unsafe test schema');const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});try{await client.connect();await client.query('DROP SCHEMA "'+schema+'" CASCADE')}finally{await client.end()}}};
}
