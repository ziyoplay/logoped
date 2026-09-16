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
| Domain container port | `3001` |
| Domain path | `/`; `/api` yo‘li o‘zgartirilmaydi |

1. [dokploy.env.example](dokploy.env.example) qiymatlarini ilovaning Environment bo‘limiga kiriting. `DATABASE_URL`ni mavjud bazaning Internal Connection URL qiymatiga almashtiring. Ilova va baza bir ichki Docker tarmog‘ida bo‘lishi kerak. `@` oldida `\` bo‘lmasin.
2. Zaxiralar saqlanishi uchun ilovaning `/app/data` katalogiga doimiy volume ulang.
3. Sozlamalarni saqlang va Deploy bosing. Dockerfile frontendni yig‘adi va API bilan birga Node 24 serverida ishga tushiradi. Alohida frontend/backend xizmatlarini yaratish shart emas.
4. Deploy tugagach sayt domenini tekshiring:

   ```sh
   npm run deploy:check -- https://SIZNING-DOMENINGIZ
   ```

Tekshiruv yozuv yaratmaydi. `/api/health` HTTP 200 JSON `{"ok":true}`, `/api/me` esa kirmagan foydalanuvchi uchun HTTP 401 JSON qaytarishi kerak. Docker konteynerining healthcheck amali API va baza salomatligini tekshiradi; domen yo‘naltirilishini tekshirish uchun yuqoridagi alohida buyruq ishlatiladi.

`Unexpected token '<'` yoki JSON o‘rniga HTML javobi domen statik sahifaga yo‘naltirilganini bildirishi mumkin. Faqat `dist` katalogini tarqatish yetarli emas. Ushbu fayllarni GitHubga yuklash Dokploydagi build turi, branch yoki domen portini avtomatik o‘zgartirmaydi.

Parollar faqat hosting Environment bo‘limida saqlanadi. `VITE_` o‘zgaruvchilariga baza ulanishini qo‘ymang. Baza noto‘g‘ri sozlangan bo‘lsa server ishga tushmaydi; PostgreSQL o‘rniga bo‘sh SQLite bazaga yashirin o‘tmaydi.
