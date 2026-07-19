// Ma'lumotlar: logoped to'liq o'qiydi/yozadi, mijoz faqat o'zinikini o'qiydi
import { NextResponse } from "next/server";
import { getData, setData } from "@/lib/server/db";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const sess = await readSession(request);
    if (!sess) return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
    const db = await getData();

    if (sess.role === "logoped") return NextResponse.json({ data: db });

    // mijoz: faqat o'z yozuvlari, parol xeshlarisiz
    if (!db) return NextResponse.json({ data: null });
    const me = db.clients?.find((c) => c.id === sess.clientId && !c.archived);
    if (!me) return NextResponse.json({ error: "Hisob topilmadi" }, { status: 404 });
    const { auth, ...safeMe } = me;
    return NextResponse.json({
      data: {
        clients: [safeMe],
        appts: (db.appts || []).filter((a) => a.clientId === me.id),
        tasks: (db.tasks || []).filter((k) => k.clientId === me.id),
        progress: (db.progress || []).filter((p) => p.clientId === me.id),
        exercises: [], products: [], sales: [],
      },
    });
  } catch (e) {
    console.error("data GET:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

async function save(request) {
  try {
    const sess = await readSession(request);
    if (sess?.role !== "logoped")
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const body = await request.json();
    const data = body?.data;
    if (!data || !Array.isArray(data.clients) || !Array.isArray(data.appts) || !Array.isArray(data.tasks))
      return NextResponse.json({ error: "Noto'g'ri format" }, { status: 400 });
    await setData(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("data save:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export const PUT = save;
export const POST = save; // sendBeacon PUT yubora olmaydi
