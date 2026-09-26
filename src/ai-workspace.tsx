import {useEffect,useRef,useState,type FormEvent} from 'react';
import {IconSparkles,IconMessageCircle,IconUserPlus,IconCalendar,IconArrowUp,IconArrowRight} from '@tabler/icons-react';
import {api} from './api';
import {AiExercises} from './ai-exercises';
import './ai-workspace.css';

export type AiDraft={table:'patients'|'appointments';values:Record<string,string|number>};
type Mode='chat'|'patient'|'appointment';
type Message={id:number;role:'user'|'assistant';text:string;draft?:AiDraft|null;saved?:boolean};
const modes=[{id:'chat',label:'Suhbat',icon:IconMessageCircle},{id:'patient',label:'Bemor qo‘shish',icon:IconUserPlus},{id:'appointment',label:'Qabul rejalashtirish',icon:IconCalendar},{id:'exercise',label:'Mashq tayyorlash',icon:IconSparkles}] as const;
const intros={chat:{title:'Nimadan boshlaymiz?',description:'Savol bering, fikringizni yozing yoki kunlik ishlaringizni birga tartibga solamiz.',example:'Bugungi ishlarimni tartibga solishga yordam ber.'},patient:{title:'Yangi bemor kartasini tayyorlaymiz',description:'Ism, familiya, tug‘ilgan sana va ota-onaning telefon raqamini yozing. Yetishmagan ma’lumotni saqlashdan oldin to‘ldirasiz.',example:'Yangi bemor kartasini ochmoqchiman. Qaysi ma’lumotlar kerak?'},appointment:{title:'Qabul uchun vaqt topamiz',description:'Kerakli sana, vaqt va davomiylikni yozing. Bemorni tasdiqlash formasida tanlaysiz.',example:'Tanlangan kunda 45 daqiqalik qabul uchun bo‘sh vaqt taklif qil.'}};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent'}).format(new Date());
export function AiWorkspace({onDraft,onSaved}:{onDraft:(draft:AiDraft,onSaved:()=>void)=>void;onSaved:()=>Promise<void>}){
 const [mode,setMode]=useState<Mode|'exercise'>('chat'),[sessions,setSessions]=useState<Record<Mode,Message[]>>({chat:[],patient:[],appointment:[]});
 const [inputs,setInputs]=useState<Record<Mode,string>>({chat:'',patient:'',appointment:''}),[scheduleDate,setScheduleDate]=useState(today),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [status,setStatus]=useState<{available:boolean;demo:boolean}|null>(null);
 const sequence=useRef(0),bottom=useRef<HTMLDivElement>(null),composer=useRef<HTMLTextAreaElement>(null);
 const messages=mode==='exercise'?[]:sessions[mode];
 async function check(){setError('');try{setStatus(await api('/ai/status'));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void check();},[]);
 useEffect(()=>{if(messages.length)bottom.current?.scrollIntoView({block:'nearest'});},[messages.length,busy]);
 async function submit(e:FormEvent){
  e.preventDefault();if(mode==='exercise'||busy||!status?.available)return;
  const text=inputs[mode].trim();if(!text)return;
  const current=mode,userMessage:Message={id:++sequence.current,role:'user',text};
  // Six recent pairs plus the current question: bounded context, held only in this page.
  const outgoing=[...sessions[current].slice(-12),userMessage];
  setSessions(s=>({...s,[current]:[...s[current],userMessage]}));setInputs(s=>({...s,[current]:''}));setBusy(true);setError('');
  try{
   const result=await api<{reply:string;draft:AiDraft|null}>('/ai/chat',{method:'POST',body:JSON.stringify({mode:current,scheduleDate,messages:outgoing.map(({role,text})=>({role,text}))})},60000);
   const assistant:Message={id:++sequence.current,role:'assistant',text:result.reply,draft:result.draft};
   setSessions(s=>({...s,[current]:[...s[current],assistant]}));
  }catch(e){setSessions(s=>({...s,[current]:s[current].filter(m=>m.id!==userMessage.id)}));setInputs(s=>({...s,[current]:text}));setError((e as Error).message);}finally{setBusy(false);composer.current?.focus();}
 }
 function openDraft(message:Message){
  if(!message.draft||mode==='exercise')return;const current=mode;
  onDraft(message.draft,()=>setSessions(s=>({...s,[current]:s[current].map(m=>m.id===message.id?{...m,saved:true}:m)})));
 }
 return <div className="ai-workspace">
  <div className="page-heading"><div><h1>AI</h1><p>Suhbatdan aniq rejaga — kundalik ishlaringiz uchun yordamchi.</p></div></div>
  <div className="ai-mode-list" role="group" aria-label="AI rejimi">{modes.map(({id,label,icon:Icon})=><button type="button" key={id} className={mode===id?'selected':''} aria-pressed={mode===id} disabled={busy} onClick={()=>{setMode(id);setError('');}}><Icon size={19}/>{label}</button>)}</div>
  {mode==='exercise'?<AiExercises onSaved={onSaved}/>:<section className="panel ai-conversation" aria-label="AI suhbat">
   <div className="ai-conversation-heading"><strong>{modes.find(m=>m.id===mode)?.label}</strong><button className="text-button" disabled={busy||!messages.length} onClick={()=>{setSessions(s=>({...s,[mode]:[]}));setError('');}}>Yangi suhbat</button></div>
   {mode==='appointment'&&<div className="ai-schedule-context"><label className="field">Jadval sanasi<input type="date" min="1900-01-01" max="2100-12-31" value={scheduleDate} disabled={busy} onChange={e=>setScheduleDate(e.target.value)}/></label><p>Shu kundan boshlab 7 kunlik band vaqtlar hisobga olinadi. Toshkent vaqti; joriy logoped jadvali.</p></div>}
   <div className="ai-messages" role="log" aria-label="Suhbat xabarlari" aria-live="polite" aria-busy={busy}>
    {!messages.length?<div className="ai-welcome"><IconSparkles size={30}/><h2>{intros[mode].title}</h2><p>{intros[mode].description}</p><button className="ai-example" disabled={busy} onClick={()=>{setInputs(s=>({...s,[mode]:intros[mode].example}));composer.current?.focus();}}>{intros[mode].example}<IconArrowRight size={18}/></button></div>:messages.map(m=><article key={m.id} className={'ai-message '+m.role}><small>{m.role==='user'?'Siz':'AI'}</small><p>{m.text}</p>{m.draft&&<div className="ai-draft-action"><strong>{m.draft.table==='patients'?'Bemor kartasi loyihasi':'Qabul loyihasi'}</strong><span>{m.draft.table==='patients'?String(m.draft.values.name||'Ismni to‘ldiring'):[m.draft.values.date,m.draft.values.time,m.draft.values.duration+' daqiqa'].filter(Boolean).join(' · ')}</span><button className="button secondary" disabled={m.saved||busy} onClick={()=>openDraft(m)}>{m.saved?'Saqlandi':'Tekshirish va saqlash'}<IconArrowRight size={16}/></button></div>}</article>)}
    {busy&&<p className="ai-thinking" role="status">AI javob tayyorlamoqda…</p>}<div ref={bottom}/>
   </div>
   {error&&<p className="error" role="alert">{error}</p>}
   {status?.available?<form className="ai-composer" onSubmit={submit}><label htmlFor="ai-message-input" className="ai-composer-label">AI’ga xabar</label><textarea id="ai-message-input" ref={composer} rows={3} maxLength={2000} disabled={busy} value={inputs[mode]} placeholder="Xabaringizni yozing…" onChange={e=>setInputs(s=>({...s,[mode]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/><div className="ai-composer-footer"><small>Enter — yuborish · Shift + Enter — yangi qator</small><button className="button primary" disabled={busy||!inputs[mode].trim()||!scheduleDate} aria-label="Xabarni yuborish"><IconArrowUp size={20}/>{busy?'Kutilmoqda…':'Yuborish'}</button></div></form>:<div className="ai-unavailable"><p role="status">{!status?'Ulanish tekshirilmoqda…':status.demo?'AI shaxsiy logoped hisobida ishlaydi.':'AI ulanishi hali sozlanmagan.'}</p><button className="text-button" onClick={()=>void check()}>Ulanishni qayta tekshirish</button></div>}
   <p className="ai-privacy">Yozgan xabaringiz va shu sahifadagi so‘nggi suhbat Gemini’ga yuboriladi. Rejalashtirishda faqat band sana va vaqtlar qo‘shiladi. Suhbat sahifadan chiqishda tozalanadi. Yozuvlar faqat formani tasdiqlaganingizda saqlanadi.</p>
  </section>}
 </div>;
}
