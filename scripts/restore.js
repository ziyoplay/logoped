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
const restored=new DatabaseSync(target);try{restored.exec('DELETE FROM sessions');if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='invitations'").get())restored.exec('DELETE FROM invitations');
if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='patient_telegram'").get())restored.exec('DELETE FROM patient_telegram');
if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='telegram_contact_pending'").get())restored.exec('DELETE FROM telegram_contact_pending');
if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='telegram_state'").get())restored.exec('DELETE FROM telegram_state');
if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='patient_videos'").get())restored.exec("UPDATE patient_videos SET state='failed',error='Zaxiradan tiklangan. Telegramni tekshirib, qayta yuboring.' WHERE state<>'sent'");if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='telegram_question_drafts'").get())restored.exec("DELETE FROM telegram_question_drafts");
if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='patient_questions'").get())restored.exec("UPDATE patient_questions SET state='failed' WHERE state NOT IN ('new','sent')");
for(const table of ['calendar_connections','calendar_events','calendar_oauth','appointment_notifications'])if(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))restored.exec('DELETE FROM '+table);
}finally{restored.close();}
console.log('Tiklandi: '+target+'\nServerni to‘xtating va DATABASE_PATH ni shu faylga yo‘naltiring. Barcha foydalanuvchilar qayta kiradi.');
