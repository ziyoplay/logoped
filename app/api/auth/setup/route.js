// Birinchi ishga tushirish: logoped hisobini yaratish
import { NextResponse } from "next/server";
import { getAccount, setAccount } from "@/lib/server/db";
import { makeHashes, newSalt, signSession, sessionCookie } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { name, pass } = await request.json();
    if (!name?.trim() || !pass || pass.length < 4)
      return NextResponse.json({ error: "Ism va kamida 4 belgili parol kiriting" }, { status: 400 });
    if (await getAccount())
      return NextResponse.json({ error: "Hisob allaqachon yaratilgan" }, { status: 409 });

    await setAccount({ name: name.trim(), ...makeHashes(newSalt(), pass) });
    const sess = { role: "logoped", exp: Date.now() + 30 * 86400000 };
    const res = NextResponse.json({ session: sess });
    res.cookies.set(sessionCookie(await signSession(sess), true));
    return res;
  } catch (e) {
    console.error("setup:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
