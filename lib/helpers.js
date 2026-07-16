export const M = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
export const WD = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];

export const today = () => new Date().toISOString().slice(0, 10);

export function fmtD(s) {
  if (!s) return "—";
  const d = new Date(s + "T00:00");
  return d.getDate() + "-" + M[d.getMonth()] + " " + d.getFullYear();
}

export const fmtMoney = (n) => (+n || 0).toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";

export const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const daysAgo = (dateStr) => Math.floor((new Date(today()) - new Date(dateStr)) / 86400000);

export const uid = () => "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const DEFAULT_EXERCISES = [
  { name: "Artikulyatsion gimnastika", cat: "Artikulyatsiya", desc: "Til va lablar uchun mashqlar: 'Otcha', 'Soatcha', 'Baraban'. Oyna oldida 5-7 daqiqa." },
  { name: "Nafas mashqlari", cat: "Nafas", desc: "Sham puflash, paxta uchirish, sovun pufakchalari. Burun orqali nafas olib, og'iz orqali chiqarish." },
  { name: "'R' tovushini qo'yish", cat: "Tovush qo'yish", desc: "Til uchini tebratish mashqlari, 'dddd' dan 'drrr' ga o'tish." },
  { name: "'S' tovushini avtomatlashtirish", cat: "Avtomatlashtirish", desc: "Bo'g'inlarda: sa-so-su. So'zlarda: soat, sut, sumka. Gaplarda takrorlash." },
  { name: "Fonematik eshitish", cat: "Fonematik", desc: "Tovushni topish o'yinlari: 'Qaysi so'zda S bor?', qarsak chalish o'yini." },
  { name: "Mayda motorika", cat: "Motorika", desc: "Plastilin, mozaika, boncuk terish, barmoq o'yinlari." },
  { name: "Lug'at boyitish", cat: "Leksika", desc: "Mavzu bo'yicha rasmlar: hayvonlar, mevalar, transport. Kim ko'p so'z aytadi o'yini." },
  { name: "Bog'lanishli nutq", cat: "Nutq", desc: "Rasm bo'yicha hikoya tuzish, ertakni qayta aytib berish." },
].map((e, i) => ({ id: "ex" + i, ...e }));

export const freshDb = () => ({
  clients: [], appts: [], tasks: [],
  exercises: DEFAULT_EXERCISES, progress: [], products: [], sales: [],
});

/* Avto nazorat: e'tibor kerak bo'lgan holatlarni avtomatik topadi */
export function nazorat(db) {
  const t = today();
  const missedAppts = db.appts.filter((a) => a.status === "rejalashtirilgan" && a.date < t);
  const unpaid = db.appts.filter((a) => a.status === "keldi" && !a.paid);
  const overdueTasks = db.tasks.filter((k) => k.status === "berildi" && k.due && k.due < t);
  const lowStock = db.products.filter((p) => p.stock <= 2);
  const inactive = db.clients.filter((c) => {
    if (c.archived) return false;
    const last = db.appts.filter((a) => a.clientId === c.id && a.status === "keldi").map((a) => a.date).sort().pop();
    if (!last) return daysAgo(c.created || t) >= 14;
    return daysAgo(last) >= 14;
  });
  return {
    missedAppts, unpaid, overdueTasks, lowStock, inactive,
    total: missedAppts.length + unpaid.length + overdueTasks.length + lowStock.length + inactive.length,
  };
}
