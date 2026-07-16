"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { fmtMoney, today, uid } from "@/lib/helpers";
import { Modal, Field } from "./ui";

const STATUS = {
  rejalashtirilgan: ["gray", "Kutilmoqda"],
  keldi: ["green", "Keldi"],
  kelmadi: ["red", "Kelmadi"],
  bekor: ["amber", "Bekor"],
};

export function ApptRow({ appt: a, onEdit }) {
  const { cname, patch, toast } = useApp();
  const [cls, label] = STATUS[a.status] || STATUS.rejalashtirilgan;

  const setStatus = (st) => {
    patch((d) => { d.appts.find((x) => x.id === a.id).status = st; });
    toast(st === "keldi" ? "Qabul qilindi ✓" : "Belgilandi");
  };
  const togglePaid = () => {
    patch((d) => { const x = d.appts.find((x) => x.id === a.id); x.paid = !x.paid; });
    toast(a.paid ? "To'lov bekor qilindi" : "To'lov qabul qilindi ✓");
  };

  return (
    <div className="list-item">
      <div className="avatar">{a.time?.slice(0, 5)}</div>
      <div className="li-main">
        <div className="li-title">{cname(a.clientId)}</div>
        <div className="li-sub">
          {a.dur || 30} daqiqa · {fmtMoney(a.price)} {a.paid ? "· ✅ to'landi" : "· ⏳ to'lanmagan"}
          {a.note ? " · " + a.note : ""}
        </div>
      </div>
      <span className={"tag " + cls}>{label}</span>
      {a.status === "rejalashtirilgan" && (
        <>
          <button className="btn sm" onClick={() => setStatus("keldi")}>Keldi</button>
          <button className="btn sm bad" onClick={() => setStatus("kelmadi")}>Kelmadi</button>
        </>
      )}
      {a.status === "keldi" && !a.paid && (
        <button className="btn sm ghost" onClick={togglePaid}>To'landi ✓</button>
      )}
      {onEdit && <button className="btn sm ghost no-print" onClick={() => onEdit(a)}>✎</button>}
    </div>
  );
}

export function ApptForm({ initial, defaultDate, onClose }) {
  const { db, patch, toast, cname, activeClients } = useApp();
  const a = initial || {};
  const clients = activeClients();
  const [f, setF] = useState({
    clientId: a.clientId || clients[0]?.id || "",
    date: a.date || defaultDate || today(),
    time: a.time || "10:00",
    dur: a.dur || 30,
    price: a.price ?? (db.appts[db.appts.length - 1]?.price || ""),
    note: a.note || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveAppt = () => {
    if (!f.date || !f.time) return toast("Sana va vaqtni kiriting");
    const clash = db.appts.find(
      (x) => x.id !== a.id && x.date === f.date && x.time === f.time && x.status !== "bekor"
    );
    if (clash && !confirm("Diqqat: bu vaqtda " + cname(clash.clientId) + " bor. Baribir saqlansinmi?")) return;
    const data = { ...f, price: +f.price || 0 };
    patch((d) => {
      if (a.id) Object.assign(d.appts.find((x) => x.id === a.id), data);
      else d.appts.push({ id: uid(), status: "rejalashtirilgan", paid: false, ...data });
    });
    toast("Saqlandi ✓");
    onClose();
  };

  const delAppt = () => {
    if (!confirm("Qabul o'chirilsinmi?")) return;
    patch((d) => { d.appts = d.appts.filter((x) => x.id !== a.id); });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>{a.id ? "Qabulni tahrirlash" : "Yangi qabul"}</h3>
      <Field label="Mijoz *">
        <select value={f.clientId} onChange={set("clientId")}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid2">
        <Field label="Sana *"><input type="date" value={f.date} onChange={set("date")} /></Field>
        <Field label="Vaqt *"><input type="time" value={f.time} onChange={set("time")} /></Field>
      </div>
      <div className="grid2">
        <Field label="Davomiylik (daq.)"><input type="number" value={f.dur} onChange={set("dur")} /></Field>
        <Field label="Narx (so'm)"><input type="number" value={f.price} onChange={set("price")} /></Field>
      </div>
      <Field label="Izoh"><input value={f.note} onChange={set("note")} /></Field>
      <div className="actions">
        {a.id && <button className="btn bad" onClick={delAppt}>O'chirish</button>}
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={saveAppt}>Saqlash</button>
      </div>
    </Modal>
  );
}
