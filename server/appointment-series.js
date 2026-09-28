import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {audit} from './team.js';
import {appointmentChanged} from './appointment-notifications.js';

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
}
