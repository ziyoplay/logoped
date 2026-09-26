# Gemini AI yordamchisi

Dokploy → logoped → frontend → Environment bo‘limida `GEMINI_API_KEY` ni saqlang.
Kalitni chat, GitHub yoki VITE_ o‘zgaruvchilariga yozmang. Boshqa server sozlamalarini saqlab qoling va Deploy qiling.
`GEMINI_MODEL=gemini-3.5-flash-lite` standart qiymat; hisobingizda mavjud bo‘lgan, generateContent va structured output qo‘llaydigan modeldan foydalaning.

Shaxsiy logoped hisobidagi alohida **AI** menyusi: Suhbat, Bemor qo‘shish, Qabul rejalashtirish, Mashq tayyorlash. API kaliti bo‘lmasa holat xabari ko‘rinadi; demo va klient hisoblari Gemini so‘rovini yubora olmaydi.

Suhbatda foydalanuvchi yozgan xabarlar (oxirgi 6 juft xabar va yangi savol) Google’ga yuboriladi. Xabarlar faqat sahifa xotirasida turadi; sahifadan chiqishda yo‘qoladi. Bemor kartasi rejimida faqat foydalanuvchi yozgan ma’lumot loyiha sifatida ajratiladi, bazadagi kartalar Google’ga yuklanmaydi. Noma’lum joylar bo‘sh qoladi va odatiy bemor formasida to‘ldiriladi.

Qabul rejalashtirishda tanlangan kundan 7 kunlik, faqat joriy logopedga tegishli band sana, vaqt va davomiylik yuboriladi. Bemorlar nomi, kontaktlar, qabul nomi va izohlar yuborilmaydi. Ish soatlari saqlanmagan: AI aytgan ish vaqti taklif hisoblanadi. Server band, o‘tgan va tekshirilgan oraliqdan tashqaridagi tayyor qabul loyihasini rad etadi. Bemorni logoped saytdagi formada tanlaydi. Saqlash mavjud appointment API orqali bajariladi: egalik, vaqt to‘qnashuvi, Google Calendar va Telegram navbati avvalgidek ishlaydi.

Mashq tayyorlashda Google’ga faqat tanlangan tovush va maqsad, 3–18 yosh, 3–15 daqiqalik davomiylik yuboriladi. Logoped mashqni tahrirlaydi, tekshirganini belgilaydi va kutubxonaga saqlaydi. AI endpointlari hech qachon yozuv saqlamaydi yoki xabar yubormaydi; barcha amallar alohida tasdiqlanadi.

Cheklovlar: suhbat va mashq uchun umumiy, har hisobga soatiga 30 so‘rov, server jarayoniga jami 120 so‘rov. Hisoblagichlar restartda yangilanadi; bu pul sarfining qat’iy chegarasi emas. Google Cloud’da kvotalarni ham sozlang. So‘rov 45 soniyada bekor qilinadi, avtomatik qayta urinish yo‘q. Provider xatolari va kalitlar foydalanuvchiga chiqarilmaydi.

Tekshiruv: `node --test tests/ai-exercises.test.js tests/ai-chat.test.js`; build’dan keyin `node scripts/test-ui-isolated.js tests/ui/ai-exercises.spec.js tests/ui/ai-workspace.spec.js`. Sinovlarda Gemini transporti almashtiriladi; haqiqiy kalit bilan alohida so‘rov ulanishni tasdiqlashi kerak.

Rasmiy hujjatlar: https://ai.google.dev/gemini-api/docs/api-key va https://ai.google.dev/gemini-api/docs/generate-content/structured-output
