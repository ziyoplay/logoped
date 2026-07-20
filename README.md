# Logoped.uz — ish kabineti

Logoped uchun mijozlar, qabullar, topshiriqlar va hisobotlarni yuritish ilovasi (Next.js).

## Imkoniyatlar

- 📅 **Kunlik reja** — bugungi qabullar va topshiriqlar avtomatik
- 👥 **Mijozlar ro'yxati** — tashxis, telefon, tarix, qidiruv
- 🗓️ **Qabul qilish** — rejalashtirish, keldi/kelmadi, to'lov nazorati
- 📝 **Topshiriqlar** — uyga vazifalar, muddat, bajarilish holati
- 🔔 **Avto nazorat** — to'lanmagan qabullar, muddati o'tgan topshiriqlar, kelmay qo'ygan mijozlar, tugayotgan tovarlar
- 🧩 **Mashq turlari** — mashqlar kutubxonasi (8 ta tayyor mashq bilan)
- 📈 **Oldin / Keyin** — rasm bilan natijalarni hujjatlashtirish
- 🛍️ **Tovarlar** — ombor va sotuvlar
- 📊 **Hisobot** — oylik tushum, qarzdorlik, mijozlar kesimida
- 🔐 **Login tizimi** — logoped hisobi + har bir mijozga alohida kabinet (logoped o'zi yaratadi)

## Ishga tushirish

```bash
npm install
npm run dev      # http://localhost:3000
```

Ishlab chiqarish (server) uchun:

```bash
npm run build
npm start
```

### Port

Port `PORT` muhit o'zgaruvchisidan olinadi, ko'rsatilmasa 3000 bo'ladi:

```bash
PORT=8020 npm start              # Linux / server
$env:PORT=8020; npm start        # Windows PowerShell
```

⚠️ **Diqqat:** `PORT` ni `.env` fayliga yozish **ishlamaydi**. Next.js CLI portni
`.env` fayllari yuklanishidan oldin o'qiydi, shuning uchun port faqat haqiqiy
muhit o'zgaruvchisi orqali beriladi (Coolify/Docker'ning "Environment Variables"
bo'limi — bu haqiqiy o'zgaruvchi, u ishlaydi). `DATABASE_URL` esa `.env` dan
normal o'qiladi.

Coolify'da joylashtirishda ikkita joy mos bo'lishi shart: `PORT` o'zgaruvchisi
va resursning **Ports Exposes** maydoni — ikkalasi ham bir xil port bo'lsin,
aks holda proksi 502 qaytaradi.

## Muhim

Ma'lumotlar brauzerning `localStorage`'ida saqlanadi — har qurilmada alohida.
Yon menyudagi **⬇ Zaxira** tugmasi bilan muntazam nusxa olib turing.
