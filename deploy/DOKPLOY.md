# Nutq saytini Dokployda ishga tushirish

Mavjud sayt ilovasida quyidagilarni belgilang. PostgreSQL xizmatini qayta yaratish kerak emas.

| Sozlama | Qiymat |
| --- | --- |
| Repository | `ziyoplay/logoped` |
| Branch | `main` |
| Build type | `Dockerfile` |
| Dockerfile path | `Dockerfile` |
| Build context | `.` |
| Build stage | Bo‘sh — oxirgi runtime bosqichi ishlatiladi |
| Domain container port | `8020` |
| Domain path | `/`; `/api` yo‘li o‘zgartirilmaydi |

1. [dokploy.env.example](dokploy.env.example) qiymatlarini ilovaning Environment bo‘limiga kiriting. `DATABASE_URL`ni mavjud bazaning Internal Connection URL qiymatiga almashtiring. Ilova va baza bir ichki Docker tarmog‘ida bo‘lishi kerak. `@` oldida `\` bo‘lmasin.
   Environment bo‘limida eski `PORT=3001` qolgan bo‘lsa, `PORT=8020`ga almashtiring: hosting muhiti Dockerfile qiymatidan ustun turadi. Domen porti ham `8020` bo‘lsin. Mahalliy `npm start` uchun odatiy port `3001` bo‘lib qoladi.
2. Zaxiralar saqlanishi uchun ilovaning `/app/data` katalogiga doimiy volume ulang.
3. Sozlamalarni saqlang va Deploy bosing. Dockerfile frontendni yig‘adi va API bilan birga Node 24 serverida ishga tushiradi. Alohida frontend/backend xizmatlarini yaratish shart emas.
4. Deploy tugagach sayt domenini tekshiring:

   ```sh
   npm run deploy:check -- https://SIZNING-DOMENINGIZ
   ```

Tekshiruv yozuv yaratmaydi. `/api/health` HTTP 200 JSON `{"ok":true}`, `/api/me` esa kirmagan foydalanuvchi uchun HTTP 401 JSON qaytarishi kerak. Docker konteynerining healthcheck amali API va baza salomatligini tekshiradi; domen yo‘naltirilishini tekshirish uchun yuqoridagi alohida buyruq ishlatiladi.

`Unexpected token '<'` yoki JSON o‘rniga HTML javobi domen statik sahifaga yo‘naltirilganini bildirishi mumkin. Faqat `dist` katalogini tarqatish yetarli emas. Ushbu fayllarni GitHubga yuklash Dokploydagi build turi, branch yoki domen portini avtomatik o‘zgartirmaydi.

Parollar faqat hosting Environment bo‘limida saqlanadi. `VITE_` o‘zgaruvchilariga baza ulanishini qo‘ymang. Baza noto‘g‘ri sozlangan bo‘lsa server ishga tushmaydi; PostgreSQL o‘rniga bo‘sh SQLite bazaga yashirin o‘tmaydi.

## Bemor videolari va Telegram

Environment bo‘limiga `TELEGRAM_BOT_TOKEN` qo‘shing. `VIDEO_DIRECTORY=/app/data/videos` va `/app/data` uchun doimiy volume kerak. Token frontendga yoki gitga yozilmaydi. Bot polling orqali ishlaydi; boshqa bot worker yoki webhook bilan bir paytda ishlatmang.

Bemor kartasida Telegram username kiriting, «Telegram ulash havolasi»ni oling va bemorga yetkazing. Bemor o‘z akkauntida Start bosadi; username mosligi serverda tekshiriladi. MP4 video (45 MB gacha) yuklanganda faqat shu bemorning ulangan Telegramiga yuboriladi. Noaniq yuborishdan so‘ng avtomatik takrorlanmaydi: Telegramni tekshirib, «Qayta yuborish»ni tanlang. `/stop` ulanishni uzadi.

Baza zaxirasi video fayllarini o‘z ichiga olmaydi: `/app/data/videos` katalogini ham alohida zaxiralang. Tiklashda Telegram ulanishlari xavfsizlik uchun qayta tasdiqlanadi.

### Bemor uchun Telegram menyusi

Ulash havolasi orqali Start bosgan bemor yoki ota-ona botda quyidagilarni ko‘radi:
- Natijalarim (`/natijalar`): oxirgi 10 natija, baho va logopedning natija izohi.
- Videolarim (`/videolar`): oxirgi 10 video; tugma tanlanganda video qayta yuboriladi.
- Keyingi qabul (`/qabul`): Toshkent vaqti bilan yaqin 5 ta rejalashtirilgan qabul.
- Mashqlarim (`/mashqlar`): oxirgi 5 ta biriktirilgan mashq va ko‘rsatma.
- Yordam (`/help`) va ulanishni uzish (`/stop`).

Natija, qabul va mashqlar menyu bosilganda olinadi; ular uchun avtomatik bildirishnoma yo‘q. Yangi video uchun avvalgi avtomatik yuborish saqlanadi. Botga yozilgan savollar logopedga uzatilmaydi. Bir ota-onaga bir nechta bemor ulangan bo‘lsa, yozuvlar bemor ismi bilan ko‘rsatiladi. Bemor kartasi va qabulning ichki izohlari botga chiqmaydi.

Token faqat serverdagi `TELEGRAM_BOT_TOKEN` o‘zgaruvchisida bo‘lishi kerak. Deploy/restartdan keyin bot buyruqlar menyusini avtomatik ro‘yxatdan o‘tkazadi. Boshqa polling jarayoni yoki webhook shu bot tokenidan bir vaqtda foydalanmasin.
