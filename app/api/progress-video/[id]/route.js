// "Oldin / keyin" videosini berish. Logoped hammasini, mijoz faqat o'zinikini ko'radi.
import { NextResponse } from "next/server";
import { getProgressVideo, deleteProgressVideo } from "@/lib/server/db";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const sess = await readSession(request);
    if (!sess) return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });

    const { id } = await params;
    const v = await getProgressVideo(id);
    if (!v) return NextResponse.json({ error: "Video topilmadi" }, { status: 404 });
    if (sess.role === "client" && v.client_id !== sess.clientId)
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    const data = v.data;
    const size = data.length;
    const base = {
      "Content-Type": v.mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    };

    // iOS Safari video'ni faqat qism-qism (Range) so'rab o'ynatadi
    const range = request.headers.get("range");
    const m = range && /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const start = Math.min(+m[1], size - 1);
      const end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
      const chunk = data.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          ...base,
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
      });
    }

    return new Response(data, {
      status: 200,
      headers: { ...base, "Content-Length": String(size) },
    });
  } catch (e) {
    console.error("progress-video:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const sess = await readSession(request);
    if (sess?.role !== "logoped")
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    await deleteProgressVideo(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("progress-video:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
