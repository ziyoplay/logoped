// Kirish: logoped o'z ismi bilan, mijoz o'z logini bilan
import { NextResponse } from "next/server";
import { getAccount, getData } from "@/lib/server/db";
import { checkPass, signSession, sessionCookie } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { login, pass, remember } = await request.json();
    const name = (login || "").trim().toLowerCase();
    if (!name || !pass)
      return NextResponse.json({ error: "Login va parolni kiriting" }, { status: 400 });

    const exp = Date.now() + 30 * 86400000;

    const acc = await getAccount();
    if (acc && acc.name.trim().toLowerCase() === name && checkPass(acc, pass)) {
      const sess = { role: "logoped", exp };
      const res = NextResponse.json({ session: sess });
      res.cookies.set(sessionCookie(await signSession(sess), remember));
      return res;
    }

    const db = await getData();
    const c = (db?.clients || []).find(
      (x) => !x.archived && x.login && x.auth && x.login.toLowerCase() === name
    );
    if (c && checkPass(c.auth, pass)) {
      const sess = { role: "client", clientId: c.id, exp };
      const res = NextResponse.json({ session: sess });
      res.cookies.set(sessionCookie(await signSession(sess), remember));
      return res;
    }

    return NextResponse.json({ error: "Ism yoki parol noto'g'ri" }, { status: 401 });
  } catch (e) {
    console.error("login:", e.message);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
