"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { fmtD, today, uid } from "@/lib/helpers";
import { Modal, Field } from "./ui";

const STATUS = {
  berildi: ["amber", "Bajarilmoqda"],
  bajarildi: ["green", "Bajarildi"],
  bajarilmadi: ["red", "Bajarilmadi"],
};

export function TaskRow({ task: k }) {
  const { cname, patch } = useApp();
  const [cls, label] = STATUS[k.status] || STATUS.berildi;
  const [showVideo, setShowVideo] = useState(false);

  const setStatus = (st) => patch((d) => { d.tasks.find((x) => x.id === k.id).status = st; });
  const del = () => {
    if (!confirm("Topshiriq o'chirilsinmi?")) return;
    patch((d) => { d.tasks = d.tasks.filter((x) => x.id !== k.id); });
  };

  return (
    <div className="list-item">
      <div className="avatar">📝</div>
      <div className="li-main">
        <div className="li-title">{k.title}</div>
        <div className="li-sub">
          {cname(k.clientId)} · muddat: {fmtD(k.due)}{k.desc ? " · " + k.desc : ""}
        </div>
      </div>
      <span className={"tag " + cls}>{label}</span>
      {k.videoId && (
        <button className="btn sm ghost no-print" title="Mijoz yuborgan video"
                onClick={() => setShowVideo(true)}>🎥</button>
      )}
      {k.status === "berildi" && (
        <>
          <button className="btn sm" onClick={() => setStatus("bajarildi")}>✓</button>
          <button className="btn sm bad" onClick={() => setStatus("bajarilmadi")}>✗</button>
        </>
      )}
      <button className="btn sm bad no-print" onClick={del}>🗑</button>

      {showVideo && (
        <Modal onClose={() => setShowVideo(false)}>
          <h3>🎥 {k.title}</h3>
          <div className="muted">{cname(k.clientId)} yuborgan video</div>
          <video className="task-video" src={"/api/task-video/" + k.videoId} controls autoPlay playsInline />
          <div className="actions">
            <a className="btn ghost" href={"/api/task-video/" + k.videoId} target="_blank" rel="noreferrer">
              Yangi oynada ochish
            </a>
            <button className="btn" onClick={() => setShowVideo(false)}>Yopish</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function TaskForm({ onClose, defaultClientId }) {
  const { db, patch, toast, activeClients } = useApp();
  const clients = activeClients();
  const defDue = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); };
  const [f, setF] = useState({ clientId: defaultClientId || clients[0]?.id || "", exId: "", title: "", desc: "", due: defDue() });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickExercise = (e) => {
    const ex = db.exercises.find((x) => x.id === e.target.value);
    setF({ ...f, exId: e.target.value, ...(ex ? { title: ex.name, desc: ex.desc } : {}) });
  };

  const saveTask = () => {
    if (!f.title.trim()) return toast("Topshiriq nomini kiriting");
    patch((d) => {
      d.tasks.push({ id: uid(), clientId: f.clientId, title: f.title.trim(), desc: f.desc, given: today(), due: f.due, status: "berildi" });
    });
    toast("Topshiriq berildi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>Topshiriq berish</h3>
      <Field label="Mijoz *">
        <select value={f.clientId} onChange={set("clientId")}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Mashq turidan tanlash">
        <select value={f.exId} onChange={pickExercise}>
          <option value="">— o'zim yozaman —</option>
          {db.exercises.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.cat})</option>)}
        </select>
      </Field>
      <Field label="Topshiriq nomi *"><input value={f.title} onChange={set("title")} /></Field>
      <Field label="Tavsif / ko'rsatma"><textarea rows={3} value={f.desc} onChange={set("desc")} /></Field>
      <Field label="Muddat (tekshirish kuni)"><input type="date" value={f.due} onChange={set("due")} /></Field>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={saveTask}>Berish</button>
      </div>
    </Modal>
  );
}
