import {useEffect,useRef,useState,type FormEvent} from 'react';
import {IconSparkles,IconCheck} from '@tabler/icons-react';
import {api} from './api';
import './ai-exercises.css';

type Draft={title:string;category:string;duration:number;instructions:string};
type Status={available:boolean;configured:boolean;demo:boolean};
export function AiExercises({onSaved}:{onSaved:()=>Promise<void>}){
 const [status,setStatus]=useState<Status|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[reviewed,setReviewed]=useState(false);
 const titleInput=useRef<HTMLInputElement>(null);
 async function check(){setError('');try{setStatus(await api<Status>('/ai/status'));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void check();},[]);
 useEffect(()=>{if(draft)titleInput.current?.focus();},[!!draft]);
 async function generate(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||saving)return;
  const values=new FormData(event.currentTarget);setBusy(true);setError('');setSuccess('');
  try{const result=await api<{draft:Draft}>('/ai/exercise-draft',{method:'POST',body:JSON.stringify({age:Number(values.get('age')),sound:values.get('sound'),goal:values.get('goal'),duration:Number(values.get('duration'))})},60000);setDraft(result.draft);setReviewed(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!draft||!reviewed||saving||busy)return;
  setSaving(true);setError('');setSuccess('');
  try{await api('/exercises',{method:'POST',body:JSON.stringify(draft)});setDraft(null);setReviewed(false);setSuccess('Mashq kutubxonaga saqlandi.');try{await onSaved();}catch{setError('Mashq saqlandi, lekin ro‘yxat yangilanmadi. Sahifani yangilang.');}}catch(e){setError((e as Error).message);}finally{setSaving(false);}
 }
 function edit(patch:Partial<Draft>){setDraft(value=>value?{...value,...patch}:null);setReviewed(false);}
 return <section className="panel ai-exercises" aria-label="AI mashq yordamchisi">
  <div className="section-heading"><div><h2><IconSparkles size={21}/> AI yordamchi</h2><p>Yosh va tovushga mos mashq loyihasini tayyorlang.</p></div><button type="button" className="button secondary" aria-expanded={open} aria-controls="ai-exercise-content" onClick={()=>setOpen(!open)}>{open?'Yopish':'AI bilan mashq tayyorlash'}</button></div>
  {open&&<div id="ai-exercise-content">
   {!status?(!error&&<p role="status">Ulanish tekshirilmoqda…</p>):!status.available?<p className="muted" role="status">{status.demo?'AI yordamchi shaxsiy logoped hisobida ishlaydi.':'AI yordamchi hali ulanmagan. Gemini ulanishi sozlangach mashq tayyorlash ochiladi.'}</p>:<>
    <p className="muted">Gemini’ga faqat tanlangan yosh, tovush, maqsad va davomiylik yuboriladi. Natijani bemorga moslab tekshiring.</p>
    <form onSubmit={generate} aria-label="AI mashq parametrlari"><fieldset disabled={busy||saving} className="ai-parameters"><div className="form-grid">
     <label className="field">Yosh (yil)<input name="age" type="number" min={3} max={18} defaultValue={5} required/></label>
     <label className="field">Tovush<select name="sound" defaultValue="r">{['r','l','s','sh','z','ch','j','t','d','k','g'].map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="field">Mashq maqsadi<select name="goal">{['Tovushni eshitib farqlash','Bo‘g‘inlarda mustahkamlash','So‘zlarda mustahkamlash','Gaplarda mustahkamlash'].map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="field">Davomiyligi (daqiqa)<input name="duration" type="number" min={3} max={15} defaultValue={5} required/></label>
    </div><button className="button primary" disabled={busy||saving||!!draft}><IconSparkles size={18}/>{busy?'Tayyorlanmoqda…':'Mashq loyihasini tayyorlash'}</button></fieldset></form>
    {busy&&<p role="status">Gemini mashq tayyorlamoqda. Bu bir oz vaqt olishi mumkin.</p>}
    {draft&&<form className="ai-draft" aria-label="AI mashq loyihasi" onSubmit={save}><h3>Mashq loyihasi</h3><p className="muted">Tahrirlang va tekshirgandan so‘ng saqlang. Mijozga avtomatik yuborilmaydi.</p><fieldset disabled={saving} className="ai-parameters">
     <label className="field">Mashq nomi<input ref={titleInput} required maxLength={150} value={draft.title} onChange={e=>edit({title:e.target.value})}/></label>
     <div className="form-grid"><label className="field">Yo‘nalish<select value={draft.category} onChange={e=>edit({category:e.target.value})}>{['Talaffuz','Artikulyatsiya','Nafas','Lug‘at','Boshqa'].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Mashq davomiyligi<input type="number" min={1} max={120} required value={draft.duration} onChange={e=>edit({duration:Number(e.target.value)})}/></label></div>
     <label className="field">Bajarish tartibi<textarea required maxLength={5000} rows={12} value={draft.instructions} onChange={e=>edit({instructions:e.target.value})}/></label>
     <label className="ai-review"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Mashqni tekshirdim va qo‘llashga mos deb topdim.</label>
     <div className="ai-actions"><button className="button primary" disabled={!reviewed||saving}><IconCheck size={18}/>{saving?'Saqlanmoqda…':'Kutubxonaga saqlash'}</button><button type="button" className="button secondary" onClick={()=>{setDraft(null);setReviewed(false);}}>Loyihani bekor qilish</button></div>
    </fieldset></form>}
   </>}
   {error&&<p className="error" role="alert">{error}</p>}{(!status||!status.available)&&<button className="text-button" onClick={()=>void check()}>Ulanishni qayta tekshirish</button>}{success&&<p role="status">{success}</p>}
  </div>}
 </section>;
}
