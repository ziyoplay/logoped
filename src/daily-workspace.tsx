import {useEffect,useRef,useState} from 'react';
import {IconArrowRight,IconCalendar,IconCheck,IconChevronLeft,IconChevronRight,IconEdit,IconPlus} from '@tabler/icons-react';

export type SessionAppointment={id:string;revision:number;therapist_id:string;patient_id:string;date:string;time:string;duration:number;title:string;status:string;notes:string};
type Props={
  appointments:SessionAppointment[];patients:{id:string;name:string}[];day:string;today:string;dateLabel:string;busy:string;
  onDay:(offset:number)=>void;onToday:()=>void;onCalendar:()=>void;onPatient:(id:string)=>void;
  onAddPatient:()=>void;onAddAppointment:(patientId?:string)=>void;onResult:(patientId:string)=>void;
  onEdit:(a:SessionAppointment)=>void;onStatus:(a:SessionAppointment,status:string)=>Promise<boolean>;
};

export function DailyWorkspace(p:Props){
  const [recentId,setRecentId]=useState<string|null>(null);
  const confirmation=useRef<HTMLDivElement>(null);
  const list=p.appointments.filter(a=>a.date===p.day).sort((a,b)=>a.time.localeCompare(b.time));
  const pending=list.filter(a=>a.status==='scheduled');
  const finished=list.filter(a=>a.status==='completed');
  const cancelled=list.filter(a=>a.status==='cancelled');
  const recent=finished.find(a=>a.id===recentId);
  const previous=finished.filter(a=>a.id!==recent?.id);
  const name=(id:string)=>p.patients.find(patient=>patient.id===id)?.name||'Bemor';
  useEffect(()=>{if(recent)confirmation.current?.focus({preventScroll:true});},[recent?.id]);
  async function finish(a:SessionAppointment){if(await p.onStatus(a,'completed'))setRecentId(a.id);}
  async function undo(a:SessionAppointment){if(await p.onStatus(a,'scheduled'))setRecentId(null);}
  return <div className="daily-workspace simple-day">
    <div className="page-heading"><div><h1>Bugungi ishlar</h1><p>Qabulni o‘tkazing, so‘ng “Seans tugadi”ni bosing.</p></div>
      <div className="daily-heading-actions"><button className="button secondary" onClick={p.onAddPatient}><IconPlus size={18}/>Bemor qo‘shish</button><button className="button primary" onClick={()=>p.onAddAppointment()}><IconPlus size={18}/>Qabul belgilash</button></div>
    </div>
    <section className="panel day-sessions" aria-label="Kundalik qabullar">
      <div className="day-toolbar"><div><h2>{p.day===p.today?'Bugungi qabullar':p.dateLabel}</h2><p>{p.day===p.today?p.dateLabel+' · ':''}{pending.length} ta qoldi · {finished.length} ta yakunlandi</p></div>
        <div className="day-navigation"><button className="icon-button" aria-label="Oldingi kun" onClick={()=>p.onDay(-1)}><IconChevronLeft size={20}/></button><button className="text-button" onClick={p.onToday} disabled={p.day===p.today}>Bugun</button><button className="icon-button" aria-label="Keyingi kun" onClick={()=>p.onDay(1)}><IconChevronRight size={20}/></button></div>
      </div>
      {recent&&<div className="session-confirmation" ref={confirmation} tabIndex={-1}>
        <div className="session-confirmation-title"><IconCheck size={24}/><div><button className="name-link" onClick={()=>p.onPatient(recent.patient_id)}>{name(recent.patient_id)}</button><p>Seans yakunlandi · {recent.time}</p></div></div>
        <div className="session-followups"><button className="button secondary" onClick={()=>p.onResult(recent.patient_id)}>Natija qo‘shish</button><button className="text-button" onClick={()=>p.onAddAppointment(recent.patient_id)}>Keyingi qabul</button><button className="text-button" disabled={!!p.busy} aria-label={`${name(recent.patient_id)} seansini rejaga qaytarish`} onClick={()=>void undo(recent)}>Qaytarish</button></div>
      </div>}
      <div className="simple-session-list">{pending.map(a=><article className="simple-session" key={a.id} aria-label={`${name(a.patient_id)}, ${a.time}`}>
        <div className="simple-session-time"><strong>{a.time}</strong><span>{a.duration} daqiqa</span></div>
        <div className="simple-session-person"><button className="name-link" onClick={()=>p.onPatient(a.patient_id)}>{name(a.patient_id)}</button><p>{a.title}</p></div>
        <button className="button primary session-done" disabled={!!p.busy} aria-label={`${name(a.patient_id)} qabulini yakunlash`} onClick={()=>void finish(a)}><IconCheck size={21}/>{p.busy===a.id?'Saqlanmoqda…':'Seans tugadi'}</button>
        <button className="icon-button session-edit" aria-label={`${name(a.patient_id)} qabulini tahrirlash`} onClick={()=>p.onEdit(a)}><IconEdit size={18}/></button>
      </article>)}</div>
      {!pending.length&&<div className="day-empty"><IconCheck size={32}/><h3>{finished.length?'Bu kungi seanslar tugadi':'Bu kunga qabul yo‘q'}</h3><p>{finished.length?'Natijani hozir yoki keyinroq qo‘shishingiz mumkin.':'Yangi qabul belgilang yoki boshqa kunni ko‘ring.'}</p></div>}
      {!!previous.length&&<details className="day-history"><summary>Yakunlangan seanslar <span>{previous.length}</span></summary>{previous.map(a=><div className="day-history-row" key={a.id}><span>{a.time}</span><button className="name-link" onClick={()=>p.onPatient(a.patient_id)}>{name(a.patient_id)}</button><button className="text-button" onClick={()=>p.onResult(a.patient_id)}>Natija qo‘shish</button><button className="text-button" disabled={!!p.busy} aria-label={`${name(a.patient_id)} seansini rejaga qaytarish`} onClick={()=>void undo(a)}>Qaytarish</button></div>)}</details>}
      {!!cancelled.length&&<details className="day-history"><summary>Bekor qilingan <span>{cancelled.length}</span></summary>{cancelled.map(a=><div className="day-history-row" key={a.id}><span>{a.time}</span><span>{name(a.patient_id)}</span><button className="text-button" onClick={()=>p.onEdit(a)}>Qabulni ko‘rish</button></div>)}</details>}
      <button className="day-calendar-link text-button" onClick={p.onCalendar}><IconCalendar size={18}/>To‘liq qabul jadvali<IconArrowRight size={17}/></button>
    </section>
  </div>;
}
