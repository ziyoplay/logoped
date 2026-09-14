# Tekshiruv natijalari

2026-09-10 kuni ushbu kompyuterda tekshirildi.

- `npm run build`: TypeScript tekshiruvi va Vite build muvaffaqiyatli.
- `npm test`: 2 ta API integratsiya testi o‘tdi. Hisoblar izolyatsiyasi, sana va baho validatsiyasi, qabul vaqtining ustma-ust kelishi, bazani qayta ochishda ma’lumot saqlanishi, eksport, sessiya bekor qilinishi va tashqi kalitlar tekshirildi.
- `npm run test:ui`: desktop 1440 px va Pixel 7 ekranida 2 ta E2E testi o‘tdi. Bemor yaratish, qabul, natija, mashq, qabulni yakunlash va sahifani qayta ochish sinovdan o‘tdi. Bir kun ichidagi yangi natija eng so‘nggi baho sifatida ko‘rsatilishi tekshirildi.
- `node scripts/backup.js`: ishlayotgan SQLite bazasining zaxira nusxasi yaratildi.
- `npm run android:build`: APK yig‘ildi; Android lint 0 xato, 2 ogohlantirish (target SDK eng yangi emas; Android 12+ uchun alohida data extraction rules yo‘q). Paketda `allowBackup=false` o‘rnatilgan.
- `apksigner verify --verbose`: APK v2 imzosi tasdiqlandi.
- Pixel 10 Pro, API 37 emulyatorida APK o‘rnatildi, `http://10.0.2.2:3001` serveriga ulandi, namuna hisobiga kirildi va bazadagi bemorlar/qabullar bosh sahifada ko‘rindi. Ilova uchun AndroidRuntime xatosi qayd etilmadi. Emulyatorning ilk yuklanishida tizim interfeysi vaqtincha javob bermadi; yuklanish tugagach qayta ochishda ilova ishladi.

Skrinshotlar: `artifacts/desktop-dashboard.png`, `artifacts/mobile-dashboard.png`, `artifacts/desktop-patient.png`, `artifacts/mobile-patient.png`, `artifacts/android-setup.png`, `artifacts/android-dashboard.png`.

## Profilni moslashtirish yangilanishi

- API testlari: 3 ta test o‘tdi, jumladan profilning qayta ishga tushganda saqlanishi, boshqa hisobdan ajratilishi, qisman yangilashda boshqa maydonlar saqlanishi va ruxsat berilmagan maydon/rasmlarni rad etish.
- Desktop va telefonda asosiy 2 ta E2E testi hamda profilga oid 2 ta yangi E2E testi o‘tdi. Profil matnlari, rasm yuklash, rang tanlash, saqlash, qayta ochish, bekor qilish va rasmni o‘chirish tekshirildi.
- TypeScript/Vite build va yangilangan Android APK build/lint muvaffaqiyatli. APK imzosi tekshirildi. Yangi Android fayl tanlash oynasi emulyatorda alohida sinovdan o‘tkazilmadi.
- Profil skrinshotlari: `artifacts/desktop-profile.png`, `artifacts/mobile-profile.png`.

## Yorqin va do‘stona dizayn

Foydalanuvchi tanlagan yo‘nalish asosida yashil, shaftoli, sariq va havorang kartalar, kattaroq matnlar, yumaloq tugmalar va ixcham profil sarlavhasi qo‘shildi. Profil namunasi yuqorida, shaxsiy ma’lumotlar va aloqa maydonlari guruhlarga ajratilgan.

TypeScript/Vite build hamda desktop va telefondagi barcha 4 ta UI testi o‘tdi. Bosh sahifa va profilning yangi skrinshotlari ko‘zdan kechirildi. Bu o‘zgarish veb interfeysga tegishli: APK ichidagi `Yangilash` tugmasi yangi dizaynni serverdan yuklaydi.

APK: `artifacts/nutq-debug.apk` — mahalliy sinov versiyasi. Jismoniy telefonda, Android 8 qurilmasida va ommaviy HTTPS hostingda tekshirilmagan. Play Store uchun release imzolash va hosting sozlash alohida ish hisoblanadi.

## Physical phone verification — 2026-09-14
- Device: Xiaomi M2012K11AG, Android APK `uz.nutq.logoped.debug`, USB reverse to port 3001.
- Playwright connected to the actual phone WebView over CDP; no desktop emulation used for the physical-device checks.
- Passed: patient creation/search, appointment creation/completion, exercise creation, two result scores with latest-score handling, reload persistence, profile fields/color/photo processing/removal/cancel, horizontal overflow checks, and no page JavaScript errors during CRUD.
- Android native image picker opened and Back returned to Nutq. Selecting a file via injected taps was inconclusive; native file-selection completion remains unverified. Profile photo processing was verified through WebView file-input injection.
- Separate regression run: 3 API tests and 4 desktop/mobile browser tests passed.
- Physical-device tests used only the demo account. Clearly labelled Telefon Test records and Telefon Sinov profile remain for inspection.

## Clinic readiness work — 2026-09-14
Implemented shared clinic ownership with administrator and therapist roles, single-use email-bound invitations (24 hours), immediate session revocation when staff access is disabled, therapist-specific scheduling/conflict checks, calendar filtering, administrator-only deletion/export, protection against deleting patients with history, revision checks for stale CRUD/profile edits, atomic record/audit updates, audit metadata, and truthful handling of save-success/list-refresh-failure.

Operational additions: automatic integrity-checked backups on startup/every 6 hours, 30-copy retention, configurable backup directory, admin backup status, restore to a new file with invalidated sessions/invitations, environment configuration, and optional registration/demo shutdown. No existing patient records were intentionally removed. A pre-migration backup was created in data/backups before upgrading.

Readiness boundary: functional center workflows are implemented locally. Production HTTPS, external backup storage, unattended server startup, email recovery, and release signing remain environment/deployment work; do not represent the current HTTP debug environment as a fully deployed production system.
Final verification for the clinic update: 6 API/storage tests and 10 desktop/mobile browser tests passed. Production dependency audit reported 0 known vulnerabilities. Live migration check found no missing pre-existing IDs across 39 accounts, 173 patients, 175 appointments, 173 exercises and 498 results; SQLite integrity_check returned ok and foreign_key_check returned no violations. Numbers include previous demo/test accounts, not counts of real patients. This turn did not repeat the physical Android-device test.

## Personal-use correction — 2026-09-14
User clarified that the product is for one logoped. The shipped server now defaults to per-account data ownership and disables team endpoints/invitations. Removed the team UI, invitation field, therapist assignment and therapist calendar filter. Replaced team settings with standalone backup status. No records were deleted. Legacy team schema/tests remain for migration compatibility, but are not enabled by the server entry point. Desktop/mobile personal-mode tests verify the absence of team controls, successful access to backups/export and disabled team API. Build and 7 API/storage tests passed; 10 browser tests passed.
