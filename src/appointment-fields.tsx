import {useState} from 'react';

export function AppointmentFields({values,day,time,editing}:{values:Record<string,string|number>;day:string;time?:string;editing:boolean}){
 const [start,setStart]=useState(String(values.date||day));
 const [interval,setInterval]=useState(0);
 const [amount,setAmount]=useState('10');
 const [unit,setUnit]=useState('sessions');
 const count=unit==='days'?Math.ceil(Number(amount)/interval):Number(amount);
 const valid=interval>0&&Number.isInteger(Number(amount))&&Number(amount)>=1&&Number(amount)<=60&&Number.isFinite(Date.parse(start+'T00:00:00Z'));
 const dates=valid?Array.from({length:count},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*interval*86400000).toISOString().slice(0,10)):[];
 const readable=(s:string)=>s.split('-').reverse().join('.');
 return <>
  <label className="field"><span>Mashg‘ulot nomi *</span><input name="title" required defaultValue={values.title||'Individual mashg‘ulot'} maxLength={150}/></label>
  <div className="form-grid"><label className="field"><span>Sana *</span><input name="date" type="date" value={start} onChange={e=>setStart(e.target.value)} required/></label><label className="field"><span>Vaqt (Toshkent) *</span><input name="time" type="time" defaultValue={values.time||time||'09:00'} required/></label></div>
  {!editing&&<div className="appointment-repeat"><label className="field"><span>Qabul rejimi</span><select name="_repeat_interval" value={interval} onChange={e=>setInterval(Number(e.target.value))}><option value={0}>Bir marta</option><option value={1}>Har kuni</option><option value={2}>Kunora (har 2 kunda)</option><option value={7}>Haftada bir</option></select></label>
   {interval>0&&<><div className="form-grid"><label className="field"><span>{unit==='sessions'?'Jami seanslar soni':'Necha kun davomida'}</span><input name="_repeat_amount" type="number" min={1} max={60} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="field"><span>Reja muddati</span><select name="_repeat_unit" value={unit} onChange={e=>setUnit(e.target.value)}><option value="sessions">Seanslar soni bo‘yicha</option><option value="days">Kun davomida</option></select></label></div>
   {dates.length>0&&<div className="repeat-preview" role="status"><strong>{dates.length} ta qabul · {readable(dates[0])} — {readable(dates.at(-1)!)}</strong><p>{interval===2?'Bir kun qabul, keyingi kun tanaffus. ':interval===7?'Har 7 kunda qabul. ':'Har kuni qabul. '}Barcha qabullar tanlangan vaqtda belgilanadi.</p><details><summary>Sanalarni ko‘rish</summary><ol>{dates.map(d=><li key={d}>{readable(d)}</li>)}</ol></details></div>}</>}
  </div>}
  <div className="form-grid"><label className="field"><span>Davomiyligi (daqiqa) *</span><input name="duration" type="number" defaultValue={values.duration||45} min={5} max={240} required/></label><label className="field"><span>Holati</span><select name="status" defaultValue={values.status||'scheduled'} disabled={interval>0}><option value="scheduled">Rejada</option><option value="completed">Yakunlangan</option><option value="cancelled">Bekor qilingan</option></select></label></div>
  <label className="field"><span>Izoh</span><textarea name="notes" defaultValue={values.notes} maxLength={5000} rows={3}/></label>
 </>;
}
