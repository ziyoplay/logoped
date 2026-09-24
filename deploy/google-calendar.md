# Google Calendar ulanishi

Ilova alohida **Nutq — Qabullar** Google taqvimini yaratadi. Faqat shu taqvimda ishlaydi; asosiy shaxsiy taqvimni o‘qimaydi. Saytdagi yangi kelgusi qabullar unga yoziladi. Google’da yaratilgan qabul saytda bemorga bir marta bog‘lanadi. Keyingi vaqt o‘zgarishlari va bekor qilish ikki tomonda sinxronlanadi.

## Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) ichida loyiha yarating yoki tanlang. **APIs & Services → Library → Google Calendar API → Enable**.
2. **Google Auth Platform** bo‘limida ilova nomini `Nutq — Qabullar`, support/developer email sifatida o‘zingizning emailingizni kiriting. Shaxsiy Google hisobi uchun External auditoriya tanlanadi.
3. Data Access’da faqat `https://www.googleapis.com/auth/calendar.app.created` scope’ini kiriting.
4. Sinov rejimida Audience → Test users’da logopedning Google hisobini qo‘shing. Testing rejimida bu scope uchun refresh token odatda 7 kunda tugaydi; doimiy ishlatish oldidan Google’ning nashr/verifikatsiya talablarini bajaring.
5. Clients → Create client → **Web application**. Authorized redirect URI aynan:

   `https://logoped-frontend-3wqueu-e9f877-13-140-185-49.sslip.io/api/google/callback`

   Lokal sinov uchun alohida URI qo‘shish mumkin: `http://localhost:3001/api/google/callback`.
6. Client ID va Client secret’ni serverning maxfiy environment sozlamalariga joylang. Kalitlarni chatga, GitHub’ga yoki frontend kodiga kiritmang. Google production consent uchun domen egaligini tasdiqlash talab qilsa, o‘zingizga tegishli domenni bog‘lab, redirect URI’ni yangilang.

## Server sozlamalari

`.env.example` ichidagi quyidagi qiymatlarni haqiqiy serverda belgilang. `VITE_` prefiksidan foydalanmang.

```dotenv
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN/api/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=base64-encoded-32-random-bytes
```

Shifrlash kalitini serverda kriptografik tasodifiy 32 baytdan yarating. Masalan, Node’da `randomBytes(32).toString('base64')`. Uni muhit sozlamalarida saqlang va zaxiralang. Kalitni almashtirish mavjud Google ulanishlarini o‘qib bo‘lmaydigan qiladi; qayta ulash kerak bo‘ladi. Access va refresh tokenlar bazada AES-256-GCM bilan shifrlanadi. Client secret faqat server muhitida turadi.

Serverni qayta deploy qiling, shaxsiy hisobga kiring, **Qabul jadvali → Google’ni ulash** tugmasini bosing va Google ruxsatini tasdiqlang. OAuth callback faol sayt sessiyasiga bog‘langan, bir martalik 10 daqiqalik state va PKCE’dan foydalanadi.

## Ishlash tartibi

- Server Google o‘zgarishlarini har 60 soniyada tekshiradi; **Sinxronlash** tugmasi kutmasdan tekshiradi. Sayt ro‘yxati har 30 soniyada yangilanadi. Aloqa uzilsa keyingi tekshiruv yana urinadi.
- Google’da yangi qabulni aynan **Nutq — Qabullar** taqvimida yarating; saytda **Tafsilotlar → Bemorni tanlang → Bog‘lash**. Bemor aniqlanmaguncha xabar yuborilmaydi.
- Hozir bir kun ichidagi 5–240 daqiqalik qabullar qo‘llanadi. Takrorlanuvchi va butun kunlik tadbirlar tushuntirish bilan ko‘rsatiladi; avtomatik import qilinmaydi.
- Vaqtlar Asia/Tashkent. Google’dagi boshqa vaqt zonasi Toshkent vaqtiga aylantiriladi. Band vaqtni import qilish rad etiladi.
- Bir qabul ikkala tomonda o‘zgarsa avtomatik ustidan yozilmaydi. Tafsilotlardan **Google versiyasi** yoki **Sayt versiyasi** tanlanadi.
- Google’ga bemor ismi va qabul vaqti yoziladi. Klinik izohlar, tashxislar, natijalar, telefon, Telegram username va videolar tadbirga yozilmaydi.
- Telegram xabarlari uchun serverda `TELEGRAM_BOT_TOKEN` va bemorning bot bilan tasdiqlangan ulanishi kerak. Saytda yoki Google’da qabul yaratilishi, vaqti/nomi o‘zgarishi yoki bekor qilinishi navbatga tushadi. Telegram ishchisi har 5 soniyada bittadan xabar yuboradi. Tungi eslatmalar/24 soat oldin eslatish bu o‘zgarishga kirmaydi.
- Xabarning yuborilgani noma’lum bo‘lsa avtomatik takror yuborilmaydi. Tafsilotlarda xato ko‘rsatiladi; Telegramni tekshirgandan keyin qayta yuborish mumkin. Eskirgan kelgusi-qabul xabari yuborilmaydi.
- Ulanishni uzish tokenlarni saytdan olib tashlaydi, Google’dagi taqvim va qabullar saqlanadi. Google ruxsatini to‘liq bekor qilish hisobning ilovalarga ruxsatlar bo‘limida bajariladi. **Qayta ulash yangi Nutq taqvimini yaratadi**; eski taqvim avtomatik o‘chirilmaydi. Keraksiz eski taqvimni Google’da yashiring.
- Zaxiradan tiklash faol Google ulanishi va Telegram navbatini tiklamaydi: tarixiy xabarlar qayta jo‘natilmaydi. Google’ni qayta ulang.

## Tekshirish

`npm test` ichidagi `tests/calendar.test.js` Google transportini va Telegram yuborishini soxta xizmat bilan tekshiradi; haqiqiy bemorga xabar ketmaydi. Production’da ulashdan keyin logopedning o‘z sinov bemori/Telegrami bilan qabul yarating, Google’da soatini o‘zgartiring, so‘ng bekor qilib ikki tomonni tekshiring. OAuth sozlanmaguncha Google integratsiyasi ishlayotgan deb hisoblanmaydi.

Manbalar: [Google scopes](https://developers.google.com/workspace/calendar/api/auth), [OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [incremental sync](https://developers.google.com/workspace/calendar/api/guides/sync), [conditional updates](https://developers.google.com/calendar/api/guides/version-resources).
