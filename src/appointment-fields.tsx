import {useState} from 'react';

export function AppointmentFields({values,day,time,editing}:{values:Record<string,string|number>;day:string;time?:string;editing:boolean}){
 const [start,setStart]=useState(String(values.date||day));
 const [interval,setInterval]=useState(0);
 const [amount,setAmount]=useState('10');
 const [unit,setUnit]=useState('until');
 const [end,setEnd]=useState('');
 const startMs=Date.parse(start+'T00:00:00Z'),endMs=Date.parse(end+'T00:00:00Z');
 // 60 ta qabul — server qabul qiladigan eng katta reja. Tugash sanasini shu chegara bilan
 // cheklaymiz, aks holda logoped tushunarsiz server xatosiga uriladi.
 const maxEnd=interval>0&&Number.isFinite(startMs)?new Date(startMs+59*interval*86400000).toISOString().slice(0,10):'';
 const count=unit==='days'?Math.ceil(Number(amount)/interval):unit==='until'?Math.floor((endMs-startMs)/(interval*86400000))+1:Number(amount);
 const tooLong=unit==='until'&&!!end&&endMs>=startMs&&count>60;
 const valid=interval>0&&(unit==='until'?!!end&&endMs>=startMs:Number.isInteger(Number(amount))&&Number(amount)>=1&&Number(amount)<=60)&&Number.isFinite(startMs)&&count>=1&&count<=60;
 const dates=valid?Array.from({length:count},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*interval*86400000).toISOString().slice(0,10)):[];
 const readable=(s:string)=>s.split('-').reverse().join('.');
 return <>
  <label className="field"><span>Mashg‘ulot nomi *</span><input name="title" required defaultValue={values.title||'Individual mashg‘ulot'} maxLength={150}/></label>
  <div className="form-grid"><label className="field"><span>Sana *</span><input name="date" type="date" value={start} onChange={e=>setStart(e.target.value)} required/></label><label className="field"><span>Vaqt (Toshkent) *</span><input name="time" type="time" defaultValue={values.time||time||'09:00'} required/></label></div>
  {!editing&&<div className="appointment-repeat"><label className="field"><span>Qabul rejimi</span><select name="_repeat_interval" value={interval} onChange={e=>setInterval(Number(e.target.value))}><option value={0}>Bir marta</option><option value={1}>Har kuni</option><option value={2}>Kunora (har 2 kunda)</option><option value={7}>Haftada bir</option></select></label>
   {interval>0&&<><div className="form-grid"><label className="field"><span>Reja muddati</span><select name="_repeat_unit" value={unit} onChange={e=>setUnit(e.target.value)}><option value="until">Tugash sanasigacha</option><option value="sessions">Seanslar soni bo‘yicha</option><option value="days">Kun davomida</option></select></label>{unit==='until'?<label className="field"><span>Qachongacha keladi? *</span><input name="_repeat_end" type="date" min={start} max={maxEnd} required value={end} onChange={e=>setEnd(e.target.value)}/>{tooLong&&<small className="hint">Bir rejaga eng ko‘pi 60 ta qabul sig‘adi. Bu rejim uchun oxirgi sana — {readable(maxEnd)}.</small>}</label>:<label className="field"><span>{unit==='sessions'?'Jami seanslar soni':'Necha kun davomida'}</span><input name="_repeat_amount" type="number" min={1} max={60} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/></label>}</div>
   {dates.length>0&&<div className="repeat-preview" role="status"><strong>{dates.length} ta qabul · {readable(dates[0])} — {readable(dates.at(-1)!)}</strong><p>{interval===2?'Bir kun qabul, keyingi kun tanaffus. ':interval===7?'Har 7 kunda qabul. ':'Har kuni qabul. '}Barcha qabullar tanlangan vaqtda belgilanadi.</p><details><summary>Sanalarni ko‘rish</summary><ol>{dates.map(d=><li key={d}>{readable(d)}</li>)}</ol></details></div>}</>}
  </div>}
  <div className="form-grid"><label className="field"><span>Davomiyligi (daqiqa) *</span><input name="duration" type="number" defaultValue={values.duration||45} min={5} max={240} required/></label><label className="field"><span>Holati</span><select name="status" defaultValue={values.status||'scheduled'} disabled={interval>0}><option value="scheduled">Rejada</option><option value="completed">Yakunlangan</option><option value="cancelled">Bekor qilingan</option></select></label></div>
  <label className="field"><span>Izoh</span><textarea name="notes" defaultValue={values.notes} maxLength={5000} rows={3}/></label>
 </>;
}
