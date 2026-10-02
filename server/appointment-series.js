import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {audit} from './team.js';
import {appointmentChanged} from './appointment-notifications.js';

const day=86400000,stamp=d=>Date.parse(d+'T00:00:00Z'),iso=ms=>new Date(ms).toISOString().slice(0,10);
const gap=(later,earlier)=>Math.round((stamp(later)-stamp(earlier))/day);
function fail(status,message){const e=new Error(message);e.status=status;throw e;}

export function mountAppointmentSeries(app,db,appointmentSchema,validateRefs){
 const schema=z.object({appointment:appointmentSchema,interval_days:z.union([z.literal(1),z.literal(2),z.literal(7)]),count:z.number().int().min(2).max(60)}).strict();
 app.post('/api/appointments/series',async(req,res)=>{
  const {appointment,interval_days,count}=schema.parse(req.body);
  if(appointment.status!=='scheduled')return res.status(400).json({error:'Qabul rejimi faqat rejalangan seanslar uchun yaratiladi.'});
  const dates=Array.from({length:count},(_,i)=>new Date(Date.parse(appointment.date+'T00:00:00Z')+i*interval_days*86400000).toISOString().slice(0,10));
  // Validate every occurrence and save the entire plan atomically. A conflict on
  // the last day must not leave earlier appointments or notifications behind.
  const saved=await db.transaction(async()=>{
   const values=dates.map(date=>appointmentSchema.parse({...appointment,date}));
   for(const value of values){
    try{await validateRefs('appointments',value,req.ownerId,'',req);}
    catch(error){if(error.status===409)error.message=`${value.date}, ${value.time} band. Reja saqlanmadi. Boshqa vaqt yoki sanani tanlang.`;throw error;}
   }
   const rows=[];
   for(const value of values){
    const id=randomUUID(),keys=Object.keys(value);
    await db.prepare('INSERT INTO appointments(id,user_id,'+keys.join(',')+',updated_by) VALUES('+Array(keys.length+3).fill('?').join(',')+')').run(id,req.ownerId,...Object.values(value),req.user.id);
    await audit(db,req,'create','appointments',id);
    const row=await db.prepare('SELECT * FROM appointments WHERE id=?').get(id);
    await appointmentChanged(db,null,row);
    rows.push(row);
   }
   return rows;
  });
  res.status(201).json({appointments:saved,count:saved.length});
 });
 // Bemor kelmaganda butun reja bir pog‘ona suriladi: o‘tkazilgan seans rejadagi
 // keyingi kunga ko‘chadi, undan keyingi har bir qabul ham o‘zidan keyingisining
 // kuniga. Seanslar soni kamaymaydi, kelmagan kun esa jadvalda bekor qilingan
 // yozuv bo‘lib qoladi — logoped keyin nega surilganini ko‘radi.
 app.post('/api/appointments/:id/missed',async(req,res)=>{
  const result=await db.transaction(async()=>{
   const current=await db.prepare('SELECT * FROM appointments WHERE id=? AND user_id=?').get(req.params.id,req.ownerId);
   if(!current)fail(404,'Qabul topilmadi.');
   if(req.get('If-Match')!==String(current.revision))fail(409,'Qabul boshqa qurilmada yangilangan. Ro‘yxatni yangilab qayta urinib ko‘ring.');
   if(current.status!=='scheduled')fail(400,'Faqat rejadagi qabulni surish mumkin.');
   const chain=await db.prepare("SELECT * FROM appointments WHERE user_id=? AND patient_id=? AND therapist_id=? AND status='scheduled' AND (date>? OR (date=? AND time>=?)) ORDER BY date,time").all(req.ownerId,current.patient_id,current.therapist_id,current.date,current.date,current.time);
   // Oxirgi qabulga yangi kun kerak. Reja ritmini keyingi qabulgacha bo‘lgan oraliqdan
   // olamiz; yolg‘iz qabul bo‘lsa — oldingi seansdan; u ham bo‘lmasa bir kun.
   const earlier=await db.prepare('SELECT date FROM appointments WHERE user_id=? AND patient_id=? AND date<? ORDER BY date DESC').all(req.ownerId,current.patient_id,current.date);
   const step=Math.min(30,Math.max(1,chain.length>1?gap(chain[1].date,chain[0].date):earlier.length?gap(current.date,earlier[0].date):1));
   const moves=chain.map((a,i)=>({a,date:i+1<chain.length?chain[i+1].date:iso(stamp(chain.at(-1).date)+step*day)}));
   // Oxiridan boshlab yozamiz: har bir qabul o‘zidan keyingisi bo‘shatgan kunga tushadi,
   // shuning uchun oraliq holatda ham bir kunda ikkita qabul to‘qnashmaydi.
   for(const {a,date} of [...moves].reverse()){
    try{await validateRefs('appointments',{...a,date},req.ownerId,a.id,req);}
    catch(error){if(error.status===409)error.message=`${date}, ${a.time} band. Reja surilmadi. Avval o‘sha vaqtni bo‘shatib oling.`;throw error;}
    await db.prepare('UPDATE appointments SET date=?,revision=revision+1,updated_by=? WHERE id=? AND user_id=?').run(date,req.user.id,a.id,req.ownerId);
    await audit(db,req,'update','appointments',a.id);
    const saved=await db.prepare('SELECT * FROM appointments WHERE id=?').get(a.id);
    // Ota-onaga faqat eng yaqin seans haqida xabar ketadi: 60 ta qabulli reja
    // surilganda 60 ta xabar o‘rniga kelishi kerak bo‘lgan kunni aytamiz.
    await appointmentChanged(db,a,saved,Date.now(),{notify:a.id===current.id});
   }
   const marker=randomUUID();
   await db.prepare("INSERT INTO appointments(id,user_id,patient_id,date,time,duration,title,status,notes,therapist_id,updated_by) VALUES(?,?,?,?,?,?,?,'cancelled',?,?,?)")
    .run(marker,req.ownerId,current.patient_id,current.date,current.time,current.duration,current.title,'Bemor kelmadi.',current.therapist_id,req.user.id);
   await audit(db,req,'create','appointments',marker);
   // Bu yozuv uchun appointmentChanged chaqirilmaydi: u faqat logoped uchun belgi,
   // ota-onaga yuqorida yangi kun haqida xabar ketgan.
   return {moved:moves.length,date:moves[0].date,last:moves.at(-1).date,step};
  });
  res.json(result);
 });
}
