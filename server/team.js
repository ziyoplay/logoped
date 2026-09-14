import {randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
export const tokenHash=v=>createHash('sha256').update(v).digest('hex');
export function admin(req){if(req.user.role!=='admin'){const e=new Error('Bu amal faqat markaz rahbari uchun.');e.status=403;throw e;}}
export function audit(db,req,action,table,id){db.prepare('INSERT INTO audit_log(clinic_id,actor_id,action,record_type,record_id) VALUES(?,?,?,?,?)').run(req.user.clinic_id,req.user.id,action,table,id);}
export function mountTeam(app,db){
 app.get('/api/team',(req,res)=>res.json({members:db.prepare('SELECT id,name,specialty,role,disabled FROM users WHERE clinic_id=? ORDER BY role,name').all(req.user.clinic_id)}));
 app.post('/api/team/invites',(req,res)=>{admin(req);if(req.user.demo)return res.status(403).json({error:'Xodim taklif qilish uchun shaxsiy hisob yarating.'});
  const {email}=z.object({email:z.email().max(200).transform(v=>v.toLowerCase())}).parse(req.body);
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email))return res.status(409).json({error:'Bu email bilan hisob mavjud. Xodim uchun boshqa email kiriting.'});
  const token=randomBytes(24).toString('hex'),expires=Date.now()+86400000;
  db.prepare('DELETE FROM invitations WHERE (clinic_id=? AND email=?) OR expires<?').run(req.user.clinic_id,email,Date.now());
  db.prepare('INSERT INTO invitations(token,clinic_id,email,expires,created_by) VALUES(?,?,?,?,?)').run(tokenHash(token),req.user.clinic_id,email,expires,req.user.id);
  audit(db,req,'invite','team',email);res.status(201).json({code:token,expires,email});
 });
 app.patch('/api/team/:id',(req,res)=>{admin(req);const {disabled}=z.object({disabled:z.boolean()}).parse(req.body);
  const member=db.prepare('SELECT * FROM users WHERE id=? AND clinic_id=?').get(req.params.id,req.user.clinic_id);
  if(!member)return res.status(404).json({error:'Xodim topilmadi.'});
  if(member.role==='admin')return res.status(400).json({error:'Markaz rahbari hisobini bu yerdan yopib bo‘lmaydi.'});
  db.prepare('UPDATE users SET disabled=? WHERE id=?').run(Number(disabled),member.id);
  if(disabled)db.prepare('DELETE FROM sessions WHERE user_id=?').run(member.id);
  audit(db,req,disabled?'disable':'enable','team',member.id);res.json({ok:true});
 });
 app.get('/api/audit',(req,res)=>{admin(req);res.json(db.prepare('SELECT a.id,a.action,a.record_type,a.record_id,a.created_at,u.name AS actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id WHERE a.clinic_id=? ORDER BY a.id DESC LIMIT 100').all(req.user.clinic_id));});
}
