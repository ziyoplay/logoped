# Nutq — bitta logoped uchun shaxsiy ilova

Bemorlar, qabul jadvali, mashqlar, natijalar va profil bitta logopedning kundalik ishlari uchun mo‘ljallangan. Kompyuter va telefonda bir xil hisobga kiring — ikkalasi serverdagi bir xil SQLite bazadan foydalanadi. Jamoa, xodim taklifi va logopedga biriktirish boshqaruvlari yo‘q. Har bir hisob faqat o‘z yozuvlarini ko‘radi.

## Ishga tushirish

Node.js 24 kerak:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Kompyuterda http://localhost:3001 ni oching. Keyingi safar `Start-Nutq.cmd` orqali ishga tushiring. Server kompyuteri yoqilgan va jarayon ishlayotgan bo‘lishi kerak.

1. «Hisob yarating» orqali shaxsiy hisob yarating. Haqiqiy bemorlarni namuna hisobiga kiritmang.
2. O‘ng yuqoridagi avatar orqali profil, telefon, ish manzili va amaliyot nomini kiriting.
3. Bemorlarni qo‘shing, qabul belgilang, mashq va natijalarni saqlang. Jadvaldagi vaqtlar bir-biriga to‘qnashmaydi.
4. Telefonda ham shu serverga, shu email va parol bilan kiring. Alohida telefon hisobi ochish kerak emas.
5. Sozlamalarda zaxira holati, JSON eksport va parolni o‘zgartirish mavjud.

`.env.example` nusxasini `.env` qilib sozlamalarni o‘zgartirish mumkin. Baza allaqachon mavjud, shaxsiy foydalanish uchun yangi PostgreSQL/Supabase ochish shart emas. Email tasdiqlash va email orqali parol tiklash hali ulanmagan.

## Ma’lumotlarni himoyalash

- Tarixi mavjud bemor o‘chirilmaydi. Bemor kartasini tahrirlab «Holati → Arxivda» tanlang: qabul va natijalar saqlanadi.
- Ikki qurilmada bir yozuv yoki profil tahrirlansa, eskirgan nusxa yangisini bosib ketmaydi. Xatoda yozilgan matnni nusxalab, oynani yoping, yangilang va qayta oching.
- Qo‘shish/tahrirlash/o‘chirish va faoliyat jurnaliga yozish bitta baza tranzaksiyasida bajariladi. Server amallar jurnalini saqlaydi; bu eski maydon qiymatlarini saqlovchi to‘liq tarix emas.
- Serverga muvaffaqiyatli saqlanganidan keyin ro‘yxat yangilanmasa, ilova «saqlandi» deb bildiradi va qayta yuklashni taklif qiladi. Yangi yozuvni qayta kiritishga hojat yo‘q.
- Parollar scrypt bilan xeshlanadi. Sessiyalar HttpOnly, SameSite=Strict; bazada token xeshi saqlanadi. HTTPS sozlanganda Secure qo‘shiladi. Sessiya 7 kunlik, parol o‘zgarganda boshqa sessiyalar yopiladi.
- Zaxira va eksportlar ham shaxsiy ma’lumotlarni o‘z ichiga oladi. SQLite fayli ilova darajasida shifrlanmagan; kompyuter/diski va zaxira papkasini himoyalash talab qilinadi.

## Avtomatik zaxira va tiklash

Server ishga tushganda va keyin har 6 soatda yaxlit SQLite zaxira oladi, `integrity_check` bilan tekshiradi va oxirgi 30 nusxani saqlaydi. Odatiy papka: `data/backups`. Holati Sozlamalar → Zaxira nusxa bo‘limida ko‘rinadi. Avtomatik zaxira server o‘chiq bo‘lsa ishlamaydi.

Kompyuter diski buzilsa bir diskdagi baza va zaxira birga yo‘qolishi mumkin. Alohida disk yoki tarmoq papkasi tayyorlang:

```dotenv
BACKUP_DIRECTORY=E:/Nutq-zaxira
```

Tarmoq/disk uzilib qolsa zaxira xatosi ko‘rsatiladi. Papkaga xizmat ko‘rsatuvchi Windows foydalanuvchisi yozish huquqiga ega bo‘lsin. Qo‘lda nusxa olish:

```powershell
npm.cmd run backup
```

Tiklash doimo **yangi faylga** bajariladi. Skript mavjud bazani ustidan yozmaydi. Tiklangan nusxadagi sessiyalar va takliflar bekor qilinadi:

```powershell
npm.cmd run restore -- data/backups/nutq-TANLANGAN-SANA.sqlite data/restored.sqlite
```

So‘ng serverni to‘xtating, `.env`ga `DATABASE_PATH=data/restored.sqlite` yozing va qayta ishga tushiring. Foydalanuvchilar qayta kiradi. Avvalgi bazani saqlab qoling. JSON eksport qayta tiklash uchun SQLite nusxaning o‘rnini bosmaydi; JSON import hali yo‘q. To‘liq SQLite zaxira serverdagi barcha hisoblarni o‘z ichiga oladi, uni boshqalarga tarqatmang.

## Telefon ulanishi

Mahalliy sinov APK: `artifacts/nutq-debug.apk` (Android 8.0+). APK frontendni serverdan oladi, shu sababli bu veb yangilanishlar uchun qayta o‘rnatish shart emas. «Yangilash» tugmasini bosing.

Bir xil Wi-Fi/LAN sinovi: kompyuterda `ipconfig` orqali IPv4 toping, telefonda masalan `http://192.168.1.4:3001` kiriting. Windows Firewall Private tarmoq ruxsati kerak bo‘lishi mumkin. USB sinovida ADB reverse bilan `http://127.0.0.1:3001` ishlaydi; kabel uzilganda bu usul ishlamaydi.

**Haqiqiy bemor ma’lumotlarini tarmoq orqali ishlatishdan oldin HTTPSni sozlang.** Hozirgi `localhost:3001` sinov serveri HTTP. Ishlaydigan HTTPS domeni/proxy, serverni doimiy ishga tushirish va tashqi zaxira manzili hali muhitda sozlanmagan. Namuna `deploy/Caddyfile` berilgan; domenni o‘zingiznikiga almashtiring, Node uchun `COOKIE_SECURE=true`, `TRUST_PROXY=1` qo‘ying. Node portini faqat ishonchli proxy/LAN uchun oching. SQLite faylini tarmoq diskida bir nechta Node serverga birgalikda ochmang; bitta Node server lokal doimiy diskdan foydalansin.

Kompyuter va telefon bitta serverga ulanadi. PostgreSQL/Supabase to‘g‘ridan-to‘g‘ri ulanmagan; bunday bazaga o‘tish alohida migratsiya talab qiladi. Ilova server uzilganda offline yozuv saqlamaydi.

APK ishlab chiqish kaliti bilan imzolangan. Tarqatish uchun release APKni doimiy kalit bilan imzolash kerak. Release faqat HTTPS qabul qiladi. Android Studio yoki JDK17, SDK36 va build-tools35.0.0 bilan:

```powershell
npm.cmd run android:build
```

## Sozlamalar

| Muhit o‘zgaruvchisi | Odatiy qiymat |
|---|---|
| HOST / PORT | 0.0.0.0 / 3001 |
| DATABASE_PATH | data/nutq.sqlite |
| BACKUP_DIRECTORY | Baza yonidagi backups papkasi |
| COOKIE_SECURE | false; HTTPS uchun true |
| TRUST_PROXY | o‘chiq; bitta ishonchli proxy uchun 1 |
| ALLOW_REGISTRATION | true; yangi hisoblar ochilishini false bilan yoping |
| ALLOW_DEMO | true; haqiqiy serverda false tavsiya qilinadi |

## Tekshirish

```powershell
npm.cmd test
npm.cmd run build
npm.cmd start
# Boshqa terminalda:
npm.cmd run test:ui
```

UI testlarida Chromium kerak; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` bilan mavjud brauzer yo‘lini berish mumkin. API, eski bazani migratsiya, zaxiradan tiklash, hisoblar ajratilishi, vaqtlar, eski tahrirlar va kompyuter/telefon UI jarayonlari testlangan. Stress testi, mustaqil xavfsizlik auditi va production hosting sinovi bajarilmagan.
