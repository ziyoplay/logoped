import {createHash} from 'node:crypto';

const norfolk={name:'NHS · Just One Norfolk',url:'https://www.justonenorfolk.nhs.uk/speech-and-language/speech-sounds-toolkit/phonological-awareness-speech-sound-awareness/'};
const devon={name:'NHS · Children and Family Health Devon',url:'https://childrenandfamilyhealthdevon.nhs.uk/resources/listening-games-for-speech-sound-training/'};
const asha={name:'ASHA · Preschool communication activities',url:'https://www.asha.org/about/press-room/articles/8-speech-and-language-skills-to-practice-with-your-preschooler-at-home/'};
export const exerciseCatalog=[
 {id:'syllable-claps',title:'So‘zlarni qarsak bilan bo‘lish',category:'Talaffuz',duration:5,audience:'Katta maktabgacha yosh',materials:'Tanish buyumlar yoki rasmlar',source:norfolk,
  instructions:'Avval tanish so‘zni bo‘g‘inlarga ajratib, har bo‘g‘inda qarsak chaling: ol-ma. Bola tayyor bo‘lsa, sizga qo‘shilsin. Qarsaklarni birga sanang, so‘ng so‘zni butun ayting. Misollarni bolaning tiliga va imkoniyatiga mos tanlang.'},
 {id:'first-sound',title:'Bir xil tovushdan boshlanadi',category:'Talaffuz',duration:5,audience:'Tovushlarni tinglab ajrata oladigan bolalar',materials:'3–4 ta tanish buyum rasmi',source:norfolk,
  instructions:'Bir xil tovush bilan boshlanadigan rasmlarni tanlang va yoniga boshqa tovushli rasm qo‘ying. Nomlarini ayting. Bola o‘xshash boshlanishlarni topadi. Harf nomini emas, tovushni ayting. Kerak bo‘lsa, avval o‘zingiz namuna ko‘rsating.'},
 {id:'sound-walk',title:'Atrofdagi tovushlarni tinglaymiz',category:'Boshqa',duration:5,audience:'Kichik maktabgacha yosh',materials:'Tinch xona yoki xavfsiz sayr joyi',source:norfolk,
  instructions:'Televizorni o‘chirib, birga quloq soling. Soat, qush yoki mashina ovozini payqaganda uning manbasini ko‘rsating va nomlang. Navbat bilan tinglang. Boladan darhol so‘z bilan javob berishni talab qilmang; ko‘rsatishi ham suhbatga qo‘shilishdir.'},
 {id:'sound-towers',title:'Tovush minoralari',category:'Talaffuz',duration:5,audience:'Logoped tanlagan tovushlarni farqlash',materials:'Tovush kartalari va yirik kublar',source:devon,
  instructions:'Logoped tanlagan tovush kartalarini qo‘ying. Bir tovushni ayting; bola mos karta ustiga kub qo‘yadi. Qaysi minora balandroq bo‘lganini birga ko‘ring. Tayyor bo‘lganda so‘zning birinchi tovushiga mos karta tanlashga o‘ting.'},
 {id:'sound-car',title:'Mashina qaysi tovushga boradi?',category:'Talaffuz',duration:5,audience:'Tinglash va tovushni farqlash',materials:'O‘yinchoq mashina va tovush kartalari',source:devon,
  instructions:'Kartalarni polga tering. Logoped belgilagan tovushni ayting; bola mashinani mos kartaga olib boradi. Avval kamroq kartadan boshlang. Keyingi bosqichda tanish so‘zni aytib, boshlang‘ich tovushiga mos manzilni birga toping.'},
 {id:'minimal-pair-listening',title:'Bir tovush — boshqa ma’no',category:'Talaffuz',duration:5,audience:'Faqat logoped tanlagan so‘z juftlari bilan',materials:'Logoped tayyorlagan juft rasmlar',source:{name:'NHS · Kent Community Health',url:'https://www.kentcht.nhs.uk/leaflet/minimal-pairs-therapy/'},
  instructions:'Logoped bolaning talaffuziga mos juft so‘zlarni tanlaydi. Avval rasmlar ma’nosini tushuntiring. Juftlikdan bittasini ayting, bola mos rasmni ko‘rsatsin. Farqni eshita boshlagach, mutaxassis ko‘rsatmasi bilan rollarni almashtiring. Takrorlash sonini logoped belgilaydi.'},
 {id:'picture-story',title:'Rasmdan kichik hikoya',category:'Lug‘at',duration:10,audience:'3–5 yosh, til ko‘nikmasiga moslashtiriladi',materials:'Rasmli kitob yoki oilaviy rasm',source:asha,
  instructions:'Rasmda joy, qahramon va harakatni birga toping. Bola xohlagan tafsilotni aytsin, siz suhbatni davom ettiring. “Keyin nima bo‘ldi?” deb hikoya tuzishga yordam bering. Tanish kitobda avval, keyin va oxirida nima bo‘lganini muhokama qiling.'},
 {id:'describe-objects',title:'Buyumni tasvirlaymiz',category:'Lug‘at',duration:5,audience:'3–5 yosh, til ko‘nikmasiga moslashtiriladi',materials:'Tanish buyum yoki rangli materiallar',source:asha,
  instructions:'Bir buyumning rangi, ko‘rinishi va nima uchun ishlatilishi haqida suhbatlashing. Bola qiziqqan tafsilotga ergashing va yangi so‘zni gap ichida ko‘rsating. Sayrda ko‘rgan yoki eshitgan narsalarni ham ta’riflang. Javob berishi uchun vaqt qoldiring.'}
].map(e=>({...e,reviewed:'2026-09-24'}));

const importedId=(owner,id)=>{const h=createHash('sha256').update(owner+':catalog:'+id).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
export function mountExerciseCatalog(app,db){
 app.get('/api/exercise-catalog',async(req,res)=>{
  const owned=new Set((await db.prepare('SELECT id FROM exercises WHERE user_id=?').all(req.ownerId)).map(e=>e.id));
  res.json(exerciseCatalog.map(e=>({...e,imported:owned.has(importedId(req.ownerId,e.id))})));
 });
 app.post('/api/exercise-catalog/:id/import',async(req,res)=>{
  const e=exerciseCatalog.find(e=>e.id===req.params.id);if(!e)return res.status(404).json({error:'Mashq topilmadi.'});
  const id=importedId(req.ownerId,e.id);
  const instructions=`${e.instructions}\n\nKerakli jihozlar: ${e.materials}.\nMoslashtirish: ${e.audience}. Vaqt — tahrirlash mumkin bo‘lgan reja; logoped davomiylik va murakkablikni individual belgilaydi.\n\nManba: ${e.source.name}\n${e.source.url}\nManba asosidagi qisqa o‘zbekcha tavsif; rasmiy tarjima emas.`;
  await db.prepare('INSERT INTO exercises(id,user_id,title,category,duration,instructions,updated_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(id,req.ownerId,e.title,e.category,e.duration,instructions,req.user.id);
  res.json(await db.prepare('SELECT * FROM exercises WHERE id=? AND user_id=?').get(id,req.ownerId));
 });
}
