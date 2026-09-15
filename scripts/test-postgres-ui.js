import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server/app.js';
import {postgresFixture} from '../tests/postgres-fixture.js';
import {postgresBackupManager} from '../server/postgres-backups.js';

// Use an isolated schema even when DATABASE_SCHEMA names the live application.
process.env.NUTQ_TEST_POSTGRES='1';
const fixture=postgresFixture(),db=await fixture.open();
const directory=await mkdtemp(path.join(tmpdir(),'nutq-pg-ui-'));
const {app}=createApp({database:db});
const backups=postgresBackupManager(db,directory);
app.locals.backups=backups;
const server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
try {
 await backups.run();
 const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{
  stdio:'inherit',env:{...process.env,PLAYWRIGHT_BASE_URL:'http://127.0.0.1:'+server.address().port,
   PLAYWRIGHT_TEST_TIMEOUT:'120000',PLAYWRIGHT_EXPECT_TIMEOUT:'15000'}
 });
 process.exitCode=await new Promise((resolve,reject)=>{child.on('exit',code=>resolve(code??1));child.on('error',reject)});
} finally {
 await new Promise(r=>server.close(r));
 await backups.stop();await db.close();await fixture.cleanup();
 await rm(directory,{recursive:true,force:true});
}
