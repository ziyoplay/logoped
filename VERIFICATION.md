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

## PostgreSQL fresh setup — 2026-09-15

Added an async storage interface with PostgreSQL via node-postgres and retained SQLite support. DATABASE_URL selects PostgreSQL; startup fails on a database connection error instead of falling back silently. Fresh installation creates ten tables in the dedicated nutq schema. Existing public tables and SQLite data were not imported, changed or deleted. Product remains single-logoped; legacy team endpoints stay disabled by default.

PostgreSQL uses foreign keys, checks, indexes, per-client transactions, and an advisory transaction lock around application CRUD to protect schedule and revision checks across simultaneous requests. Automatic six-hour PostgreSQL snapshots have SHA-256 integrity checks and 30-copy retention. Restore targets a newly named schema and discards sessions/invitations. Snapshot files contain private data and are not encrypted.

Verified on the supplied remote PostgreSQL using disposable nutq_test_ schemas:
- Five existing API/personal tests passed, including ownership, profile persistence, validation, session revocation and disabled team endpoints.
- One PostgreSQL concurrency/restore test passed: simultaneous overlapping appointments returned 201/409; simultaneous revision-zero edits returned 200/409; full snapshot restored into an empty schema; sessions were cleared; overwrite and checksum tampering were rejected.
- SQLite regression: seven tests passed; PostgreSQL-specific test skipped in the default command.
- TypeScript and Vite production build passed.
- Local server restarted with PostgreSQL, /api/health returned HTTP 200, and a startup snapshot was produced. Live nutq users/patients/appointments/exercises/results counts were all zero; thirteen existing public tables remained.

Browser verification initially exposed a test race: theme test reloaded before asynchronous demo login completed. It now waits for the authenticated dashboard. Remote-database runs use an explicit 15-second assertion timeout (default local tests remain 5 seconds) and disposable schemas via npm run test:ui:postgres.

No production-host application deploy or physical Android retest was performed in this update. Hosting still needs the internal DATABASE_URL environment value, DATABASE_SCHEMA=nutq, the Nutq branch/Dockerfile, persistent backup storage and HTTPS settings. Credentials are excluded from Git and Docker build context.

Final PostgreSQL browser rerun: all 10 desktop/mobile tests passed (2.4 minutes), covering patient/appointment/exercise/result CRUD, profile photo/details, reload persistence, theme/picker behavior, personal-mode controls and save-success/refresh-failure handling. Temporary test schemas were cleaned up.

## Public website and client accounts — 2026-09-15

Visitors now land on an Uzbek public home page with Iroda logoped's services, approach, supplied phone number and Telegram links. Login is opened explicitly at /#kirish. Light/dark styling works on the public site and client portal. No unverified prices, qualifications, address or testimonials were added.

Logoped can provision one email/password client account per patient, assign/unassign exercises with instructions, reset a client's password, and disable/re-enable access. Client accounts use a separate role, are linked to one patient, and see only that patient's selected appointments, assigned exercises, results and shared result notes. Private patient and appointment notes are excluded by explicit SQL column lists. Clients cannot use staff CRUD, profile changes, exports, backup, team or patient-access endpoints. Client password changes remain available. Password reset and disabling revoke sessions immediately.

Added non-destructive client_accounts and patient_exercises tables in both storage engines. PostgreSQL backups include both tables in schema version 2; version 1 archive compatibility was verified against an existing backup. Application restarted successfully with the provided PostgreSQL connection, health returned 200, both tables exist and the startup backup includes them. No test data was written to the live nutq schema.

Validation: TypeScript/Vite build passed. Eight SQLite API/storage tests passed (one PostgreSQL-only test skipped). PostgreSQL client-isolation/provisioning/password/revocation/backup-restore and concurrent-write/snapshot tests passed in disposable schemas. Ten existing desktop/mobile UI regression tests passed. The two new end-to-end tests initially timed out on an exact native-select label locator; after selecting the combobox by accessible role, the desktop and mobile reruns both passed. They cover public home without a login form, theme switching, client creation, exercise assignment, client login, reload persistence, private-data exclusion, staff API denial and revoked-session login.

Desktop/mobile screenshots of both home-page themes and the client portal were visually inspected. Fixed public contact-heading contrast in dark mode and separated the mobile login-page back link from the brand. No horizontal overflow was found in the new page or portal tests. Physical APK and production hosting were not redeployed/retested in this change; the APK loads the updated web interface from its configured server.

## Non-JSON API response handling — 2026-09-15

The supplied screenshot showed a JSON parser error on HTML. Local /api/health returned HTTP 200 JSON and unauthenticated /api/me returned HTTP 401 JSON, so the reported deployment route is not yet identified; the affected URL was requested. The frontend now validates response media type and JSON structure, keeps its timeout active through body reading, and displays a readable error without exposing response HTML. HTML 200 is not treated as a successful write, and HTML 401 is not mistaken for an application session expiry. Session bootstrap identifies an ApiError 401 by status instead of matching translated text. Backup-status reads share the same helper. The bootstrap error view links back to the public home page.

Build passed. Six targeted desktop/mobile checks passed after correcting the test to use a full document navigation between response fixtures. Covered HTML 200/502/401, malformed JSON, JSON null, error recovery/retry, public-home availability, retaining a failed-save form and the existing saved-but-refresh-failed behavior. Remote proxy/deployment configuration remains unverified pending the affected URL.

## Landing-page animation — 2026-09-15

Added one-time viewport reveals, staggered service cards, gentle floating speech bubbles, smooth anchor scrolling, and pointer/touch feedback for public-page controls. Floating pauses offscreen and when the document is hidden. Reduced-motion preferences disable CSS motion and cancel active reveal animations, including preference changes while the page is open. Observers and animation handles are cleaned up on navigation. Content remains visible without animation support.

TypeScript/Vite build passed. Read-only browser checks on desktop and Pixel 7 viewport confirmed moving bubbles, offscreen pause, runtime reduced-motion disabling, login/home navigation cleanup, no horizontal overflow and no page JavaScript errors. Screenshots were inspected. No database or backend changes.
# Deployment configuration — 2026-09-16

- Added `deploy/DOKPLOY.md` and a credential-free environment template for the existing Node/PostgreSQL deployment.
- Dockerfile binds explicitly to `0.0.0.0` and checks `/api/health` using a dependency-free Node script. `npm run deploy:check -- URL` additionally verifies the unauthenticated `/api/me` response.
- `npm run build` passed. `npm test`: 8 passed, PostgreSQL integration test skipped.
- Exercised the deployment checker against local HTTP fixtures: valid JSON passed; HTML fallback, malformed JSON, and HTTP 503 all exited with failure.
- Read-only check against the existing public domain still found HTML at `/api/health`. No hosting settings were changed. These repository changes do not switch the existing service's build type or routing.
- Docker is unavailable on this workstation, so the image build and container healthcheck were not executed inside Docker. The Node check script was executed directly.
# Login motion — 2026-09-16

- Added scoped CSS entrance effects to the login/register screen, finite letter/sound-bar motion and button feedback. Existing reduced-motion preference disables these effects; focus cancels the form reveal immediately.
- `npm run build` passed. Browser preview confirmed the auth animation styles, no horizontal overflow, a visible usable form, immediate input focus and login/register switching without submitting data.
# Client secret protection — 2026-09-16

- Checked tracked files, compiled frontend and locally available Git history for known environment credentials and common private-key/token signatures; no matches found. `.env` and `.env.deploy` are ignored. This is a scoped scan, not a guarantee for every credential format or external copy.
- Build now rejects sensitive `VITE_` variables and detected credential values/signatures in frontend source, public assets and the generated bundle. Diagnostics contain locations only.
- Added private-key exclusions for Git/Docker and nested environment exclusions for Docker. Docker build copies the guard before running npm build.
- `npm run build` passed both secret checks. `npm test`: 9 passed, 1 PostgreSQL test skipped. New isolated fixture test covers backend-only configuration, source/bundle leaks, VITE-prefixed secrets and value-free diagnostics.
- No credential rotation, hosting changes or Git history rewrite was performed.
