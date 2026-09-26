import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';

const inputSchema=z.object({
 age:z.number().int().min(3).max(18),
 sound:z.enum(['r','l','s','sh','z','ch','j','t','d','k','g']),
 goal:z.enum(['Tovushni eshitib farqlash','Bo‘g‘inlarda mustahkamlash','So‘zlarda mustahkamlash','Gaplarda mustahkamlash']),
 duration:z.number().int().min(3).max(15),
}).strict();
const draftSchema=z.object({title:z.string().trim().min(1).max(150),instructions:z.string().trim().min(30).max(4500)}).strict();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};

export function mountAiExercises(app,{key=process.env.GEMINI_API_KEY||'',model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',transport=fetch,timeoutMs=45000}={}){
 const configured=!!key.trim()&&/^gemini-[a-z0-9.-]+$/.test(model);
 app.get('/api/ai/status',(req,res)=>res.json({configured,available:configured&&!req.user.demo,demo:!!req.user.demo}));
 const limitOptions={windowMs:60*60*1000,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'AI so‘rovlar limiti tugadi. Bir soatdan keyin qayta urinib ko‘ring.'}};
 const perUser=rateLimit({...limitOptions,limit:10,keyGenerator:req=>req.user.id});
 const total=rateLimit({...limitOptions,limit:60,keyGenerator:()=> 'ai-exercises'});
 app.post('/api/ai/exercise-draft',(req,res,next)=>{
  if(req.user.demo)return res.status(403).json({error:'AI yordamchi shaxsiy logoped hisobida ishlaydi.'});
  if(!configured)return res.status(503).json({error:'AI yordamchi hali ulanmagan. Serverda Gemini kalitini sozlash kerak.'});
  next();
 },perUser,total,async(req,res)=>{
  const input=inputSchema.parse(req.body);
  let response;
  try{
   response=await transport(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(timeoutMs),
    body:JSON.stringify({
     systemInstruction:{parts:[{text:'Siz o‘zbek tilida (lotin yozuvida) logoped uchun qisqa mashq LOYIHASINI tayyorlaysiz. Logoped tekshirishi va moslashtirishi shart. Tashxis, davolash kafolati, dori, og‘izga buyum solish, mexanik manipulyatsiya, nafasni ushlab turish yoki yutish mashqlarini taklif qilmang. Faqat yoshga mos, kattalar kuzatuvidagi oddiy nutq, tinglash va so‘zli o‘yinlar. Tovushni avtomatik qo‘yishga urinmang. Tovush mavjud deb olinadigan mustahkamlash bosqichini logoped baholaydi. So‘z misollari tanlangan tovushni o‘z ichiga olsin. Mashq ko‘rsatmasida maqsad, kerakli jihozlar, 3–5 aniq qadam, mos so‘z misollari va kuzatuv mezoni bo‘lsin. Noqulaylik bo‘lsa mashqni to‘xtatish va logoped bilan moslashtirishni eslating. Manba, tadqiqot va natijalarni uydirmang.'}]},
     contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],
     generationConfig:{maxOutputTokens:3072,responseFormat:{text:{mimeType:'application/json',schema:{type:'object',properties:{title:{type:'string'},instructions:{type:'string'}},required:['title','instructions'],additionalProperties:false}}}},
    }),
   });
  }catch{fail(503,'Gemini vaqtida javob bermadi. Birozdan keyin qayta urinib ko‘ring.');}
  if(response.status===429)fail(429,'Gemini limiti tugadi. Birozdan keyin qayta urinib ko‘ring.');
  if(!response.ok)fail(502,'Gemini bilan ulanishda xato. Server kaliti va model sozlamasini tekshiring.');
  let draft;
  try{
   const data=await response.json(),candidate=data.candidates?.[0];
   if(candidate?.finishReason!=='STOP'||data.promptFeedback?.blockReason)throw new Error('Incomplete');
   const text=candidate.content.parts.filter(part=>!part.thought&&typeof part.text==='string').map(part=>part.text).join('');
   draft=draftSchema.parse(JSON.parse(text));
  }catch{fail(502,'Gemini to‘liq mashq tayyorlay olmadi. Qayta urinib ko‘ring.');}
  // Only return a draft. Existing exercise save requires a separate user action.
  res.json({draft:{...draft,category:'Talaffuz',duration:input.duration}});
 });
}
