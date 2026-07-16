"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { fmtD, fmtMoney, initials, uid, today, ageFrom, phoneOf } from "@/lib/helpers";
import { makeHashes, newSalt } from "@/lib/auth";
import { Modal, Field, Empty, PageHead } from "../ui";

export default function Clients({ go, setProgClient }) {
  const { db, patch, toast, activeClients } = useApp();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {type:'form'|'card'|'referral', ...}

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
          placeholder="🔎 F.I.Sh. bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt">
          {list.length ? (
            list.map((c) => {
              const last = db.appts.filter((a) => a.clientId === c.id && a.status === "keldi").map((a) => a.date).sort().pop();
              const age = ageFrom(c.birthDate) ?? c.age;
              return (
                <div className="list-item" key={c.id}>
                  <div className="avatar">{initials(c.name)}</div>
                  <div className="li-main">
                    <div className="li-title">
                      {c.name} {age ? <span className="muted">({age} yosh)</span> : null}
                    </div>
                    <div className="li-sub">
                      {c.diagnosis || "tashxis kiritilmagan"} · 📞 {phoneOf(c) || "—"} · oxirgi qabul: {last ? fmtD(last) : "hali bo'lmagan"}
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
        <ClientCard
          id={modal.id}
          onClose={() => setModal(null)}
          go={go}
          setProgClient={setProgClient}
          onAddReferral={() => setModal({ type: "referral", id: modal.id })}
        />
      )}
      {modal?.type === "referral" && (
        <ReferralForm clientId={modal.id} onClose={() => setModal({ type: "card", id: modal.id })} />
      )}
    </>
  );
}

/* ---------- mijoz anketasi ---------- */
function ClientForm({ client, onClose }) {
  const { db, patch, toast } = useApp();
  const c = client || {};
  const [f, setF] = useState({
    name: c.name || "",
    birthDate: c.birthDate || "",
    fatherPhone: c.fatherPhone || "",
    motherPhone: c.motherPhone || (c.phone && !c.fatherPhone ? c.phone : ""),
    parent: c.parent || "",
    diagnosis: c.diagnosis || "",
    note: c.note || "",
    login: c.login || "",
    newPass: "",
    // birinchi murojaat (faqat yangi mijoz uchun)
    refBy: "",
    refDate: today(),
    refState: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveClient = async () => {
    if (!f.name.trim()) return toast("F.I.Sh. kiriting");
    const login = f.login.trim().toLowerCase();
    if (f.newPass && !login) return toast("Parol uchun avval login kiriting");
    if (login && !c.auth && !f.newPass) return toast("Yangi login uchun parol ham kiriting");
    if (login && db.clients.some((x) => x.id !== c.id && x.login === login))
      return toast("Bu login band — boshqasini tanlang");
    const auth = f.newPass ? await makeHashes(newSalt(), f.newPass) : undefined;
    const { newPass, refBy, refDate, refState, ...fields } = f;
    const data = { ...fields, login };
    patch((d) => {
      if (c.id) {
        const x = d.clients.find((x) => x.id === c.id);
        Object.assign(x, data);
        if (auth) x.auth = auth;
        if (!login) delete x.auth; // login o'chirilsa kirish ham o'chadi
      } else {
        const referrals = (refBy.trim() || refState.trim())
          ? [{ id: uid(), date: refDate || today(), byWhom: refBy.trim(), prevState: refState.trim() }]
          : [];
        d.clients.push({ id: uid(), created: today(), ...data, referrals, ...(auth ? { auth } : {}) });
      }
    });
    toast("Saqlandi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>{c.id ? "Mijozni tahrirlash" : "Yangi mijoz"}</h3>
      <Field label="F.I.Sh. (mijoz) *"><input value={f.name} onChange={set("name")} placeholder="Familiya Ism Sharif" /></Field>
      <Field label="Tug'ilgan sana">
        <input type="date" value={f.birthDate} onChange={set("birthDate")} />
      </Field>
      {f.birthDate && <div className="muted">Yoshi: {ageFrom(f.birthDate)} da</div>}
      <div className="grid2">
        <Field label="Otasining telefoni"><input value={f.fatherPhone} onChange={set("fatherPhone")} placeholder="+998 90 123 45 67" /></Field>
        <Field label="Onasining telefoni"><input value={f.motherPhone} onChange={set("motherPhone")} placeholder="+998 90 123 45 67" /></Field>
      </div>
      <Field label="Ota-onasi (F.I.Sh.)"><input value={f.parent} onChange={set("parent")} /></Field>
      <Field label="Tashxis / muammo">
        <input value={f.diagnosis} onChange={set("diagnosis")} placeholder="masalan: dislaliya, R tovushi" />
      </Field>
      <Field label="Izoh"><textarea rows={2} value={f.note} onChange={set("note")} /></Field>

      {!c.id && (
        <div className="cred-box" style={{ background: "var(--accent-soft)" }}>
          <div className="cred-title" style={{ color: "#9A6A16" }}>📋 Birinchi murojaat</div>
          <div className="grid2">
            <Field label="Kim murojaat qildi (F.I.Sh.)"><input value={f.refBy} onChange={set("refBy")} placeholder="masalan: onasi — Karimova Nodira" /></Field>
            <Field label="Murojaat sanasi"><input type="date" value={f.refDate} onChange={set("refDate")} /></Field>
          </div>
          <Field label="Murojaat paytidagi holati (oldingi holat)">
            <textarea rows={2} value={f.refState} onChange={set("refState")} placeholder="nutq holati, shikoyatlar..." />
          </Field>
        </div>
      )}

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

/* ---------- mijoz kartasi: to'liq ma'lumot + tarix ---------- */
function ClientCard({ id, onClose, go, setProgClient, onAddReferral }) {
  const { db, client, patch } = useApp();
  const c = client(id);
  const appts = db.appts.filter((a) => a.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const services = appts.filter((a) => a.status === "keldi");
  const servicesTotal = services.reduce((s, a) => s + (+a.price || 0), 0);
  const tasks = db.tasks.filter((k) => k.clientId === id);
  const done = tasks.filter((k) => k.status === "bajarildi").length;
  const referrals = [...(c.referrals || [])].sort((a, b) => b.date.localeCompare(a.date));
  const age = ageFrom(c.birthDate) ?? c.age;

  const delReferral = (rid) => {
    if (!confirm("Murojaat yozuvi o'chirilsinmi?")) return;
    patch((d) => {
      const x = d.clients.find((x) => x.id === id);
      x.referrals = (x.referrals || []).filter((r) => r.id !== rid);
    });
  };

  return (
    <Modal onClose={onClose}>
      <h3>{c.name}</h3>
      <div className="muted">
        {c.birthDate ? <>🎂 {fmtD(c.birthDate)} ({age} yosh) · </> : age ? <>{age} yosh · </> : null}
        {c.diagnosis || "tashxis kiritilmagan"}
      </div>
      <div className="muted">
        {c.fatherPhone ? <>📞 Otasi: {c.fatherPhone} · </> : null}
        {c.motherPhone ? <>📞 Onasi: {c.motherPhone}</> : null}
        {!c.fatherPhone && !c.motherPhone && c.phone ? <>📞 {c.phone}</> : null}
      </div>
      {c.parent && <div className="muted">👪 Ota-onasi: {c.parent}</div>}
      {c.note && <div className="mt muted">📌 {c.note}</div>}

      <label>📋 Murojaatlar tarixi</label>
      {referrals.length ? referrals.map((r) => (
        <div className="ref-item" key={r.id}>
          <div className="row">
            <b>{fmtD(r.date)}</b>
            {r.byWhom && <span className="muted">· {r.byWhom}</span>}
            <div className="spacer" />
            <button className="btn sm bad" onClick={() => delReferral(r.id)}>🗑</button>
          </div>
          {r.prevState && <div className="li-sub">Holati: {r.prevState}</div>}
        </div>
      )) : <div className="muted">Murojaatlar kiritilmagan</div>}
      <button className="btn sm ghost mt" onClick={onAddReferral}>＋ Murojaat qo&apos;shish</button>

      <label>💼 Ko&apos;rsatilgan xizmatlar va narxlari</label>
      {services.length ? (
        <div className="t-wrap">
          <table>
            <thead><tr><th>Sana</th><th>Xizmat</th><th>Narxi</th><th>To&apos;lov</th></tr></thead>
            <tbody>
              {services.map((a) => (
                <tr key={a.id}>
                  <td>{fmtD(a.date)}</td>
                  <td>{a.service || "Mashg'ulot"}</td>
                  <td>{fmtMoney(a.price)}</td>
                  <td>{a.paid ? <span className="tag green">to&apos;landi</span> : <span className="tag red">qarz</span>}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}><b>Jami: {services.length} ta xizmat</b></td>
                <td colSpan={2} className="money">{fmtMoney(servicesTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : <div className="muted">Hali xizmat ko&apos;rsatilmagan</div>}

      <label>Topshiriqlar bajarilishi</label>
      <progress max={tasks.length || 1} value={done} />
      <div className="muted">{done} / {tasks.length} bajarildi</div>

      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Yopish</button>
        <button className="btn" onClick={() => { onClose(); setProgClient(id); go("progress"); }}>Oldin/Keyin</button>
      </div>
    </Modal>
  );
}

/* ---------- yangi murojaat yozuvi ---------- */
function ReferralForm({ clientId, onClose }) {
  const { patch, toast } = useApp();
  const [f, setF] = useState({ date: today(), byWhom: "", prevState: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveRef = () => {
    if (!f.byWhom.trim() && !f.prevState.trim()) return toast("Ma'lumot kiriting");
    patch((d) => {
      const x = d.clients.find((x) => x.id === clientId);
      x.referrals = x.referrals || [];
      x.referrals.push({ id: uid(), date: f.date || today(), byWhom: f.byWhom.trim(), prevState: f.prevState.trim() });
    });
    toast("Murojaat qo'shildi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>Yangi murojaat</h3>
      <Field label="Kim murojaat qildi (F.I.Sh.)">
        <input value={f.byWhom} onChange={set("byWhom")} placeholder="masalan: otasi — Karimov Anvar" autoFocus />
      </Field>
      <Field label="Murojaat sanasi"><input type="date" value={f.date} onChange={set("date")} /></Field>
      <Field label="Murojaat paytidagi holati (oldingi holat)">
        <textarea rows={3} value={f.prevState} onChange={set("prevState")} placeholder="nutq holati, shikoyatlar, avvalgi davolanish..." />
      </Field>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={saveRef}>Saqlash</button>
      </div>
    </Modal>
  );
}
