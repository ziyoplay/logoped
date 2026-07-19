// Mijoz o'z topshirig'ini "bajarildi" deb belgilaydi
import { NextResponse } from "next/server";
import { getData, setData } from "@/lib/server/db";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const sess = await readSession(request);
    if (sess?.role !== "client")
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { taskId } = await request.json();
    const db = await getData();
    const task = db?.tasks?.find((k) => k.id === taskId && k.clientId === sess.clientId);
    if (!task) return NextResponse.json({ error: "Topshiriq topilmadi" }, { status: 404 });
    task.status = "bajarildi";
    await setData(db);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("task-done:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
