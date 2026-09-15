import {useEffect,useState} from 'react';
export function BackupStatus(){
 const [state,setState]=useState<{lastSuccess:string|null;lastError:string|null;running:boolean}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/backup-status').then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error);if(active)setState(v)}).catch(()=>{if(active)setError('Zaxira holatini yuklab bo‘lmadi. Sahifani yangilang.')});return()=>{active=false}},[]);
 return <section className="panel settings-card backup-status"><h2>Zaxira nusxa</h2><p>Bemorlaringiz, qabullar va natijalar server ishga tushganda va har 6 soatda zaxiralanadi. Oxirgi 30 nusxa saqlanadi.</p><p role="status">{state?.lastSuccess?'Oxirgi zaxira: '+new Date(state.lastSuccess).toLocaleString('uz-UZ'):state?.running?'Zaxira tayyorlanmoqda…':state?'Hali muvaffaqiyatli zaxira qayd etilmagan.':'Tekshirilmoqda…'}</p>{(error||state?.lastError)&&<p className="error" role="alert">{error||state?.lastError}</p>}<p className="hint">Kompyuter diski buzilishidan himoya uchun nusxani alohida diskda ham saqlang.</p></section>
}
