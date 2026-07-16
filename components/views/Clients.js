"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { fmtD, initials, uid, today } from "@/lib/helpers";
import { makeHashes, newSalt } from "@/lib/auth";
import { Modal, Field, Empty, PageHead } from "../ui";

export default function Clients({ go, setProgClient }) {
  const { db, patch, toast, activeClients } = useApp();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {type:'form',client} | {type:'card',id}

  const list = activeClients().filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const archive = (c) => {
    if (!confirm(c.name + " ro'yxatdan olib tashlansinmi? (tarix saqlanadi)")) return;
    patch((d) => { d.clients.find((x) => x.id === c.id).archived = true; });
    toast("Arxivlandi");
  };

  return (
    <>
      <PageHead
        title="Mijozlar ro'yxati"
        sub={`Jami: ${activeClients().length} ta faol mijoz`}
        action={<button className="btn" onClick={() => setModal({ type: "form", client: null })}>＋ Yangi mijoz</button>}
      />
      <div className="card">
        <input
          className="search"
          placeholder="🔎 Ism bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt">
          {list.length ? (
            list.map((c) => {
              const last = db.appts.filter((a) => a.clientId === c.id && a.status === "keldi").map((a) => a.date).sort().pop();
              return (
                <div className="list-item" key={c.id}>
                  <div className="avatar">{initials(c.name)}</div>
                  <div className="li-main">
                    <div className="li-title">
                      {c.name} {c.age ? <span className="muted">({c.age} yosh)</span> : null}
                    </div>
                    <div className="li-sub">
                      {c.diagnosis || "tashxis kiritilmagan"} · 📞 {c.phone || "—"} · oxirgi qabul: {last ? fmtD(last) : "hali bo'lmagan"}
                      {c.login ? <> · 🔑 {c.login}</> : null}
                    </div>
                  </div>
                  <button className="btn sm ghost" onClick={() => setModal({ type: "card", id: c.id })}>Karta</button>
                  <button className="btn sm ghost" onClick={() => setModal({ type: "form", client: c })}>✎</button>
                  <button className="btn sm bad" onClick={() => archive(c)}>🗑</button>
                </div>
              );
            })
          ) : (
            <Empty icon="👥">Mijozlar hali yo'q. Birinchi mijozni qo'shing!</Empty>
          )}
        </div>
      </div>

      {modal?.type === "form" && <ClientForm client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === "card" && (
        <ClientCard id={modal.id} onClose={() => setModal(null)} go={go} setProgClient={setProgClient} />
      )}
    </>
  );
}

function ClientForm({ client, onClose }) {
  const { db, patch, toast } = useApp();
  const c = client || {};
  const [f, setF] = useState({
    name: c.name || "", age: c.age || "", phone: c.phone || "",
    parent: c.parent || "", diagnosis: c.diagnosis || "", note: c.note || "",
    login: c.login || "", newPass: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveClient = async () => {
    if (!f.name.trim()) return toast("Ismni kiriting");
    const login = f.login.trim().toLowerCase();
    if (f.newPass && !login) return toast("Parol uchun avval login kiriting");
    if (login && !c.auth && !f.newPass) return toast("Yangi login uchun parol ham kiriting");
    if (login && db.clients.some((x) => x.id !== c.id && x.login === login))
      return toast("Bu login band — boshqasini tanlang");
    const auth = f.newPass ? await makeHashes(newSalt(), f.newPass) : undefined;
    const { newPass, ...fields } = f;
    const data = { ...fields, login };
    patch((d) => {
      if (c.id) {
        const x = d.clients.find((x) => x.id === c.id);
        Object.assign(x, data);
        if (auth) x.auth = auth;
        if (!login) delete x.auth; // login o'chirilsa kirish ham o'chadi
      } else {
        d.clients.push({ id: uid(), created: today(), ...data, ...(auth ? { auth } : {}) });
      }
    });
    toast("Saqlandi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>{c.id ? "Mijozni tahrirlash" : "Yangi mijoz"}</h3>
      <Field label="Ism familiya *"><input value={f.name} onChange={set("name")} /></Field>
      <div className="grid2">
        <Field label="Yoshi"><input type="number" value={f.age} onChange={set("age")} /></Field>
        <Field label="Telefon"><input value={f.phone} onChange={set("phone")} /></Field>
      </div>
      <Field label="Ota-onasi (F.I.Sh.)"><input value={f.parent} onChange={set("parent")} /></Field>
      <Field label="Tashxis / muammo">
        <input value={f.diagnosis} onChange={set("diagnosis")} placeholder="masalan: dislaliya, R tovushi" />
      </Field>
      <Field label="Izoh"><textarea rows={2} value={f.note} onChange={set("note")} /></Field>

      <div className="cred-box">
        <div className="cred-title">🔑 Mijoz kabinetiga kirish (ixtiyoriy)</div>
        <div className="muted">Login-parol bersangiz, mijoz o&apos;z qabullari va topshiriqlarini ko&apos;ra oladi.</div>
        <div className="grid2">
          <Field label="Login"><input value={f.login} onChange={set("login")} placeholder="masalan: aziz2019" /></Field>
          <Field label={c.auth ? "Yangi parol (bo'sh = o'zgarmaydi)" : "Parol"}>
            <input value={f.newPass} onChange={set("newPass")} placeholder="parol" />
          </Field>
        </div>
      </div>

      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={saveClient}>Saqlash</button>
      </div>
    </Modal>
  );
}

function ClientCard({ id, onClose, go, setProgClient }) {
  const { db, client } = useApp();
  const c = client(id);
  const appts = db.appts.filter((a) => a.clientId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const tasks = db.tasks.filter((k) => k.clientId === id);
  const done = tasks.filter((k) => k.status === "bajarildi").length;

  return (
    <Modal onClose={onClose}>
      <h3>{c.name}</h3>
      <div className="muted">
        {c.age ? c.age + " yosh · " : ""}{c.diagnosis || ""} · 📞 {c.phone || "—"}
        {c.parent ? " · Ota-onasi: " + c.parent : ""}
      </div>
      {c.note && <div className="mt muted">📌 {c.note}</div>}
      <label>Topshiriqlar bajarilishi</label>
      <progress max={tasks.length || 1} value={done} />
      <div className="muted">{done} / {tasks.length} bajarildi</div>
      <label>Oxirgi qabullar</label>
      {appts.length ? (
        appts.map((a) => (
          <div className="li-sub" style={{ padding: "3px 0" }} key={a.id}>
            • {fmtD(a.date)} {a.time} — {a.status}{a.paid ? " (to'langan)" : ""}
          </div>
        ))
      ) : (
        <div className="muted">Qabullar yo'q</div>
      )}
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Yopish</button>
        <button className="btn" onClick={() => { onClose(); setProgClient(id); go("progress"); }}>Oldin/Keyin</button>
      </div>
    </Modal>
  );
}
