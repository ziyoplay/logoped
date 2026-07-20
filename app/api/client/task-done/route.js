// Mijoz o'z topshirig'ini "bajarildi" deb belgilaydi — ixtiyoriy video bilan
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getData, setData, saveTaskVideo } from "@/lib/server/db";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Telefonda olingan qisqa video shu chegaraga bemalol sig'adi.
// Bu yerda ham tekshiramiz: brauzerdagi tekshiruvga ishonib bo'lmaydi.
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request) {
  try {
    const sess = await readSession(request);
    if (sess?.role !== "client")
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const type = request.headers.get("content-type") || "";
    let taskId = null;
    let video = null;

    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      taskId = form.get("taskId");
      const file = form.get("video");
      if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
        if (file.size > MAX_BYTES)
          return NextResponse.json({ error: "Video juda katta" }, { status: 413 });
        video = {
          mime: (file.type || "video/mp4").split(";")[0],
          data: Buffer.from(await file.arrayBuffer()),
        };
      }
    } else {
      ({ taskId } = await request.json());
    }

    if (!taskId) return NextResponse.json({ error: "Topshiriq ko'rsatilmagan" }, { status: 400 });

    const db = await getData();
    const task = db?.tasks?.find((k) => k.id === taskId && k.clientId === sess.clientId);
    if (!task) return NextResponse.json({ error: "Topshiriq topilmadi" }, { status: 404 });

    let videoId;
    if (video) {
      videoId = randomUUID();
      await saveTaskVideo({
        id: videoId,
        taskId,
        clientId: sess.clientId,
        mime: video.mime,
        data: video.data,
      });
      task.videoId = videoId;
    }

    task.status = "bajarildi";
    await setData(db);
    return NextResponse.json({ ok: true, videoId });
  } catch (e) {
    console.error("task-done:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
