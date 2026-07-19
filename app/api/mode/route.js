// Ilova rejimi: baza bormi, hisob yaratilganmi, sessiya kimniki
import { NextResponse } from "next/server";
import { hasDb, getAccount } from "@/lib/server/db";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!hasDb()) return NextResponse.json({ db: false });
  try {
    const acc = await getAccount();
    const session = await readSession(request);
    return NextResponse.json({
      db: true,
      ok: true,
      account: acc ? { name: acc.name } : null,
      session,
    });
  } catch (e) {
    console.error("mode:", e.message);
    return NextResponse.json({ db: true, ok: false, error: "Baza bilan aloqa yo'q" });
  }
}
