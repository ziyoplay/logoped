// Logoped "oldin / keyin" (до и после) videosini yuklaydi
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { saveProgressVideo } from "@/lib/server/db";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Telefonda olingan qisqa video shu chegaraga bemalol sig'adi.
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request) {
  try {
    const sess = await readSession(request);
    if (sess?.role !== "logoped")
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const form = await request.formData();
    const clientId = form.get("clientId");
    const file = form.get("video");
    if (!clientId) return NextResponse.json({ error: "Mijoz ko'rsatilmagan" }, { status: 400 });
    if (!file || typeof file.arrayBuffer !== "function" || !file.size)
      return NextResponse.json({ error: "Video tanlanmagan" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Video juda katta" }, { status: 413 });

    const videoId = randomUUID();
    await saveProgressVideo({
      id: videoId,
      clientId,
      mime: (file.type || "video/mp4").split(";")[0],
      data: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true, videoId });
  } catch (e) {
    console.error("progress-video:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
