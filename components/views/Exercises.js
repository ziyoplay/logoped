"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { uid } from "@/lib/helpers";
import { Modal, Field, PageHead } from "../ui";

export default function Exercises() {
  const { db, patch } = useApp();
  const [modal, setModal] = useState(null); // {exercise|null}

  const cats = [...new Set(db.exercises.map((e) => e.cat))];

  const del = (id) => {
    if (!confirm("Mashq o'chirilsinmi?")) return;
    patch((d) => { d.exercises = d.exercises.filter((e) => e.id !== id); });
  };

  return (
    <>
      <PageHead
        title="Mashq turlari"
        sub={`Kutubxona: ${db.exercises.length} ta mashq, ${cats.length} ta yo'nalish`}
        action={<button className="btn" onClick={() => setModal({ exercise: null })}>＋ Mashq qo'shish</button>}
      />
      {cats.map((cat) => (
        <div className="card" key={cat}>
          <h3>🧩 {cat}</h3>
          {db.exercises.filter((e) => e.cat === cat).map((e) => (
            <div className="list-item" key={e.id}>
              <div className="li-main">
                <div className="li-title">{e.name}</div>
                <div className="li-sub">{e.desc}</div>
              </div>
              <button className="btn sm ghost" onClick={() => setModal({ exercise: e })}>✎</button>
              <button className="btn sm bad" onClick={() => del(e.id)}>🗑</button>
            </div>
          ))}
        </div>
      ))}
      {modal && <ExerciseForm exercise={modal.exercise} onClose={() => setModal(null)} />}
    </>
  );
}

function ExerciseForm({ exercise, onClose }) {
  const { db, patch, toast } = useApp();
  const e = exercise || {};
  const [f, setF] = useState({ name: e.name || "", cat: e.cat || "", desc: e.desc || "" });
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value });

  const saveEx = () => {
    if (!f.name.trim() || !f.cat.trim()) return toast("Nomi va yo'nalishini kiriting");
    patch((d) => {
      if (e.id) Object.assign(d.exercises.find((x) => x.id === e.id), f);
      else d.exercises.push({ id: uid(), ...f });
    });
    toast("Saqlandi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>{e.id ? "Mashqni tahrirlash" : "Yangi mashq"}</h3>
      <Field label="Nomi *"><input value={f.name} onChange={set("name")} /></Field>
      <Field label="Yo'nalish (kategoriya) *">
        <input value={f.cat} onChange={set("cat")} list="cats" placeholder="Artikulyatsiya, Nafas..." />
        <datalist id="cats">
          {[...new Set(db.exercises.map((x) => x.cat))].map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>
      <Field label="Tavsif / bajarish tartibi"><textarea rows={3} value={f.desc} onChange={set("desc")} /></Field>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={saveEx}>Saqlash</button>
      </div>
    </Modal>
  );
}
