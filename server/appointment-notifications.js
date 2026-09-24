import {randomUUID} from 'node:crypto';
import {html,card} from './telegram-text.js';

const fields=['patient_id','date','time','duration','title','status'];
export const appointmentSnapshot=a=>JSON.stringify(fields.map(k=>a?.[k]??null));

// Called inside the appointment transaction: a failed save cannot send a message.
export async function appointmentChanged(db,before,after,now=Date.now()){
 if(appointmentSnapshot(before)===appointmentSnapshot(after))return;
 const a=after||before;
 await db.prepare("DELETE FROM appointment_notifications WHERE appointment_id=? AND patient_id IN (?,?) AND state IN ('pending','failed')").run(a.id,before?.patient_id||a.patient_id,after?.patient_id||a.patient_id);
 if(before&&after&&before.patient_id!==after.patient_id)await enqueue(before,'cancelled');
 if(!after||after.status==='cancelled')await enqueue(a,'cancelled');
 else if(after.status==='scheduled')await enqueue(after,before?'updated':'created');
 async function enqueue(row,kind){
  await db.prepare('INSERT INTO appointment_notifications(id,owner_id,patient_id,appointment_id,payload,updated_at) VALUES(?,?,?,?,?,?)')
   .run(randomUUID(),row.user_id,row.patient_id,row.id,JSON.stringify({kind,date:row.date,time:row.time,duration:row.duration,title:row.title}),now);
 }
}

export async function deliverAppointmentNotification(db,call,now=Date.now()){
 await db.prepare("UPDATE appointment_notifications SET state='failed',error='Yuborish yakuni noma’lum. Telegramni tekshiring.' WHERE state='sending' AND updated_at<?").run(now-600000);
 const item=await db.transaction(async()=>{
  const row=await db.prepare(`SELECT n.*,t.chat_id,p.name AS patient_name FROM appointment_notifications n
   JOIN patients p ON p.id=n.patient_id AND p.user_id=n.owner_id
   JOIN patient_telegram t ON t.patient_id=p.id JOIN users u ON u.id=n.owner_id
   WHERE n.state='pending' AND t.chat_id IS NOT NULL AND lower(t.username)=lower(p.telegram) AND u.disabled=0
   ORDER BY n.updated_at LIMIT 1`).get();
  if(row)await db.prepare("UPDATE appointment_notifications SET state='sending',updated_at=? WHERE id=?").run(now,row.id);
  return row;
 });
 if(!item)return;
 const p=JSON.parse(item.payload);
 // Do not deliver expired appointments when a patient links Telegram much later.
 if(Date.parse(p.date+'T'+p.time+':00+05:00')<now&&p.kind!=='cancelled'){
  await db.prepare("UPDATE appointment_notifications SET state='expired' WHERE id=?").run(item.id);return;
 }
 try{
  await call('sendMessage',{chat_id:item.chat_id,parse_mode:'HTML',protect_content:true,
   text:card(p.kind==='cancelled'?'📅 Qabul bekor qilindi':p.kind==='updated'?'📅 Qabul vaqti yangilandi':'📅 Qabul belgilandi',
    [`👤 ${html(item.patient_name,100)}`,html(p.title),`🗓 ${html(p.date)}\n🕐 ${html(p.time)} · Toshkent vaqti\n⏱ ${p.duration} daqiqa`],p.kind==='cancelled'?'Yangi vaqtni logoped bilan kelishing.':'Qabul ma’lumotlarini /qabul orqali ham ko‘rishingiz mumkin.')});
  await db.prepare("UPDATE appointment_notifications SET state='sent',updated_at=?,error='' WHERE id=?").run(now,item.id);
 }catch(e){
  if(e.status===403)await db.prepare('DELETE FROM patient_telegram WHERE patient_id=? AND chat_id=?').run(item.patient_id,item.chat_id);
  await db.prepare("UPDATE appointment_notifications SET state='failed',updated_at=?,error=? WHERE id=?").run(now,e.status===403?'Bot bloklangan. Bemor Telegramni qayta ulashi kerak.':'Yuborish tasdiqlanmadi. Telegramni tekshirib, zarur bo‘lsa qayta yuboring.',item.id);
 }
}
