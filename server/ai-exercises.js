import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {gemini} from './gemini.js';
import {mountAiChat} from './ai-chat.js';

const inputSchema=z.object({
 age:z.number().int().min(3).max(18),
 sound:z.enum(['r','l','s','sh','z','ch','j','t','d','k','g']),
 goal:z.enum(['Tovushni eshitib farqlash','Bo‘g‘inlarda mustahkamlash','So‘zlarda mustahkamlash','Gaplarda mustahkamlash']),
 duration:z.number().int().min(3).max(15),
}).strict();
const draftSchema=z.object({title:z.string().trim().min(1).max(150),instructions:z.string().trim().min(30).max(4500)}).strict();

export function mountAiExercises(app,options={},db){
 const {configured,generate}=gemini(options);
 app.get('/api/ai/status',(req,res)=>res.json({configured,available:configured&&!req.user.demo,demo:!!req.user.demo}));
 const limitOptions={windowMs:60*60*1000,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'AI so‘rovlar limiti tugadi. Bir soatdan keyin qayta urinib ko‘ring.'}};
 const guard=[(req,res,next)=>{
  if(req.user.demo)return res.status(403).json({error:'AI yordamchi shaxsiy logoped hisobida ishlaydi.'});
  if(!configured)return res.status(503).json({error:'AI yordamchi hali ulanmagan. Serverda Gemini kalitini sozlash kerak.'});
  next();
 },rateLimit({...limitOptions,limit:30,keyGenerator:req=>req.user.id}),rateLimit({...limitOptions,limit:120,keyGenerator:()=> 'ai'})];
 app.post('/api/ai/exercise-draft',...guard,async(req,res)=>{
  const input=inputSchema.parse(req.body);
  const raw=await generate("Siz o‘zbek tilida (lotin yozuvida) logoped uchun qisqa mashq LOYIHASINI tayyorlaysiz. Logoped tekshirishi va moslashtirishi shart. Tashxis, davolash kafolati, dori, og‘izga buyum solish, mexanik manipulyatsiya, nafasni ushlab turish yoki yutish mashqlarini taklif qilmang. Faqat yoshga mos, kattalar kuzatuvidagi oddiy nutq, tinglash va so‘zli o‘yinlar. Tovushni avtomatik qo‘yishga urinmang. Tovush mavjud deb olinadigan mustahkamlash bosqichini logoped baholaydi. So‘z misollari tanlangan tovushni o‘z ichiga olsin. Mashq ko‘rsatmasida maqsad, kerakli jihozlar, 3–5 aniq qadam, mos so‘z misollari va kuzatuv mezoni bo‘lsin. Noqulaylik bo‘lsa mashqni to‘xtatish va logoped bilan moslashtirishni eslating. Manba, tadqiqot va natijalarni uydirmang.",[{role:'user',parts:[{text:JSON.stringify(input)}]}],{type:'object',properties:{title:{type:'string'},instructions:{type:'string'}},required:['title','instructions'],additionalProperties:false});
  const draft=draftSchema.safeParse(raw);
  if(!draft.success)return res.status(502).json({error:'Gemini to‘liq mashq tayyorlay olmadi. Qayta urinib ko‘ring.'});
  res.json({draft:{...draft.data,category:'Talaffuz',duration:input.duration}});
 });
 mountAiChat(app,db,{guard,generate});
}
