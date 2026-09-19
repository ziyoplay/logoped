import {useEffect,useState} from 'react';
import {api} from './api';
import './telegram-inbox.css';
type Question={id:string;patient_name:string;body:string;answer:string;state:string;created_at:number};
const states:Record<string,string>={new:'Javob kutilmoqda',pending:'Yuborish navbatida',sending:'Yuborilmoqda',sent:'Telegramga yuborildi',failed:'Yuborish tasdiqlanmadi'};
export function TelegramInbox(){
 const [questions,setQuestions]=useState<Question[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[ready,setReady]=useState(false);
 async function reload(){setQuestions(await api<Question[]>('/telegram/questions'));setReady(true);}
 useEffect(()=>{let active=true;const refresh=()=>{if(document.visibilityState==='visible')api<Question[]>('/telegram/questions').then(rows=>{if(active){setQuestions(rows);setReady(true);setError('');}}).catch(e=>{if(active)setError(e.message);});};refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[]);
 async function send(id:string,answer?:string){setBusy(id);setError('');try{await api('/telegram/questions/'+id+(answer===undefined?'/retry':'/reply'),{method:'POST',body:answer===undefined?undefined:JSON.stringify({answer})});await reload();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 return <section className="panel telegram-inbox"><div className="section-heading"><div><h2>Telegram murojaatlari</h2><p>Bemorlarning savollari va ularga javoblar</p></div><span className="badge">{questions.filter(q=>q.state==='new').length} ta yangi</span></div>
 {error&&<p className="error" role="alert">{error}</p>}
 {!questions.length&&<p className="muted">{ready?'Hozircha murojaat yo‘q. Bemor botdagi “Logopedga murojaat” tugmasidan savol yuborishi mumkin.':'Murojaatlar yuklanmoqda…'}</p>}
 <div className="telegram-inbox-list">{questions.map(q=><article key={q.id} className="telegram-question"><header><strong>{q.patient_name}</strong><span className="badge">{states[q.state]||q.state}</span></header><small>{new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Tashkent'}).format(new Date(Number(q.created_at)))} · Toshkent</small><p className="question-body">{q.body}</p>
 {q.answer&&<div className="question-answer"><strong>Sizning javobingiz</strong><p>{q.answer}</p></div>}
 {q.state==='new'&&<form onSubmit={e=>{e.preventDefault();void send(q.id,String(new FormData(e.currentTarget).get('answer')||''));}}><label className="field"><span>{q.patient_name} uchun javob</span><textarea name="answer" required maxLength={2000} rows={3} placeholder="Javobingizni yozing…"/></label><button className="button primary" disabled={Boolean(busy)}>{busy===q.id?'Saqlanmoqda…':'Javobni Telegramga yuborish'}</button></form>}
 {q.state==='failed'&&<><p className="hint">Telegram ulanishini tekshiring. Javob yetib borgan bo‘lsa, qayta yubormang.</p><button className="button secondary" disabled={Boolean(busy)} onClick={()=>void send(q.id)}>Javobni qayta yuborish</button></>}
 </article>)}</div></section>;
}
