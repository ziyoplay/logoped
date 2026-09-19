import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.js';
import {postgresFixture} from './postgres-fixture.js';
import {telegramMenu} from '../server/telegram-menu.js';

test('Telegram menus isolate linked patients and handle results, videos, appointments and exercises',async()=>{
 const fixture=postgresFixture(),{db}=createApp({filename:':memory:',database:await fixture.open(),mediaOptions:{token:''}});
 const owner=randomUUID(),otherOwner=randomUUID(),patient=randomUUID(),otherPatient=randomUUID(),video=randomUUID(),otherVideo=randomUUID(),exercise=randomUUID();
 const now=Date.parse('2026-09-19T07:00:00Z');
 const menu=(text,username='parent_test',chat='789')=>telegramMenu(db,{text,username,chat,now});
 try{
  for(const id of [owner,otherOwner])await db.prepare('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)').run(id,'Doctor',id+'@example.test','fixture');
  for(const [id,user,name] of [[patient,owner,'Ali'],[otherPatient,otherOwner,'Private patient']]){
   await db.prepare('INSERT INTO patients(id,user_id,name,birth_date,telegram) VALUES(?,?,?,?,?)').run(id,user,name,'2020-01-01','parent_test');
   await db.prepare('INSERT INTO patient_telegram(patient_id,chat_id,username) VALUES(?,?,?)').run(id,id===patient?'789':'999','parent_test');
   await db.prepare('INSERT INTO results(id,user_id,patient_id,date,score,notes) VALUES(?,?,?,?,?,?)').run(randomUUID(),user,id,'2026-09-18',75,id===patient?'Good progress':'SECRET');
   await db.prepare('INSERT INTO patient_videos(id,patient_id,owner_id,title,size,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id===patient?video:otherVideo,id,user,id===patient?'Practice':'SECRET VIDEO',24,now,now);
  }
  await db.prepare('INSERT INTO exercises(id,user_id,title,category,duration,instructions) VALUES(?,?,?,?,?,?)').run(exercise,owner,'Breathing','Nafas',10,'Slow breathing');
  await db.prepare('INSERT INTO patient_exercises(id,patient_id,exercise_id,owner_id,note,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),patient,exercise,owner,'Daily',now);
  for(const [time,status,title] of [['11:00','scheduled','PAST'],['13:00','cancelled','CANCELLED'],['14:00','scheduled','Next session']])await db.prepare('INSERT INTO appointments(id,user_id,patient_id,date,time,duration,title,status,notes) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),owner,patient,'2026-09-19',time,30,title,status,'PRIVATE NOTES');
  assert.match((await menu('/start')).text,/Natijalarim/);
  assert.equal((await menu('/help')).reply_markup.keyboard.length,3);
  for(const text of ['/natijalar','📊 Natijalarim','/natijalar@nutq_test_bot']){
   const r=await menu(text);assert.match(r.text,/75%/);assert.match(r.text,/Good progress/);assert.doesNotMatch(r.text,/SECRET/);assert.equal(r.protect_content,true);
  }
  const list=await menu('🎬 Videolarim');assert.equal(list.reply_markup.inline_keyboard.length,1);assert.equal(list.reply_markup.inline_keyboard[0][0].callback_data,'video:'+video);
  assert.equal((await menu('/video '+video))._videoId,video);
  assert.equal((await menu('/video '+otherVideo))._videoId,undefined);
  const appointment=await menu('📅 Keyingi qabul');assert.match(appointment.text,/14:00/);assert.doesNotMatch(appointment.text,/PAST|CANCELLED|PRIVATE NOTES/);
  assert.match((await menu('📝 Mashqlarim')).text,/Slow breathing/);
  assert.match((await menu('/natijalar','wrong_user')).text,/shaxsiy ulash havolasi/);
  assert.match((await menu('/natijalar','parent_test','456')).text,/shaxsiy ulash havolasi/);
  await db.prepare('UPDATE results SET notes=? WHERE patient_id=?').run('x'.repeat(5000),patient);assert.ok((await menu('/natijalar')).text.length<=3800);
  await db.prepare('UPDATE users SET disabled=1 WHERE id=?').run(owner);assert.match((await menu('/natijalar')).text,/shaxsiy ulash havolasi/);
  await db.prepare('UPDATE users SET disabled=0 WHERE id=?').run(owner);
  await db.prepare('DELETE FROM patient_telegram WHERE patient_id=?').run(patient);assert.match((await menu('/videolar')).text,/shaxsiy ulash havolasi/);
 }finally{await db.close();await fixture.cleanup();}
});
