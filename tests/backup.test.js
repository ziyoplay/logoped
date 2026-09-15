import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../server/db.js';
import {backupManager} from '../server/backups.js';
test('Online backup preserves records; restore clears sessions and refuses overwrite',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'nutq-backup-test-'));const db=openDatabase(path.join(directory,'live.sqlite'));
 try{db.prepare('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)').run('u','Test','backup@example.test','hash');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('token','u',Date.now()+60000);
 const manager=backupManager(db,path.join(directory,'backups'),{retain:2});await manager.run();assert.ok(manager.status().lastSuccess);assert.equal(manager.status().lastError,null);
 const file=(await readdir(path.join(directory,'backups'))).find(f=>f.endsWith('.sqlite'));const source=path.join(directory,'backups',file),target=path.join(directory,'restored.sqlite');
 execFileSync(process.execPath,['scripts/restore.js',source,target]);const copy=new DatabaseSync(target);try{assert.equal(copy.prepare('SELECT count(*) AS n FROM users').get().n,1);assert.equal(copy.prepare('SELECT count(*) AS n FROM sessions').get().n,0);assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{copy.close();}
 assert.throws(()=>execFileSync(process.execPath,['scripts/restore.js',source,target],{stdio:'pipe'}));
 const bad=path.join(directory,'bad.sqlite');await writeFile(bad,'invalid');assert.throws(()=>execFileSync(process.execPath,['scripts/restore.js',bad,path.join(directory,'bad-copy.sqlite')],{stdio:'pipe'}));
 await manager.stop();
 }finally{db.close();await rm(directory,{recursive:true,force:true});}
});
