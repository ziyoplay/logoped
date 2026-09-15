import { useRef, useState } from 'react';
import { IconCheck, IconPhoto, IconTrash, IconUser } from '@tabler/icons-react';

export type User={id:string;role:string;clinic_id:string;revision:number;name:string;email:string;clinic:string;demo:boolean;specialty:string;phone:string;address:string;bio:string;experience_years:number|null;accent:string;avatar:string};
export type ProfileDraft=Pick<User,'name'|'clinic'|'specialty'|'phone'|'address'|'bio'|'experience_years'|'accent'|'avatar'>;
export const palettes:Record<string,{name:string;color:string;tint:string}>={green:{name:'Yashil',color:'#137e72',tint:'#e8f4f0'},blue:{name:'Ko‘k',color:'#326baf',tint:'#eaf1fb'},plum:{name:'Binafsha',color:'#80517e',tint:'#f4edf5'},orange:{name:'To‘q sariq',color:'#a75b2b',tint:'#fbf0e7'}};
const draftOf=(u:User):ProfileDraft=>({name:u.name,clinic:u.clinic,specialty:u.specialty||'Logoped',phone:u.phone||'',address:u.address||'',bio:u.bio||'',experience_years:u.experience_years??null,accent:u.accent||'green',avatar:u.avatar||''});

async function preparePhoto(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('JPG, PNG yoki WebP rasm tanlang.');
  if(file.size>5*1024*1024)throw new Error('Rasm hajmi 5 MB dan oshmasin.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Rasmni tayyorlab bo‘lmadi.');
    const edge=Math.min(image.naturalWidth,image.naturalHeight);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);
    ctx.drawImage(image,(image.naturalWidth-edge)/2,(image.naturalHeight-edge)/2,edge,edge,0,0,256,256);
    return canvas.toDataURL('image/jpeg',0.85);
  }catch(e){if(e instanceof Error&&e.message.includes('Rasmni'))throw e;throw new Error('Rasm ochilmadi. Boshqa rasm tanlang.');}finally{URL.revokeObjectURL(url);}
}

export function ProfileEditor({user,onSave}:{user:User;onSave:(draft:ProfileDraft)=>Promise<void>}){
  const [draft,setDraft]=useState(()=>draftOf(user)),[saved,setSaved]=useState(()=>draftOf(user)),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const update=<K extends keyof ProfileDraft>(key:K,value:ProfileDraft[K])=>setDraft(d=>({...d,[key]:value}));
  const changed=JSON.stringify(draft)!==JSON.stringify(saved);
  const palette=palettes[draft.accent]||palettes.green;
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await onSave(draft);setSaved({...draft});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="profile-customization"><form className="panel profile-editor" onSubmit={submit}>
    <div className="profile-section-heading"><h2>Profilni tahrirlash</h2><p>Ma’lumotlaringizni to‘ldiring. Yuqoridagi kartada natija darhol ko‘rinadi.</p></div>
    <fieldset disabled={busy||photoBusy}>
      <div className="photo-editor"><div className="profile-photo">{draft.avatar?<img src={draft.avatar} alt="Tanlangan profil rasmi"/>:<IconUser size={36}/>}</div><div><div className="photo-buttons"><button type="button" className="button secondary" onClick={()=>fileRef.current?.click()}><IconPhoto size={17}/>{photoBusy?'Tayyorlanmoqda…':'Rasm tanlash'}</button>{draft.avatar&&<button type="button" className="icon-button danger-text" aria-label="Profil rasmini olib tashlash" onClick={()=>update('avatar','')}><IconTrash size={18}/></button>}</div><p className="hint">JPG, PNG yoki WebP · 5 MB gacha<br/>Rasm markazidan kvadrat shaklda kesiladi.</p></div></div>
      <input ref={fileRef} className="photo-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Profil rasmi" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setPhotoBusy(true);setError('');try{update('avatar',await preparePhoto(file));}catch(e){setError((e as Error).message);}finally{setPhotoBusy(false);}}}/>
      <div className="profile-fields-grid"><section className="profile-field-section"><h3>Shaxsiy ma’lumotlar</h3><div className="form-grid"><label className="field"><span>Ism va familiya *</span><input required maxLength={100} value={draft.name} onChange={e=>update('name',e.target.value)} autoComplete="name"/></label><label className="field"><span>Mutaxassislik *</span><input required maxLength={100} value={draft.specialty} onChange={e=>update('specialty',e.target.value)} placeholder="Masalan, logoped-defektolog"/></label></div>
      <label className="field"><span>Markaz yoki amaliyot nomi *</span><input required disabled={user.role!=='admin'} maxLength={150} value={draft.clinic} onChange={e=>update('clinic',e.target.value)}/></label>
      <label className="field"><span>O‘zingiz haqingizda</span><textarea maxLength={1000} rows={4} value={draft.bio} onChange={e=>update('bio',e.target.value)} placeholder="Qaysi yo‘nalishlarda ishlaysiz? Yondashuvingiz haqida yozing."/><small className="character-count">{draft.bio.length}/1000</small></label></section><section className="profile-field-section"><h3>Aloqa va tajriba</h3>
      <div className="form-grid"><label className="field"><span>Telefon raqami</span><input type="tel" maxLength={30} value={draft.phone} onChange={e=>update('phone',e.target.value)} placeholder="+998 90 123 45 67" autoComplete="tel"/></label><label className="field"><span>Ish tajribasi (yil)</span><input type="number" min={0} max={80} step={1} value={draft.experience_years??''} onChange={e=>update('experience_years',e.target.value===''?null:Number(e.target.value))} placeholder="Masalan, 5"/></label></div>
      <label className="field"><span>Qabul manzili</span><input maxLength={200} value={draft.address} onChange={e=>update('address',e.target.value)} placeholder="Shahar, ko‘cha, markaz"/></label>
      <div className="profile-colors"><span>Profil va tugmalar rangi</span><div role="group" aria-label="Profil rangi">{Object.entries(palettes).map(([id,p])=><button type="button" key={id} className={draft.accent===id?'selected':''} aria-label={p.name} aria-pressed={draft.accent===id} onClick={()=>update('accent',id)}><i style={{background:p.color}}>{draft.accent===id&&<IconCheck size={15}/>}</i>{p.name}</button>)}</div></div></section></div>
    </fieldset>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="profile-save-bar"><span className="hint" role="status">{changed?'Saqlanmagan o‘zgarishlar bor':'Barcha o‘zgarishlar saqlangan'}</span><div><button className="button secondary" type="button" disabled={!changed||busy||photoBusy} onClick={()=>{setDraft({...saved});setError('');}}>Bekor qilish</button><button className="button primary" disabled={!changed||busy||photoBusy}>{busy?'Saqlanmoqda…':'Profilni saqlash'}</button></div></div>
  </form><aside className="profile-preview-wrap">
    <article className="panel profile-preview" style={{'--profile-color':palette.color,'--profile-tint':palette.tint} as React.CSSProperties}>
      <div className="preview-content">
        <div className="preview-identity"><div className="profile-photo">{draft.avatar?<img src={draft.avatar} alt="Profil rasmi namunasi"/>:<span>{draft.name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('')||'N'}</span>}</div><div><span className="preview-label">SIZNING PROFILINGIZ</span><h2>{draft.name||'Ism va familiya'}</h2><p className="preview-specialty">{draft.specialty||'Mutaxassislik'}{draft.experience_years!==null&&<span> · {draft.experience_years} yillik tajriba</span>}</p><span className="preview-clinic">{draft.clinic||'Markaz nomi'}</span></div></div>
        <div className="preview-details">{draft.bio&&<p className="preview-bio pre-wrap">{draft.bio}</p>}<dl>{draft.phone&&<><dt>Telefon</dt><dd>{draft.phone}</dd></>}{draft.address&&<><dt>Manzil</dt><dd>{draft.address}</dd></>}</dl><div className="preview-email">{user.demo?'Namuna hisobi':user.email}</div></div>
      </div>
    </article>
  </aside></section>;
}
