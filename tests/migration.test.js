import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openDatabase} from '../server/db.js';
test('Legacy database upgrade preserves records and assigns existing appointments',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'nutq-migration-')),filename=path.join(dir,'old.sqlite');let db=new DatabaseSync(filename);
 try{db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,clinic TEXT NOT NULL DEFAULT 'Mening amaliyotim',demo INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE patients(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,birth_date TEXT NOT NULL,guardian TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',focus TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE appointments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,patient_id TEXT NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL,duration INTEGER NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'scheduled',notes TEXT NOT NULL DEFAULT '');
 INSERT INTO users(id,name,email,password,clinic)VALUES('owner','Old Owner','old@example.test','hash','Old Clinic');INSERT INTO patients(id,user_id,name,birth_date)VALUES('patient','owner','Old Patient','2020-01-01');INSERT INTO appointments(id,user_id,patient_id,date,time,duration,title)VALUES('appt','owner','patient','2026-09-20','09:00',45,'Visit');`);db.close();db=openDatabase(filename);
 const clinicId=db.prepare('SELECT clinic_id FROM users').get().clinic_id;assert.ok(clinicId);assert.equal(db.prepare('SELECT owner_id FROM clinics').get().owner_id,'owner');assert.equal(db.prepare('SELECT name FROM patients').get().name,'Old Patient');assert.equal(db.prepare('SELECT therapist_id FROM appointments').get().therapist_id,'owner');assert.equal(db.prepare('SELECT revision FROM appointments').get().revision,0);
 db.close();db=openDatabase(filename);assert.equal(db.prepare('SELECT clinic_id FROM users').get().clinic_id,clinicId);assert.equal(db.prepare('SELECT count(*) AS n FROM clinics').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
