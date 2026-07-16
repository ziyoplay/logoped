"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "./AuthGate";
import { fmtD, fmtMoney, today } from "@/lib/helpers";
import { Empty } from "./ui";

const TABS = [
  { id: "plan", ic: "🗓️", t: "Qabullarim" },
  { id: "tasks", ic: "📝", t: "Topshiriqlarim" },
  { id: "progress", ic: "📈", t: "Natijalarim" },
];

export default function ClientPortal() {
  const { db, patch, toast, client } = useApp();
  const { session, logout } = useAuth();
  const [tab, setTab] = useState("plan");

  const me = client(session.clientId);
  if (!me) return <div className="loader">Hisob topilmadi. Logopedingizga murojaat qiling.</div>;

  const t = today();
  const appts = db.appts.filter((a) => a.clientId === me.id);
  const upcoming = appts.filter((a) => a.date >= t && a.status === "rejalashtirilgan").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = appts.filter((a) => a.date < t || a.status !== "rejalashtirilgan").sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 10);
  const tasks = db.tasks.filter((k) => k.clientId === me.id);
  const activeTasks = tasks.filter((k) => k.status === "berildi");
  const doneTasks = tasks.filter((k) => k.status !== "berildi").slice(-10).reverse();
  const recs = db.progress.filter((p) => p.clientId === me.id).sort((a, b) => a.date.localeCompare(b.date));
  const before = recs.filter((r) => r.type === "oldin");
  const after = recs.filter((r) => r.type === "keyin");

  const markDone = (id) => {
    patch((d) => { d.tasks.find((x) => x.id === id).status = "bajarildi"; });
    toast("Barakalla! Topshiriq bajarildi ✓");
  };

  const ApptItem = ({ a }) => {
    const st = { rejalashtirilgan: ["gray", "Kutilmoqda"], keldi: ["green", "Bo'lib o'tdi"], kelmadi: ["red", "Kelinmadi"], bekor: ["amber", "Bekor qilingan"] }[a.status];
    return (
      <div className="list-item">
        <div className="avatar">{a.time?.slice(0, 5)}</div>
        <div className="li-main">
          <div className="li-title">{fmtD(a.date)}</div>
          <div className="li-sub">{a.dur || 30} daqiqa · {fmtMoney(a.price)}{a.status === "keldi" ? (a.paid ? " · to'langan ✅" : " · to'lanmagan ⏳") : ""}</div>
        </div>
        <span className={"tag " + st[0]}>{st[1]}</span>
      </div>
    );
  };

  const Rec = ({ r }) => (
    <div className="card" style={{ padding: 12 }}>
      <b>{fmtD(r.date)}</b>
      {r.photo && <img src={r.photo} alt="holat rasmi" />}
      <div>{r.text}</div>
    </div>
  );

  return (
    <div className="portal">
      <header className="portal-head">
        <div>
          <div className="portal-hi">Assalomu alaykum, {me.name}! 👋</div>
          <div className="portal-sub">{me.diagnosis || "Mijoz kabineti"}</div>
        </div>
        <button className="btn sm ghost" onClick={logout}>🚪 Chiqish</button>
      </header>

      <div className="portal-tabs">
        {TABS.map((x) => (
          <button key={x.id} className={tab === x.id ? "active" : ""} onClick={() => setTab(x.id)}>
            <span className="ic">{x.ic}</span>{x.t}
            {x.id === "tasks" && activeTasks.length > 0 && <span className="badge">{activeTasks.length}</span>}
          </button>
        ))}
      </div>

      <div className="portal-body">
        {tab === "plan" && (
          <>
            <div className="card">
              <h3>🗓️ Kelgusi qabullar</h3>
              {upcoming.length ? upcoming.map((a) => <ApptItem key={a.id} a={a} />)
                : <Empty icon="🌿">Kelgusi qabul belgilanmagan.</Empty>}
            </div>
            <div className="card">
              <h3>📖 O'tgan qabullar</h3>
              {past.length ? past.map((a) => <ApptItem key={a.id} a={a} />)
                : <Empty>Hali qabullar bo'lmagan.</Empty>}
            </div>
          </>
        )}

        {tab === "tasks" && (
          <>
            <div className="card">
              <h3>📝 Bajarish kerak</h3>
              {activeTasks.length ? activeTasks.map((k) => (
                <div className="list-item" key={k.id}>
                  <div className="avatar">📝</div>
                  <div className="li-main">
                    <div className="li-title">{k.title}</div>
                    <div className="li-sub">muddat: {fmtD(k.due)}{k.desc ? " · " + k.desc : ""}</div>
                  </div>
                  <button className="btn sm" onClick={() => markDone(k.id)}>Bajardim ✓</button>
                </div>
              )) : <Empty icon="🎉">Faol topshiriq yo'q. Barakalla!</Empty>}
            </div>
            <div className="card">
              <h3>✅ Avvalgi topshiriqlar</h3>
              {doneTasks.length ? doneTasks.map((k) => (
                <div className="list-item" key={k.id}>
                  <div className="li-main">
                    <div className="li-title">{k.title}</div>
                    <div className="li-sub">{fmtD(k.due)}</div>
                  </div>
                  <span className={"tag " + (k.status === "bajarildi" ? "green" : "red")}>
                    {k.status === "bajarildi" ? "Bajarildi" : "Bajarilmadi"}
                  </span>
                </div>
              )) : <Empty>Hali yozuvlar yo'q.</Empty>}
            </div>
          </>
        )}

        {tab === "progress" && (
          recs.length ? (
            <div className="photo-cmp">
              <div className="ba-col">
                <div className="h">⬅ Oldin ({before.length})</div>
                {before.length ? before.map((r) => <Rec key={r.id} r={r} />) : <Empty>Yozuv yo'q</Empty>}
              </div>
              <div className="ba-col">
                <div className="h">Keyin ➡ ({after.length})</div>
                {after.length ? after.map((r) => <Rec key={r.id} r={r} />) : <Empty>Yozuv yo'q</Empty>}
              </div>
            </div>
          ) : (
            <div className="card"><Empty icon="📈">Natijalar hali kiritilmagan.</Empty></div>
          )
        )}
      </div>
    </div>
  );
}
