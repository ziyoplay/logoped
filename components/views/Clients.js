"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "../AuthGate";
import { fmtD, fmtMoney, initials, uid, today, ageFrom, phoneOf } from "@/lib/helpers";
import { makeHashes, newSalt } from "@/lib/auth";
import { Modal, Field, Empty, PageHead, Stat, Avatar } from "../ui";
import { ApptForm } from "../appt";
import { TaskForm, TaskRow } from "../task";

export default function Clients({ go, setProgClient }) {
  const { db, patch, toast, activeClients } = useApp();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null); // ochilgan mijoz sahifasi
  const [modal, setModal] = useState(null);   // {type:'form'|'referral'|'appt'|'task', ...}

  const list = activeClients().filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const archive = (c) => {
    if (!confirm(c.name + " ro'yxatdan olib tashlansinmi? (tarix saqlanadi)")) return;
    patch((d) => { d.clients.find((x) => x.id === c.id).archived = true; });
    setOpenId(null);
    toast("Arxivlandi");
  };

  /* ---- mijozning alohida sahifasi ---- */
  if (openId) {
    const c = activeClients().find((x) => x.id === openId);
    if (!c) { setOpenId(null); return null; }
    return (
      <div key={openId} className="page-fade">
        <ClientPage
          c={c}
          onBack={() => setOpenId(null)}
          onEdit={() => setModal({ type: "form", client: c })}
          onArchive={() => archive(c)}
          onAddReferral={() => setModal({ type: "referral" })}
          onAddAppt={() => setModal({ type: "appt" })}
          onAddTask={() => setModal({ type: "task" })}
          onProgress={() => { setProgClient(c.id); go("progress"); }}
        />
        {modal?.type === "form" && <ClientForm client={c} onClose={() => setModal(null)} />}
        {modal?.type === "referral" && <ReferralForm clientId={c.id} onClose={() => setModal(null)} />}
        {modal?.type === "appt" && <ApptForm initial={{ clientId: c.id }} onClose={() => setModal(null)} />}
        {modal?.type === "task" && <TaskForm defaultClientId={c.id} onClose={() => setModal(null)} />}
      </div>
    );
  }

  /* ---- mijozlar ro'yxati ---- */
  return (
    <div key="list" className="page-fade">
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
                <div className="list-item clickable" key={c.id} onClick={() => setOpenId(c.id)}>
                  <Avatar c={c} />
                  <div className="li-main">
                    <div className="li-title">
                      {c.name} {age ? <span className="muted">({age} yosh)</span> : null}
                    </div>
                    <div className="li-sub">
                      {c.diagnosis || "tashxis kiritilmagan"} · 📞 {phoneOf(c) || "—"} · oxirgi qabul: {last ? fmtD(last) : "hali bo'lmagan"}
                      {c.login ? <> · 🔑 {c.login}</> : null}
                    </div>
                  </div>
                  <span className="open-hint">Ochish ›</span>
                </div>
              );
            })
          ) : (
            <Empty icon="👥">Mijozlar hali yo'q. Birinchi mijozni qo'shing!</Empty>
          )}
        </div>
      </div>
      {modal?.type === "form" && <ClientForm client={modal.client} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ================= MIJOZ SAHIFASI ================= */
function ClientPage({ c, onBack, onEdit, onArchive, onAddReferral, onAddAppt, onAddTask, onProgress }) {
  const { db, patch } = useApp();
  const age = ageFrom(c.birthDate) ?? c.age;
  const appts = db.appts.filter((a) => a.clientId === c.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const services = appts.filter((a) => a.status === "keldi");
  const paidTotal = services.filter((a) => a.paid).reduce((s, a) => s + (+a.price || 0), 0);
  const debt = services.filter((a) => !a.paid).reduce((s, a) => s + (+a.price || 0), 0);
  const upcoming = appts.filter((a) => a.status === "rejalashtirilgan" && a.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const tasks = db.tasks.filter((k) => k.clientId === c.id);
  const activeTasks = tasks.filter((k) => k.status === "berildi");
  const doneCount = tasks.filter((k) => k.status === "bajarildi").length;
  const referrals = [...(c.referrals || [])].sort((a, b) => b.date.localeCompare(a.date));

  const delReferral = (rid) => {
    if (!confirm("Murojaat yozuvi o'chirilsinmi?")) return;
    patch((d) => {
      const x = d.clients.find((x) => x.id === c.id);
      x.referrals = (x.referrals || []).filter((r) => r.id !== rid);
    });
  };

  return (
    <>
      <button className="btn ghost sm no-print" onClick={onBack}>← Mijozlar ro&apos;yxati</button>

      {/* sarlavha */}
      <div className="card client-head mt">
        <Avatar c={c} big />
        <div className="li-main">
          <div className="client-name">{c.name}</div>
          <div className="muted">
            {c.birthDate ? <>🎂 {fmtD(c.birthDate)} ({age} yosh)</> : age ? <>{age} yosh</> : "yoshi kiritilmagan"}
            {c.diagnosis ? <> · 🩺 {c.diagnosis}</> : null}
          </div>
          <div className="client-contacts">
            {c.fatherPhone && <a className="tag green" href={"tel:" + c.fatherPhone}>📞 Otasi: {c.fatherPhone}</a>}
            {c.motherPhone && <a className="tag green" href={"tel:" + c.motherPhone}>📞 Onasi: {c.motherPhone}</a>}
            {!c.fatherPhone && !c.motherPhone && c.phone && <a className="tag green" href={"tel:" + c.phone}>📞 {c.phone}</a>}
            {c.parent && <span className="tag gray">👪 {c.parent}</span>}
            {c.login && <span className="tag amber">🔑 {c.login}</span>}
          </div>
          {c.note && <div className="muted mt">📌 {c.note}</div>}
        </div>
        <div className="client-actions no-print">
          <button className="btn sm ghost" onClick={onEdit}>✎ Tahrirlash</button>
          <button className="btn sm bad" onClick={onArchive}>🗑 Arxivlash</button>
        </div>
      </div>

      {/* statistika */}
      <div className="grid4">
        <Stat n={services.length} l="Bo'lib o'tgan qabullar" />
        <Stat n={fmtMoney(paidTotal)} l="Jami to'lagan" small />
        <Stat n={fmtMoney(debt)} l="Qarzdorlik" cls={debt ? "bad" : ""} small />
        <Stat n={`${doneCount}/${tasks.length}`} l="Bajarilgan topshiriqlar" />
      </div>

      {/* tezkor amallar */}
      <div className="row mt no-print">
        <button className="btn" onClick={onAddAppt}>＋ Qabul</button>
        <button className="btn" onClick={onAddTask}>＋ Topshiriq</button>
        <button className="btn ghost" onClick={onAddReferral}>＋ Murojaat</button>
        <button className="btn ghost" onClick={onProgress}>📈 Oldin / Keyin</button>
      </div>

      <div className="grid2 mt" style={{ alignItems: "start" }}>
        <div>
          {/* murojaatlar tarixi */}
          <div className="card">
            <h3>📋 Murojaatlar tarixi</h3>
            {referrals.length ? referrals.map((r) => (
              <div className="ref-item" key={r.id}>
                <div className="row">
                  <b>{fmtD(r.date)}</b>
                  {r.byWhom && <span className="muted">· {r.byWhom}</span>}
                  <div className="spacer" />
                  <button className="btn sm bad no-print" onClick={() => delReferral(r.id)}>🗑</button>
                </div>
                {r.prevState && <div className="li-sub">Holati: {r.prevState}</div>}
              </div>
            )) : <Empty>Murojaatlar kiritilmagan.</Empty>}
          </div>

          {/* kelgusi qabullar */}
          <div className="card">
            <h3>🗓️ Kelgusi qabullar</h3>
            {upcoming.length ? upcoming.slice(0, 5).map((a) => (
              <div className="list-item" key={a.id}>
                <div className="avatar">{a.time?.slice(0, 5)}</div>
                <div className="li-main">
                  <div className="li-title">{fmtD(a.date)}</div>
                  <div className="li-sub">{a.service || "Mashg'ulot"} · {fmtMoney(a.price)}</div>
                </div>
              </div>
            )) : <Empty>Kelgusi qabul belgilanmagan.</Empty>}
          </div>

          {/* faol topshiriqlar */}
          <div className="card">
            <h3>📝 Faol topshiriqlar</h3>
            {activeTasks.length ? activeTasks.map((k) => <TaskRow key={k.id} task={k} />)
              : <Empty>Faol topshiriq yo&apos;q.</Empty>}
          </div>
        </div>

        <div>
          {/* xizmatlar tarixi */}
          <div className="card">
            <h3>💼 Ko&apos;rsatilgan xizmatlar va narxlari</h3>
            {services.length ? (
              <div className="t-wrap">
                <table>
                  <thead><tr><th>Sana</th><th>Xizmat</th><th>Narxi</th><th>To&apos;lov</th></tr></thead>
                  <tbody>
                    {services.map((a) => (
                      <tr key={a.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtD(a.date)}</td>
                        <td>{a.service || "Mashg'ulot"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtMoney(a.price)}</td>
                        <td>{a.paid
                          ? <span className="tag green">to&apos;landi</span>
                          : <button className="tag red" style={{ border: "none", cursor: "pointer" }}
                              title="To'landi deb belgilash"
                              onClick={() => patch((d) => { d.appts.find((x) => x.id === a.id).paid = true; })}>
                              qarz ✓?
                            </button>}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2}><b>Jami: {services.length} ta</b></td>
                      <td colSpan={2} className="money">{fmtMoney(paidTotal + debt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <Empty>Hali xizmat ko&apos;rsatilmagan.</Empty>}
          </div>

          {/* guvohnoma (ixtiyoriy) */}
          {c.guvohnoma && (
            <div className="card">
              <h3>📄 Guvohnoma</h3>
              <a href={c.guvohnoma} target="_blank" rel="noreferrer" className="doc-thumb wide">
                <img src={c.guvohnoma} alt="Guvohnoma" />
              </a>
              <div className="muted mt">Kattalashtirib ko&apos;rish uchun rasmni bosing.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================= MIJOZ ANKETASI ================= */
function ClientForm({ client, onClose }) {
  const { db, patch, toast } = useApp();
  const { account } = useAuth();
  const c = client || {};
  const [f, setF] = useState({
    name: c.name || "",
    photo: c.photo || "",
    guvohnoma: c.guvohnoma || "",
    birthDate: c.birthDate || "",
    fatherPhone: c.fatherPhone || "",
    motherPhone: c.motherPhone || (c.phone && !c.fatherPhone ? c.phone : ""),
    parent: c.parent || "",
    diagnosis: c.diagnosis || "",
    note: c.note || "",
    login: c.login || "",
    newPass: "",
    refBy: "",
    refDate: today(),
    refState: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // rasm/kadr kvadrat qilib kichraytiriladi (240px) — baza katta bo'lib ketmasligi uchun
  const toSquare = (src, w, h) => {
    const s = Math.min(w, h);
    const cv = document.createElement("canvas");
    cv.width = cv.height = 240;
    cv.getContext("2d").drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, 240, 240);
    return cv.toDataURL("image/jpeg", 0.85);
  };

  // guvohnoma hujjati — matni o'qilishi kerak, shuning uchun nisbati saqlanadi.
  // Uzun tomoni 900px: baza bitta JSON bo'lib saqlangani uchun hajmni tiyib turamiz.
  const toDoc = (img) => {
    const k = Math.min(1, 900 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k);
    cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.75);
  };

  const readImage = (e, done) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const img = new Image();
    img.onload = () => { done(img); URL.revokeObjectURL(img.src); };
    img.onerror = () => toast("Rasm o'qilmadi — boshqa fayl tanlang");
    img.src = URL.createObjectURL(file);
  };

  const onPhoto = (e) => readImage(e, (img) => setF((p) => ({ ...p, photo: toSquare(img, img.width, img.height) })));

  const onGuvohnoma = (e) => readImage(e, (img) => setF((p) => ({ ...p, guvohnoma: toDoc(img) })));

  /* ---- kamera bilan olish ---- */
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const camInputRef = useRef(null); // brauzer kamerani bermasa — telefonning kamera-dialogi

  const closeCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };
  useEffect(() => closeCam, []);

  const openCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      });
    } catch {
      camInputRef.current?.click();
    }
  };

  const shoot = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    setF((p) => ({ ...p, photo: toSquare(v, v.videoWidth, v.videoHeight) }));
    closeCam();
  };

  const saveClient = async () => {
    if (!f.name.trim()) return toast("F.I.Sh. kiriting");
    const login = f.login.trim().toLowerCase();
    if (f.newPass && !login) return toast("Parol uchun avval login kiriting");
    if (login && !c.auth && !f.newPass) return toast("Yangi login uchun parol ham kiriting");
    if (login && db.clients.some((x) => x.id !== c.id && x.login === login))
      return toast("Bu login band — boshqasini tanlang");
    // Kirishda avval logoped hisobi tekshiriladi: login uning ismi bilan bir xil
    // bo'lsa, mijoz hech qachon o'z kabinetiga kira olmaydi.
    if (login && account?.name?.trim().toLowerCase() === login)
      return toast("Bu login logoped ismi bilan bir xil — boshqasini tanlang");
    const auth = f.newPass ? await makeHashes(newSalt(), f.newPass) : undefined;
    const { newPass, refBy, refDate, refState, ...fields } = f;
    const data = { ...fields, login };
    patch((d) => {
      if (c.id) {
        const x = d.clients.find((x) => x.id === c.id);
        Object.assign(x, data);
        if (auth) x.auth = auth;
        if (!login) delete x.auth;
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

      <div className="photo-pick">
        <Avatar c={{ name: f.name || "?", photo: f.photo }} big />
        <div className="photo-pick-btns">
          <button type="button" className="btn ghost sm" onClick={openCam}>📸 Kameradan olish</button>
          <label className="btn ghost sm photo-pick-label">
            🖼 Galereyadan
            <input type="file" accept="image/*" onChange={onPhoto} hidden />
          </label>
          {f.photo && (
            <button type="button" className="btn sm bad" onClick={() => setF({ ...f, photo: "" })}>
              🗑
            </button>
          )}
          {/* zaxira yo'l: brauzer kamerani bermasa, telefonning o'z kamera-dialogi ochiladi */}
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden ref={camInputRef} />
        </div>
      </div>

      {camOn && (
        <div className="photo-cam">
          <video ref={videoRef} playsInline muted />
          <div className="photo-cam-btns">
            <button type="button" className="btn" onClick={shoot}>📸 Suratga olish</button>
            <button type="button" className="btn ghost" onClick={closeCam}>Bekor</button>
          </div>
        </div>
      )}

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

      <div className="cred-box">
        <div className="cred-title">📄 Guvohnoma <span className="opt-note">— не обязательно</span></div>
        <div className="muted">Tibbiy xulosa, sertifikat yoki boshqa hujjat rasmini yuklashingiz mumkin.</div>
        {f.guvohnoma && (
          <a href={f.guvohnoma} target="_blank" rel="noreferrer" className="doc-thumb">
            <img src={f.guvohnoma} alt="Guvohnoma" />
          </a>
        )}
        <div className="photo-pick-btns mt">
          <label className="btn ghost sm photo-pick-label">
            {f.guvohnoma ? "🔄 Boshqasini tanlash" : "🖼 Rasm yuklash"}
            <input type="file" accept="image/*" onChange={onGuvohnoma} hidden />
          </label>
          <label className="btn ghost sm photo-pick-label">
            📸 Kameradan
            <input type="file" accept="image/*" capture="environment" onChange={onGuvohnoma} hidden />
          </label>
          {f.guvohnoma && (
            <button type="button" className="btn sm bad" onClick={() => setF({ ...f, guvohnoma: "" })}>🗑</button>
          )}
        </div>
      </div>

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

/* ================= YANGI MUROJAAT ================= */
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
