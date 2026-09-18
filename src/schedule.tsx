import type {CSSProperties} from 'react';
import {useEffect,useRef,useState} from 'react';
import './schedule.css';
type Patient={id:string;name:string;focus:string;status:string};
type Appointment={id:string;patient_id:string;time:string;duration:number;title:string;status:string};
const mins=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
const label=(minute:number)=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
export function PatientSchedule<T extends Appointment>({patients,appointments,day,onOpen,onCreate}:{patients:Patient[];appointments:T[];day:string;onOpen:(a:T)=>void;onCreate:(id:string,time:string)=>void}){
 const [clock,setClock]=useState(new Date()),[query,setQuery]=useState('');const scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{const t=setInterval(()=>setClock(new Date()),60000);return()=>clearInterval(t);},[]);
 const currentDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent'}).format(clock);
 const currentTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hour12:false}).format(clock);
 const minute=mins(currentTime),start=Math.min(8*60,...appointments.map(a=>Math.floor(mins(a.time)/60)*60)),end=Math.max(20*60,...appointments.map(a=>Math.ceil((mins(a.time)+a.duration)/60)*60));
 const hours=Array.from({length:(end-start)/60},(_,i)=>start+i*60),width=hours.length*112;
 const visible=patients.filter(p=>(p.status==='active'||appointments.some(a=>a.patient_id===p.id))&&p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 useEffect(()=>{if(scroll.current)scroll.current.scrollLeft=Math.max(0,((day===currentDay?minute:9*60)-start)/60*112-112);},[day,start]);
 return <section className="panel patient-schedule"><div className="schedule-tools"><label className="schedule-search"><span>Bemorni qidirish</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ism yoki familiya"/></label><p>Bo‘sh vaqtni bosing — qabul belgilang.</p></div><div className="schedule-scroll" ref={scroll} tabIndex={0} aria-label="Bemorlar bo‘yicha qabul jadvali, yon tomonga surish mumkin"><div className="schedule-grid" style={{'--timeline-width':width+'px'} as CSSProperties}><div className="schedule-head"><div className="schedule-person">BEMORLAR <span>{visible.length}</span></div><div className="schedule-hours" style={{width}}>{hours.map(h=><span key={h} className={day===currentDay&&minute>=h&&minute<h+60?'is-current':''}>{label(h)}</span>)}</div></div>{visible.map(p=>{
 const rows=appointments.filter(a=>a.patient_id===p.id).sort((a,b)=>mins(a.time)-mins(b.time));
 const laneEnds:number[]=[];const placed=rows.map(a=>{let lane=laneEnds.findIndex(v=>v<=mins(a.time));if(lane<0)lane=laneEnds.length;laneEnds[lane]=mins(a.time)+a.duration;return {a,lane};});
 const count=rows.filter(a=>a.status!=='cancelled').length;
 return <div className="schedule-row" key={p.id} style={{minHeight:Math.max(88,laneEnds.length*54+20)}}><div className="schedule-person"><strong>{p.name}</strong><small>{p.focus||'Individual mashg‘ulot'}</small><span className={'schedule-count '+(count?'occupied':'')}>{count?count+' ta qabul':'Qabul yo‘q'}</span></div><div className="schedule-track" style={{width}}><div className="schedule-slots">{hours.map(h=><button key={h} aria-label={p.name+' uchun '+label(h)+' da qabul belgilash'} onClick={()=>onCreate(p.id,label(h))}/>)}</div>{placed.map(({a,lane})=><button key={a.id} className={'schedule-booking '+a.status} style={{left:(mins(a.time)-start)/60*112,width:Math.max(12,a.duration/60*112-3),top:10+lane*54}} title={p.name+' · '+a.time+' · '+a.title} aria-label={p.name+', '+a.time+', '+a.title} onClick={()=>onOpen(a)}><strong>{a.time}</strong><span>{a.title}</span></button>)}{day===currentDay&&minute>=start&&minute<end&&<i className="schedule-now" style={{left:(minute-start)/60*112}} aria-label={'Hozir '+currentTime}/>}</div></div>;
 })}{!visible.length&&<p className="schedule-empty">Bemor topilmadi. Bemor qo‘shing yoki qidiruvni o‘zgartiring.</p>}</div></div><div className="schedule-legend"><span><i/> Rejada</span><span><i className="completed"/> Yakunlangan</span><span><i className="cancelled"/> Bekor qilingan</span><small>Vaqtlar Toshkent vaqti bilan · Telefonda jadvalni yon tomonga suring</small></div></section>;
}
