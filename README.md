# Nutq — bitta logoped uchun shaxsiy ilova

Saytning bosh sahifasida Iroda logoped xizmatlari va aloqa ma’lumotlari ko‘rsatiladi. Bemorlar, qabul jadvali, mashqlar, natijalar va profil logopedning ish kabinetida boshqariladi; klientlar uchun alohida kabinet mavjud. Kompyuter va telefonda bir xil hisobga kiring — ikkalasi serverdagi bir xil PostgreSQL yoki SQLite bazadan foydalanadi. Jamoa, xodim taklifi va logopedga biriktirish boshqaruvlari yo‘q. Har bir hisob faqat o‘z yozuvlarini ko‘radi.

## Ishga tushirish

Node.js 24 kerak:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Kompyuterda http://localhost:3001 ni oching. Keyingi safar `Start-Nutq.cmd` orqali ishga tushiring. Server kompyuteri yoqilgan va jarayon ishlayotgan bo‘lishi kerak.

1. Bosh sahifadagi «Kabinetga kirish», keyin «Hisob yarating» orqali logoped hisobini yarating. Haqiqiy bemorlarni namuna hisobiga kiritmang.
2. O‘ng yuqoridagi avatar orqali profil, telefon, ish manzili va amaliyot nomini kiriting.
3. Bemorlarni qo‘shing, qabul belgilang, mashq va natijalarni saqlang. Jadvaldagi vaqtlar bir-biriga to‘qnashmaydi.
4. Telefonda ham shu serverga, shu email va parol bilan kiring. Alohida telefon hisobi ochish kerak emas.
5. Sozlamalarda zaxira holati, JSON eksport va parolni o‘zgartirish mavjud.

`.env.example` nusxasini `.env` qilib sozlamalarni o‘zgartirish mumkin. `DATABASE_URL` berilsa PostgreSQL, berilmasa lokal SQLite ishlatiladi. PostgreSQL ulanishi xato bo‘lsa server to‘xtaydi; boshqa bazaga yashirin o‘tmaydi. Email tasdiqlash va email orqali parol tiklash hali ulanmagan.

## Ma’lumotlarni himoyalash

- Tarixi mavjud bemor o‘chirilmaydi. Bemor kartasini tahrirlab «Holati → Arxivda» tanlang: qabul va natijalar saqlanadi.
- Ikki qurilmada bir yozuv yoki profil tahrirlansa, eskirgan nusxa yangisini bosib ketmaydi. Xatoda yozilgan matnni nusxalab, oynani yoping, yangilang va qayta oching.
- Qo‘shish/tahrirlash/o‘chirish va faoliyat jurnaliga yozish bitta baza tranzaksiyasida bajariladi. Server amallar jurnalini saqlaydi; bu eski maydon qiymatlarini saqlovchi to‘liq tarix emas.
- Serverga muvaffaqiyatli saqlanganidan keyin ro‘yxat yangilanmasa, ilova «saqlandi» deb bildiradi va qayta yuklashni taklif qiladi. Yangi yozuvni qayta kiritishga hojat yo‘q.
- Parollar scrypt bilan xeshlanadi. Sessiyalar HttpOnly, SameSite=Strict; bazada token xeshi saqlanadi. HTTPS sozlanganda Secure qo‘shiladi. Sessiya 7 kunlik, parol o‘zgarganda boshqa sessiyalar yopiladi.
- Zaxira va eksportlar ham shaxsiy ma’lumotlarni o‘z ichiga oladi. Zaxira fayllari ilova darajasida shifrlanmagan; ularda shaxsiy ma’lumotlar va parol xeshlari bor. Kompyuter/diski va zaxira papkasiga kirishni cheklang.

## Avtomatik zaxira va tiklash

Server ishga tushganda va keyin har 6 soatda tanlangan bazadan zaxira oladi va oxirgi 30 nusxani saqlaydi. SQLite nusxasi `integrity_check`, PostgreSQL JSON arxivi SHA-256 nazorat xeshi bilan tekshiriladi. PostgreSQL nusxasi bitta izchil tranzaksiya ichida olinadi. Odatiy papka: `data/backups`. Holati Sozlamalar → Zaxira nusxa bo‘limida ko‘rinadi. Avtomatik zaxira server o‘chiq bo‘lsa ishlamaydi.

Kompyuter diski buzilsa bir diskdagi baza va zaxira birga yo‘qolishi mumkin. Alohida disk yoki tarmoq papkasi tayyorlang:

```dotenv
BACKUP_DIRECTORY=E:/Nutq-zaxira
```

Tarmoq/disk uzilib qolsa zaxira xatosi ko‘rsatiladi. Papkaga xizmat ko‘rsatuvchi Windows foydalanuvchisi yozish huquqiga ega bo‘lsin. Qo‘lda nusxa olish:

```powershell
npm.cmd run backup
```

SQLite tiklash doimo **yangi faylga** bajariladi. Skript mavjud bazani ustidan yozmaydi. Tiklangan nusxadagi sessiyalar va takliflar bekor qilinadi:

```powershell
npm.cmd run restore -- data/backups/nutq-TANLANGAN-SANA.sqlite data/restored.sqlite
```

So‘ng serverni to‘xtating, `.env`ga `DATABASE_PATH=data/restored.sqlite` yozing va qayta ishga tushiring. Foydalanuvchilar qayta kiradi. Avvalgi bazani saqlab qoling. SQLite ishlatish uchun `DATABASE_URL`ni olib tashlang.

PostgreSQL tiklash **yangi schema**ga bajariladi; mavjud schema yoki ma’lumotlar ustidan yozilmaydi:

```powershell
npm.cmd run restore:postgres -- data/backups/nutq-pg-TANLANGAN-SANA.json nutq_restore_20260915
```

So‘ng `.env` yoki hosting muhitida `DATABASE_SCHEMA=nutq_restore_20260915` qilib serverni qayta ishga tushiring. Sessiyalar va takliflar tiklanmaydi, qayta kirish kerak. Sozlamalardagi hisob JSON eksporti to‘liq PostgreSQL zaxirasidan boshqa format; hisob eksportini import qilish hali yo‘q. To‘liq zaxira barcha hisoblarni o‘z ichiga oladi, uni boshqalarga tarqatmang.

## Telefon ulanishi

Mahalliy sinov APK: `artifacts/nutq-debug.apk` (Android 8.0+). APK frontendni serverdan oladi, shu sababli bu veb yangilanishlar uchun qayta o‘rnatish shart emas. «Yangilash» tugmasini bosing.

Bir xil Wi-Fi/LAN sinovi: kompyuterda `ipconfig` orqali IPv4 toping, telefonda masalan `http://192.168.1.4:3001` kiriting. Windows Firewall Private tarmoq ruxsati kerak bo‘lishi mumkin. USB sinovida ADB reverse bilan `http://127.0.0.1:3001` ishlaydi; kabel uzilganda bu usul ishlamaydi.

**Haqiqiy bemor ma’lumotlarini tarmoq orqali ishlatishdan oldin HTTPSni sozlang.** Hozirgi `localhost:3001` sinov serveri HTTP. Ishlaydigan HTTPS domeni/proxy, serverni doimiy ishga tushirish va tashqi zaxira manzili hali muhitda sozlanmagan. Namuna `deploy/Caddyfile` berilgan; domenni o‘zingiznikiga almashtiring, Node uchun `COOKIE_SECURE=true`, `TRUST_PROXY=1` qo‘ying. Node portini faqat ishonchli proxy/LAN uchun oching. SQLite faylini tarmoq diskida bir nechta Node serverga birgalikda ochmang; bitta Node server lokal doimiy diskdan foydalansin.

Kompyuter va telefon bitta ilova serveriga ulanadi. PostgreSQL paroli faqat backend muhitida saqlanadi; frontend yoki APKga kiritilmaydi. Ilova server uzilganda offline yozuv saqlamaydi.

APK ishlab chiqish kaliti bilan imzolangan. Tarqatish uchun release APKni doimiy kalit bilan imzolash kerak. Release faqat HTTPS qabul qiladi. Android Studio yoki JDK17, SDK36 va build-tools35.0.0 bilan:

```powershell
npm.cmd run android:build
```

## PostgreSQL va hosting

PostgreSQL bilan noldan boshlash uchun:

1. `.env.example`dan `.env` yarating va `DATABASE_URL`ga provayder bergan ulanish URLini kiriting. URLdagi `@` oldiga teskari qiya chiziq qo‘ymang; parolda maxsus belgilar bo‘lsa URL encoding ishlating.
2. `DATABASE_SCHEMA=nutq` qoldiring. Server birinchi ishga tushishda shu alohida schemani va jadvallarni yaratadi. Eski `public` jadvallar o‘zgarmaydi, eski SQLite/PostgreSQL ma’lumotlari avtomatik ko‘chirilmaydi.
3. Mahalliy kompyuter uchun tashqi host/port, hosting ichidagi ilova uchun o‘sha tarmoqdagi ichki host/port ishlating. DATABASE_URLni GitHubga yuklamang.
4. Hostingda GitHub branch `codex/nutq-personal`, build turi `Dockerfile`, ilova porti `3001` tanlanadi. Environment bo‘limiga `DATABASE_URL`, `DATABASE_SCHEMA=nutq` kiriting va deploy qiling. HTTPS proxy uchun yuqoridagi cookie/proxy sozlamalarini ham kiriting.
5. PostgreSQL ishlatilganda ham zaxiralar uchun `/app/data`ga doimiy volume ulang yoki `BACKUP_DIRECTORY`ni doimiy diskka yo‘naltiring. Nusxalarni alohida joyga saqlashni sozlang.

Asosiy jadvallar: `users`, `sessions`, `patients`, `appointments`, `exercises`, `results`, `audit_log`, `schema_migrations`, `client_accounts`, `patient_exercises`. Bemor, qabul va natijalar tashqi kalitlar bilan bog‘langan; ball, davomiylik va holat cheklovlari bazada ham tekshiriladi. `clinics` va `invitations` jadvallari eski kod bilan moslik uchun qolgan; amaldagi ilova bitta logoped uchun va jamoa APIlari yopiq.

Baza TLS talab qilsa provayder bergan sertifikat va URL SSL sozlamalaridan foydalaning: [node-postgres SSL](https://node-postgres.com/features/ssl). Ulanishning sertifikat tekshiruvi kodda o‘chirilmaydi.

## Sozlamalar

| Muhit o‘zgaruvchisi | Odatiy qiymat |
|---|---|
| HOST / PORT | 0.0.0.0 / 3001 |
| DATABASE_PATH | data/nutq.sqlite; DATABASE_URL bo‘lmasa ishlatiladi |
| DATABASE_URL | bo‘sh; PostgreSQL ulanish URLi |
| DATABASE_SCHEMA | nutq; alohida PostgreSQL schema |
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

PostgreSQL testlari haqiqiy bazaga ulanadi, lekin faqat vaqtinchalik `nutq_test_…` schemalarda ishlaydi va ularni oxirida o‘chiradi:

```powershell
$env:NUTQ_TEST_POSTGRES='1'
node --env-file=.env --test tests/api.test.js tests/personal.test.js tests/clients.test.js tests/postgres.test.js
Remove-Item Env:NUTQ_TEST_POSTGRES
npm.cmd run test:ui:postgres
```

Bu sinovlar uchun baza foydalanuvchisida schema yaratish huquqi kerak. Oddiy `npm test` SQLite sinovlarini bajaradi va PostgreSQL testini o‘tkazib yuboradi.

## Bosh sahifa va klient kabineti

Bosh sahifa login talab qilmaydi. Xizmatlar, yondashuv, telefon va Telegram havolalari mavjud. Ochiq matnlar va aloqa ma’lumotlari `src/landing.tsx`da joylashgan; narx, ish manzili yoki malaka haqida tasdiqlanmagan ma’lumot kiritilmagan. `/#kirish` logoped va klient uchun umumiy kirish oynasini ochadi. Rang mavzusi saqlanadi.

Logoped uchun:

1. Bemor kartasini oching. «Klient kabineti» bo‘limida bemor yoki ota-onaning emaili va kamida 10 belgili boshlang‘ich parolni kiriting.
2. «Klient akkaunti yaratish»ni bosing. Login va parolni klientga o‘zingiz yetkazing; ilova xabar yubormaydi. Har bir bemor kartasiga bitta klient akkaunti bog‘lanadi.
3. Kutubxonadagi mashqni tanlab, klientga ko‘rsatma bilan biriktiring. Biriktirishni olib tashlash asl mashqni o‘chirmaydi.
4. Kerak bo‘lsa «Kirishni yopish» yoki parolni yangilash orqali sessiyalarni darhol bekor qiling.

Klient faqat o‘z qabullari, biriktirilgan mashqlari va natijalarini ko‘radi, o‘z parolini o‘zgartirishi mumkin. Bemor kartasi va qabulning ichki izohlari ko‘rsatilmaydi. **Natijalarga yozilgan kuzatuvlar klientga ko‘rinadi**; ularga faqat baham ko‘rmoqchi bo‘lgan matnni yozing. Klientga boshqa bemorlar, umumiy mashqlar kutubxonasi, eksport, zaxira yoki boshqaruv APIlari ochilmaydi. Namuna hisobida haqiqiy klient akkaunti yaratilmaydi.

PostgreSQL schema migratsiyasi 2 yangi jadvalni ma’lumotlarni o‘chirmasdan qo‘shadi. Zaxira formati klient bog‘lanishlari va biriktirilgan mashqlarni ham saqlaydi; avvalgi 1-versiya zaxiralari tiklanishi qo‘llab-quvvatlanadi.
