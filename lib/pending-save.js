// Saqlash 700 ms kechikish bilan ketadi. Agar shu orada AppProvider yo'q bo'lsa
// (masalan, logoped "Chiqish" bosdi), kechikkan yozuv bekor bo'lib, o'zgarishlar
// yo'qolardi. Chiqishdan OLDIN shu yerdagi flush chaqiriladi.
//
// Alohida fayl: store.js AuthGate'dan import qiladi, shuning uchun AuthGate
// to'g'ridan-to'g'ri store.js'dan import qilsa aylanma bog'liqlik hosil bo'lardi.

let handler = null;

export const setFlushHandler = (fn) => { handler = fn; };

export const flushPendingSave = async () => {
  try { await handler?.(); } catch {}
};
