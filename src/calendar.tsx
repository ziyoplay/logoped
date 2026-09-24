import {useEffect,useRef,useState} from 'react';
import {IconChevronLeft,IconChevronRight,IconRefresh,IconCalendar,IconExternalLink} from '@tabler/icons-react';
import {PatientSchedule} from './schedule';
import {api} from './api';
import './calendar.css';

type Patient={id:string;name:string;focus:string;status:string};
type Appointment={id:string;patient_id:string;date:string;time:string;duration:number;title:string;status:string};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent'}).format(new Date());
const shift=(day:string,n:number)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const mins=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
const hour=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const weekdays=['Yak','Du','Se','Chor','Pay','Ju','Sha'];
const months=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
const caption=(d:string)=>`${Number(d.slice(8))} ${months[Number(d.slice(5,7))-1]}`;
const states:Record<string,string>={scheduled:'Rejada',completed:'Yakunlangan',cancelled:'Bekor qilingan'};

export function Calendar<T extends Appointment>({patients,appointments,day,onDay,onOpen,onCreate,onReload}:{patients:Patient[];appointments:T[];day:string;onDay:(d:string)=>void;onOpen:(a:T)=>void;onCreate:(date:string,time:string,patientId?:string)=>void;onReload:()=>Promise<void>}){
 const [view,setView]=useState<'week'|'day'|'patients'>(()=>window.matchMedia('(max-width: 700px)').matches?'day':'week');
 const [clock,setClock]=useState(new Date());const scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{const t=setInterval(()=>setClock(new Date()),60000);return()=>clearInterval(t);},[]);
 const weekday=new Date(day+'T12:00:00Z').getUTCDay(),start=shift(day,-((weekday+6)%7));
 const days=view==='week'?Array.from({length:7},(_,i)=>shift(start,i)):[day];
 const visible=appointments.filter(a=>days.includes(a.date));
 const begin=Math.min(8*60,...visible.map(a=>Math.floor(mins(a.time)/60)*60));
 const end=Math.max(20*60,...visible.map(a=>Math.ceil((mins(a.time)+a.duration)/60)*60));
 const slots=Array.from({length:(end-begin)/30},(_,i)=>begin+i*30);
 const currentTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(clock);
 useEffect(()=>{if(scroll.current)scroll.current.scrollTop=Math.max(0,((days.includes(today())?mins(currentTime):9*60)-begin)*1.2-70);},[day,view,begin]);
 return <>
  <GoogleCalendarPanel patients={patients} onReload={onReload}/>
  <section className="calendar-shell" aria-label="Qabul taqvimi">
   <div className="calendar-toolbar"><div className="calendar-navigation">
    <button className="button secondary" onClick={()=>onDay(today())}>Bugun</button>
    <button className="icon-button" aria-label="Oldingi davr" onClick={()=>onDay(shift(day,view==='week'?-7:-1))}><IconChevronLeft/></button>
    <button className="icon-button" aria-label="Keyingi davr" onClick={()=>onDay(shift(day,view==='week'?7:1))}><IconChevronRight/></button>
    <strong>{view==='week'?`${caption(days[0])} — ${caption(days[6])}`:caption(day)} <small>{day.slice(0,4)}</small></strong>
   </div><div className="calendar-controls"><input type="date" aria-label="Qabul sanasi" value={day} onChange={e=>e.target.value&&onDay(e.target.value)}/>
    <select aria-label="Taqvim ko‘rinishi" value={view} onChange={e=>setView(e.target.value as typeof view)}><option value="week">Hafta</option><option value="day">Kun</option><option value="patients">Bemorlar</option></select>
   </div></div>
   {view==='patients'?<PatientSchedule patients={patients} appointments={appointments.filter(a=>a.date===day)} day={day} onOpen={onOpen} onCreate={(id,t)=>onCreate(day,t,id)}/>:
    <div className="calendar-scroll" ref={scroll} tabIndex={0} aria-label="Soatlar jadvali, aylantirish mumkin">
     <div className={'calendar-grid '+(view==='week'?'calendar-week':'calendar-day')} style={{gridTemplateColumns:`54px repeat(${days.length},minmax(0,1fr))`}}>
      <div className="calendar-zone">GMT+5</div>{days.map(d=><div key={d} className={'calendar-day-heading '+(d===today()?'is-today':'')}><span>{weekdays[new Date(d+'T12:00:00Z').getUTCDay()]}</span><button aria-label={caption(d)+' kunini ochish'} onClick={()=>{onDay(d);setView('day');}}>{Number(d.slice(8))}</button></div>)}
      <div className="calendar-hours" style={{height:(end-begin)*1.2}}>{slots.filter(m=>m%60===0).map(m=><span key={m} style={{top:(m-begin)*1.2}}>{hour(m)}</span>)}</div>
      {days.map(d=>{
       const rows=visible.filter(a=>a.date===d).sort((a,b)=>mins(a.time)-mins(b.time)||a.id.localeCompare(b.id));
       const laneEnds:number[]=[];const placed=rows.map(a=>{let lane=laneEnds.findIndex(v=>v<=mins(a.time));if(lane<0)lane=laneEnds.length;laneEnds[lane]=mins(a.time)+Math.max(20,a.duration);return {a,lane};});
       const lanes=Math.max(1,laneEnds.length);
       return <div key={d} className="calendar-column" style={{height:(end-begin)*1.2}}>
        {slots.map(m=><button key={m} className="calendar-slot" style={{top:(m-begin)*1.2}} aria-label={`${caption(d)} ${hour(m)} qabul belgilash`} onClick={()=>onCreate(d,hour(m))}/>) }
        {placed.map(({a,lane})=><button key={a.id} className={'calendar-event '+a.status} style={{top:(mins(a.time)-begin)*1.2,height:Math.max(24,a.duration*1.2-2),left:`calc(${lane/lanes*100}% + 3px)`,width:`calc(${100/lanes}% - 6px)`}} onClick={()=>onOpen(a)} title={`${patients.find(p=>p.id===a.patient_id)?.name} · ${a.time} · ${a.title} · ${states[a.status]}`} aria-label={`${patients.find(p=>p.id===a.patient_id)?.name}, ${caption(d)} ${a.time}, ${states[a.status]}, tahrirlash`}><strong>{patients.find(p=>p.id===a.patient_id)?.name||'Bemor'}</strong><span>{a.time} · {a.duration} daqiqa</span>{a.duration>=45&&<small>{a.title}</small>}</button>)}
        {d===today()&&mins(currentTime)>=begin&&mins(currentTime)<end&&<div className="calendar-now" style={{top:(mins(currentTime)-begin)*1.2}} aria-label={'Hozir '+currentTime}/>}
       </div>;
      })}
     </div>
    </div>}
   <footer className="calendar-legend"><span><i/>Rejada</span><span><i className="completed"/>Yakunlangan</span><span><i className="cancelled"/>Bekor qilingan</span><small>Bo‘sh vaqtni bosib qabul belgilang · Toshkent vaqti</small></footer>
  </section>
 </>;
}

type RemoteEvent={id:string;appointmentId:string|null;title:string;date?:string;time?:string;duration?:number;error:string;cancelled:boolean};
type Notification={id:string;patient_id:string;state:string;error:string;payload:{date:string;time:string;title:string}};
type Status={configured:boolean;connected:boolean;calendarReady:boolean;canManage:boolean;lastSync:number;error:string;busy:boolean;events:RemoteEvent[];notifications:Notification[]};
function GoogleCalendarPanel({patients,onReload}:{patients:Patient[];onReload:()=>Promise<void>}){
 const callback=new URLSearchParams(window.location.search).get('google');
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(callback==='failed'?'Google ulanmadi. OAuth sozlamalarini tekshirib, qayta urinib ko‘ring.':callback==='cancelled'?'Google ulanishi tasdiqlanmadi.':''),[busy,setBusy]=useState(false),[disconnect,setDisconnect]=useState(false),[expanded,setExpanded]=useState(false);
 async function load(){setStatus(await api<Status>('/google/status'));}
 useEffect(()=>{void load().catch(e=>setError(e.message));const timer=setInterval(()=>void load().catch(e=>setError(e.message)),30000);return()=>clearInterval(timer);},[]);
 async function act(path:string,body:unknown={}){setBusy(true);setError('');try{const result=await api<{url?:string}>('/'+path,{method:'POST',body:JSON.stringify(body)});if(result.url){window.location.assign(result.url);return;}await load();await onReload();setDisconnect(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const issues=(status?.events.length||0)+(status?.notifications.length||0);
 return <section className="google-panel" aria-label="Google Calendar ulanishi"><div className="google-panel-top"><span className="google-calendar-mark"><IconCalendar size={22}/></span><div><strong>Google Calendar</strong><p>{!status?'Ulanish tekshirilmoqda…':status.connected?(status.lastSync?`Oxirgi sinxronlash: ${new Date(status.lastSync).toLocaleTimeString('uz-UZ',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit'})}`:'Birinchi sinxronlash kutilmoqda…'):status.configured?'Qabullarni Google bilan bog‘lang':'Ulash uchun serverda Google OAuth sozlamalari kerak'}</p></div><div className="google-panel-actions">
  {status?.canManage&&<button className="button secondary" disabled={busy||!status.configured} onClick={()=>void act(status.connected?'google/sync':'google/connect')}>{status.connected?<><IconRefresh size={17}/>Sinxronlash</>:'Google’ni ulash'}</button>}
  <button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Yopish':'Tafsilotlar'}{issues?` (${issues})`:''}</button></div></div>
  {(error||status?.error)&&<p className="error" role="alert">{error||status?.error}</p>}
  {expanded&&<div className="google-details"><p>Qabullar Google’dagi <strong>Nutq — Qabullar</strong> taqvimida saqlanadi. Sana yoki soat o‘zgarsa, ulangan bemorga Telegram xabari ketadi. Google’dagi o‘zgarishlar odatda bir daqiqada tekshiriladi.</p>
   {!status?.configured&&<p>Google Cloud’da Calendar API va OAuth veb-ilovasini sozlash tugallanmagan. Taqvimdan saytda foydalanishingiz mumkin.</p>}
   {status?.connected&&<><a className="text-button" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer">Google Calendar’ni ochish <IconExternalLink size={16}/></a><p>Google’da yangi tadbir yaratsangiz, shu yerda bemorni tanlang. Bemor aniqlanmaguncha xabar yuborilmaydi. Takrorlanuvchi yoki butun kunlik tadbir o‘rniga alohida, soati belgilangan qabul yarating.</p></>}
   {status?.events.map(e=><article className="calendar-inbox-item" key={e.id}><div><strong>{e.title}</strong><p>{e.date?caption(e.date)+' · '+e.time:e.cancelled?'Google’da bekor qilingan':'Vaqtni Google’da belgilang'}</p>{e.error&&<p className="error">{e.error}</p>}</div>
    {e.appointmentId?<div className="google-panel-actions"><button disabled={busy||!status.canManage} className="button secondary" onClick={()=>void act(`google/events/${encodeURIComponent(e.id)}/resolve`,{choice:'google'})}>Google versiyasi</button><button disabled={busy||!status.canManage} className="button secondary" onClick={()=>void act(`google/events/${encodeURIComponent(e.id)}/resolve`,{choice:'site'})}>Sayt versiyasi</button></div>:
     <form className="calendar-link-form" onSubmit={event=>{event.preventDefault();const patientId=new FormData(event.currentTarget).get('patient_id');void act(`google/events/${encodeURIComponent(e.id)}/link`,{patient_id:patientId});}}><select name="patient_id" required aria-label={e.title+' uchun bemor'} defaultValue=""><option value="" disabled>Bemorni tanlang</option>{patients.filter(p=>p.status==='active').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="button primary" disabled={busy||!!e.error||!status.canManage}>Bog‘lash</button></form>}
   </article>)}
   {!!status?.notifications.length&&<><h3>Telegram xabarlari</h3><p>Navbatdagi xabar uchun bemor kartasidagi Telegram ulanishi faol bo‘lishi va serverda bot sozlangan bo‘lishi kerak.</p>{status.notifications.map(n=><div className="calendar-inbox-item" key={n.id}><div><strong>{patients.find(p=>p.id===n.patient_id)?.name||'Bemor'}</strong><p>{n.payload.date} · {n.payload.time} — {n.state==='pending'?'Yuborish navbatida':n.error}</p></div>{n.state==='failed'&&<button disabled={busy} className="button secondary" onClick={()=>void act(`appointment-notifications/${n.id}/retry`)}>Telegramni tekshirdim, qayta yuborish</button>}</div>)}</>}
   {status?.connected&&status.canManage&&<div className="google-disconnect">{disconnect?<><p>Sinxronlash to‘xtaydi. Google’dagi taqvim va saytdagi qabullar saqlanadi. Qayta ulash yangi Nutq taqvimini yaratadi.</p><button className="button secondary" disabled={busy} onClick={()=>void act('google/disconnect')}>Ulanishni uzishni tasdiqlash</button> <button className="text-button" onClick={()=>setDisconnect(false)}>Ortga</button></>:<button className="text-button" onClick={()=>setDisconnect(true)}>Google ulanishini uzish</button>}{status.error&&<button className="button secondary" disabled={busy} onClick={()=>void act('google/connect')}>Qayta ulash (yangi taqvim)</button>}</div>}
  </div>}
 </section>;
}
