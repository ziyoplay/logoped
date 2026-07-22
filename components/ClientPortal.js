"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "./AuthGate";
import { fmtD, fmtMoney, today, daysAgo } from "@/lib/helpers";

const MAX_VIDEO = 25 * 1024 * 1024;
const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";

const TABS = [
  { id: "plan", ic: "🗓️", t: "Mashg'ulotlar" },
  { id: "tasks", ic: "⭐", t: "Topshiriqlar" },
  { id: "progress", ic: "🌱", t: "Natijalar" },
];

const SOUNDS = ["R", "S", "Sh", "L"];

export default function ClientPortal() {
  const { db, taskDone, toast, client } = useApp();
  const { session, logout, serverMode } = useAuth();
  const [tab, setTab] = useState("plan");
  const [doneFor, setDoneFor] = useState(null); // video so'raladigan topshiriq

  const me = client(session.clientId);
  if (!me) return <div className="loader">Hisob topilmadi. Logopedingizga murojaat qiling.</div>;

  const t = today();
  const appts = db.appts.filter((a) => a.clientId === me.id);
  const upcoming = appts
    .filter((a) => a.date >= t && a.status === "rejalashtirilgan")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = appts
    .filter((a) => a.date < t || a.status !== "rejalashtirilgan")
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 10);
  const attended = appts.filter((a) => a.status === "keldi").length;

  const tasks = db.tasks.filter((k) => k.clientId === me.id);
  const activeTasks = tasks.filter((k) => k.status === "berildi");
  const doneCount = tasks.filter((k) => k.status === "bajarildi").length;
  const doneTasks = tasks.filter((k) => k.status !== "berildi").slice(-10).reverse();

  const recs = db.progress.filter((p) => p.clientId === me.id).sort((a, b) => a.date.localeCompare(b.date));
  const before = recs.filter((r) => r.type === "oldin");
  const after = recs.filter((r) => r.type === "keyin");

  const next = upcoming[0];
  const nextWhen = next
    ? (daysAgo(next.date) === 0 ? "bugun" : daysAgo(next.date) === -1 ? "ertaga" : fmtD(next.date))
    : null;

  // Serverli rejimda avval video so'raymiz; bazasiz rejimda saqlash joyi yo'q,
  // shuning uchun to'g'ridan-to'g'ri belgilanadi.
  const markDone = (k) => {
    if (serverMode) return setDoneFor(k);
    taskDone(k.id);
    toast("Barakalla! Yana bitta yulduzcha ⭐");
  };

  const finishTask = async (id, video) => {
    const ok = await taskDone(id, video);
    setDoneFor(null);
    if (ok) toast(video ? "Video yuborildi. Barakalla! ⭐" : "Barakalla! Yana bitta yulduzcha ⭐");
  };

  // 5 yulduzli o'lchov: bajarilgan / jami topshiriqlar
  const starCount = tasks.length ? Math.round((doneCount / tasks.length) * 5) : 0;

  const ApptItem = ({ a }) => {
    const st = {
      rejalashtirilgan: ["", "Kutilmoqda"],
      keldi: ["ok", "Bo'lib o'tdi"],
      kelmadi: ["miss", "Kelinmadi"],
      bekor: ["off", "Bekor qilingan"],
    }[a.status];
    return (
      <div className="pt-appt">
        <div className="pt-date">
          <span className="d">{new Date(a.date + "T00:00").getDate()}</span>
          <span className="m">{fmtD(a.date).split(" ")[0].split("-")[1]?.slice(0, 3)}</span>
        </div>
        <div className="pt-appt-main">
          <div className="pt-appt-title">{a.time?.slice(0, 5)} · {a.service || "Logopedik mashg'ulot"}</div>
          <div className="pt-appt-sub">
            {a.dur || 30} daqiqa · {fmtMoney(a.price)}
            {a.status === "keldi" ? (a.paid ? " · to'langan" : " · to'lanmagan") : ""}
          </div>
        </div>
        <span className={"pt-state " + st[0]}>{st[1]}</span>
      </div>
    );
  };

  return (
    <div className="pt-page">
      {/* ===== imzo: nutq pufakchasi ===== */}
      <header className="pt-hero">
        {SOUNDS.map((s, i) => (
          <span key={s} className={"pt-sound pt-sound-" + i} aria-hidden="true">{s}</span>
        ))}
        <button className="pt-exit" onClick={logout}>Chiqish</button>
        <div className="pt-bubble">
          {me.photo && <img className="pt-ava" src={me.photo} alt={me.name} />}
          <div className="pt-hi">Assalomu alaykum, {me.name}! 👋</div>
          <div className="pt-next">
            {next
              ? <>Keyingi mashg'ulot: <b>{nextWhen}, soat {next.time?.slice(0, 5)}</b></>
              : "Keyingi mashg'ulot hali belgilanmagan"}
          </div>
        </div>
      </header>

      {/* ===== yulduzchali progress ===== */}
      <div className="pt-strip">
        <div className="pt-stars" role="img" aria-label={`${doneCount} ta topshiriq bajarilgan, jami ${tasks.length}`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i < starCount ? "on" : ""}>★</span>
          ))}
          <span className="pt-stars-label">
            {tasks.length ? `${doneCount} / ${tasks.length} topshiriq` : "Topshiriqlar hali yo'q"}
          </span>
        </div>
        <div className="pt-chip">🎓 {attended} ta mashg'ulot o'tildi</div>
      </div>

      {/* ===== bo'limlar ===== */}
      <nav className="pt-tabs">
        {TABS.map((x) => (
          <button key={x.id} className={tab === x.id ? "active" : ""} onClick={() => setTab(x.id)}>
            <span>{x.ic}</span>{x.t}
            {x.id === "tasks" && activeTasks.length > 0 && <i className="pt-dot">{activeTasks.length}</i>}
          </button>
        ))}
      </nav>

      <main key={tab} className="pt-body page-fade">
        {tab === "plan" && (
          <>
            <section className="pt-card">
              <h3>Kelgusi mashg'ulotlar</h3>
              {upcoming.length
                ? upcoming.map((a) => <ApptItem key={a.id} a={a} />)
                : <div className="pt-empty">🌿 Kelgusi mashg'ulot belgilanmagan — logopedingiz belgilashi bilan shu yerda ko'rinadi.</div>}
            </section>
            <section className="pt-card">
              <h3>O'tgan mashg'ulotlar</h3>
              {past.length
                ? past.map((a) => <ApptItem key={a.id} a={a} />)
                : <div className="pt-empty">Hali mashg'ulotlar bo'lmagan.</div>}
            </section>
          </>
        )}

        {tab === "tasks" && (
          <>
            <section className="pt-card">
              <h3>Bajarish kerak</h3>
              {activeTasks.length ? activeTasks.map((k) => {
                const overdue = k.due && k.due < t;
                return (
                  <div className="pt-task" key={k.id}>
                    <div className="pt-task-main">
                      <div className="pt-task-title">{k.title}</div>
                      {k.desc && <div className="pt-task-desc">{k.desc}</div>}
                      <div className={"pt-task-due" + (overdue ? " late" : "")}>
                        {overdue ? "⏰ Muddati o'tdi: " : "Muddat: "}{fmtD(k.due)}
                      </div>
                    </div>
                    <button className="pt-done" onClick={() => markDone(k)}>Bajardim ✓</button>
                  </div>
                );
              }) : <div className="pt-empty">🎉 Hamma topshiriq bajarilgan. Barakalla!</div>}
            </section>
            <section className="pt-card">
              <h3>Avvalgi topshiriqlar</h3>
              {doneTasks.length ? doneTasks.map((k) => (
                <div className="pt-task old" key={k.id}>
                  <div className="pt-task-main">
                    <div className="pt-task-title">{k.title}</div>
                    <div className="pt-task-due">{fmtD(k.due)}</div>
                    {k.videoId && (
                      <a className="pt-video-link" href={"/api/task-video/" + k.videoId}
                         target="_blank" rel="noreferrer">🎥 Yuborgan videongiz</a>
                    )}
                  </div>
                  <span className={"pt-state " + (k.status === "bajarildi" ? "ok" : "miss")}>
                    {k.status === "bajarildi" ? "⭐ Bajarildi" : "Bajarilmadi"}
                  </span>
                </div>
              )) : <div className="pt-empty">Hali yozuvlar yo'q.</div>}
            </section>
          </>
        )}

        {tab === "progress" && (
          recs.length ? (
            <div className="pt-ba">
              <div className="pt-ba-col">
                <div className="pt-ba-head">Oldin</div>
                {before.length ? before.map((r) => (
                  <div className="pt-card" key={r.id}>
                    <b>{fmtD(r.date)}</b>
                    {r.photo && <img src={r.photo} alt="holat rasmi" />}
                    {r.videoId && <video src={"/api/progress-video/" + r.videoId} controls playsInline preload="metadata" />}
                    <p>{r.text}</p>
                  </div>
                )) : <div className="pt-empty">Yozuv yo'q</div>}
              </div>
              <div className="pt-ba-col">
                <div className="pt-ba-head after">Keyin 🌱</div>
                {after.length ? after.map((r) => (
                  <div className="pt-card" key={r.id}>
                    <b>{fmtD(r.date)}</b>
                    {r.photo && <img src={r.photo} alt="holat rasmi" />}
                    {r.videoId && <video src={"/api/progress-video/" + r.videoId} controls playsInline preload="metadata" />}
                    <p>{r.text}</p>
                  </div>
                )) : <div className="pt-empty">Yozuv yo'q</div>}
              </div>
            </div>
          ) : (
            <section className="pt-card">
              <div className="pt-empty">🌱 Natijalar hali kiritilmagan — logopedingiz birinchi yozuvni qo'shishi bilan shu yerda ko'rinadi.</div>
            </section>
          )
        )}
      </main>

      {doneFor && (
        <TaskDoneSheet
          task={doneFor}
          onCancel={() => setDoneFor(null)}
          onSubmit={finishTask}
        />
      )}
    </div>
  );
}

/* ===== "Bajardim" oynasi: mashqni video qilib yuborish ===== */
function TaskDoneSheet({ task, onCancel, onSubmit }) {
  const { toast } = useApp();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // ko'rib olish uchun vaqtinchalik havola — yopilganda bo'shatiladi
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) return setPreview("");
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pick = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_VIDEO)
      return toast(`Video juda katta (${mb(f.size)}). 25 MB gacha bo'lsin — qisqaroq oling.`);
    setFile(f);
  };

  const send = async (withVideo) => {
    setBusy(true);
    await onSubmit(task.id, withVideo ? file : null);
  };

  return (
    <div className="pt-sheet-bg" onClick={(e) => !busy && e.target === e.currentTarget && onCancel()}>
      <div className="pt-sheet">
        <h3>Barakalla! 🎉</h3>
        <div className="pt-sheet-task">{task.title}</div>
        <p className="pt-sheet-hint">
          Mashqni qanday bajarganingizni qisqa video qilib yuboring — logopedingiz
          ko&apos;rib, keyingi mashg&apos;ulotda maslahat beradi.
        </p>

        {preview ? (
          <>
            <video className="pt-sheet-video" src={preview} controls playsInline />
            <div className="pt-sheet-size">{file.name} · {mb(file.size)}</div>
          </>
        ) : (
          <button type="button" className="pt-pick" disabled={busy} onClick={() => inputRef.current?.click()}>
            🎥 Video olish yoki tanlash
          </button>
        )}
        <input type="file" accept="video/*" capture="environment" hidden ref={inputRef} onChange={pick} />

        <div className="pt-sheet-btns">
          {file && (
            <button className="pt-done" disabled={busy} onClick={() => send(true)}>
              {busy ? "Yuborilmoqda…" : "Yuborish ✓"}
            </button>
          )}
          <button className="pt-skip" disabled={busy} onClick={() => send(false)}>
            {busy && !file ? "Saqlanmoqda…" : "Videosiz belgilash"}
          </button>
          {!busy && <button className="pt-skip ghost" onClick={onCancel}>Bekor</button>}
        </div>
      </div>
    </div>
  );
}
