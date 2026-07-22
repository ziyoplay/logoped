"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "../AuthGate";
import { fmtD, today, uid } from "@/lib/helpers";
import { Modal, Field, Empty, PageHead } from "../ui";

export default function Progress({ progClient, setProgClient }) {
  const { db, patch, toast, activeClients } = useApp();
  const [open, setOpen] = useState(false);

  const clients = activeClients();
  const selected = clients.find((c) => c.id === progClient)?.id || clients[0]?.id || "";
  const recs = db.progress.filter((p) => p.clientId === selected).sort((a, b) => a.date.localeCompare(b.date));
  const before = recs.filter((r) => r.type === "oldin");
  const after = recs.filter((r) => r.type === "keyin");

  const del = (id) => {
    if (!confirm("Yozuv o'chirilsinmi?")) return;
    const rec = db.progress.find((p) => p.id === id);
    // serverdagi videoni ham tozalaymiz — yozuvsiz video keraksiz joy egallaydi
    if (rec?.videoId) fetch("/api/progress-video/" + rec.videoId, { method: "DELETE" }).catch(() => {});
    patch((d) => { d.progress = d.progress.filter((p) => p.id !== id); });
  };

  const Rec = ({ r }) => (
    <div className="card" style={{ padding: 12 }}>
      <div className="row">
        <b>{fmtD(r.date)}</b>
        <div className="spacer" />
        <button className="btn sm bad no-print" onClick={() => del(r.id)}>🗑</button>
      </div>
      {r.photo && <img src={r.photo} alt="holat rasmi" />}
      {r.videoId && (
        <video className="task-video" src={"/api/progress-video/" + r.videoId} controls playsInline preload="metadata" />
      )}
      <div>{r.text}</div>
    </div>
  );

  return (
    <>
      <PageHead
        title="Oldingi va keyingi holat"
        sub="Natijalarni hujjatlashtirish (до и после)"
        action={
          <button className="btn" onClick={() => (selected ? setOpen(true) : toast("Avval mijoz qo'shing"))}>
            ＋ Yozuv qo'shish
          </button>
        }
      />
      {clients.length ? (
        <>
          <div className="card">
            <Field label="Mijozni tanlang">
              <select style={{ maxWidth: 300 }} value={selected} onChange={(e) => setProgClient(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
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
        </>
      ) : (
        <div className="card"><Empty icon="📈">Avval mijoz qo'shing.</Empty></div>
      )}
      {open && <ProgressForm clientId={selected} onClose={() => setOpen(false)} />}
    </>
  );
}

function ProgressForm({ clientId, onClose }) {
  const { patch, toast } = useApp();
  const { serverMode } = useAuth();
  const [f, setF] = useState({ type: "oldin", date: today(), text: "" });
  const [videoFile, setVideoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveRec = async () => {
    if (!f.text.trim()) return toast("Tavsif kiriting");

    // video serverga alohida yuklanadi — base64 qilib JSONga sig'dirib bo'lmaydi
    let videoId;
    if (videoFile) {
      if (videoFile.size > 25 * 1024 * 1024) return toast("Video juda katta — 25 MB gacha");
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("clientId", clientId);
        fd.append("video", videoFile);
        const r = await fetch("/api/progress-video", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setBusy(false); return toast(j.error || "Video yuklanmadi, qayta urinib ko'ring"); }
        videoId = j.videoId;
      } catch {
        setBusy(false);
        return toast("Server bilan aloqa yo'q");
      }
    }

    patch((d) => { d.progress.push({ id: uid(), clientId, ...f, ...(videoId ? { videoId } : {}) }); });
    toast("Saqlandi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>Holat yozuvi</h3>
      <Field label="Turi">
        <select value={f.type} onChange={set("type")}>
          <option value="oldin">Oldin (до)</option>
          <option value="keyin">Keyin (после)</option>
        </select>
      </Field>
      <Field label="Sana"><input type="date" value={f.date} onChange={set("date")} /></Field>
      <Field label="Tavsif * (nutq holati, qaysi tovushlar, xulosa)">
        <textarea rows={3} value={f.text} onChange={set("text")} />
      </Field>
      {serverMode ? (
        <Field label="Video (ixtiyoriy, 25 MB gacha)">
          <input type="file" accept="video/*" capture="environment" onChange={(e) => setVideoFile(e.target.files[0] || null)} />
        </Field>
      ) : (
        <div className="muted">Video yuklash faqat server rejimida ishlaydi.</div>
      )}
      <div className="actions">
        <button className="btn ghost" onClick={onClose} disabled={busy}>Bekor</button>
        <button className="btn" onClick={saveRec} disabled={busy}>{busy ? "Yuklanmoqda..." : "Saqlash"}</button>
      </div>
    </Modal>
  );
}
