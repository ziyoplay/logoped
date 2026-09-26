# Gemini mashq yordamchisi

Dokploy → logoped → frontend → Environment bo‘limida `GEMINI_API_KEY` ni saqlang.
Kalitni chat, GitHub yoki VITE_ o‘zgaruvchilariga yozmang. Boshqa server sozlamalarini saqlab qoling va Deploy qiling.
`GEMINI_MODEL=gemini-3.5-flash-lite` standart qiymat; hisobingizda mavjud bo‘lgan, generateContent va structured output qo‘llaydigan modeldan foydalaning.

Shaxsiy logoped hisobida Mashqlar kutubxonasi → AI bilan mashq tayyorlash. API kaliti bo‘lmasa holat xabari ko‘rinadi; demo va klient hisoblari Gemini so‘rovini yubora olmaydi.
Google’ga faqat qat’iy ro‘yxatdan tanlangan tovush va maqsad, 3–18 yosh oralig‘idagi yosh, 3–15 daqiqalik davomiylik yuboriladi. Bemor yozuvlari, ism, telefon va natijalar o‘qilmaydi. Model natijasi avtomatik saqlanmaydi yoki Telegram’ga yuborilmaydi.
Logoped loyihani tahrirlaydi, tekshirganini belgilaydi va mavjud mashqlar API orqali kutubxonaga saqlaydi.

Cheklovlar: har hisobga soatiga 10 so‘rov, server jarayoniga jami 60 so‘rov. Hisoblagichlar restartda yangilanadi; bu pul sarfining qat’iy chegarasi emas. Google Cloud’da kvotalarni ham sozlang. So‘rov 45 soniyada bekor qilinadi, avtomatik qayta urinish yo‘q. Provider xatolari va kalitlar foydalanuvchiga chiqarilmaydi.

Tekshiruv: `node --test tests/ai-exercises.test.js`; build’dan keyin `node scripts/test-ui-isolated.js tests/ui/ai-exercises.spec.js`. Sinovlarda Gemini transporti almashtiriladi; haqiqiy kalit bilan alohida so‘rov ulanishni tasdiqlashi kerak.

Rasmiy hujjatlar: https://ai.google.dev/gemini-api/docs/api-key va https://ai.google.dev/gemini-api/docs/generate-content/structured-output
