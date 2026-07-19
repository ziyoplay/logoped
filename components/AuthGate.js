"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  ACC_KEY, getAccount, getSession, setSession, clearSession,
  makeHashes, checkPass, newSalt,
} from "@/lib/auth";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthGate({ children }) {
  const [state, setState] = useState("loading"); // loading | setup | login | in | dberr
  const [serverMode, setServerMode] = useState(false);
  const [account, setAccount] = useState(null);
  const [session, setSess] = useState(null); // {role:'logoped'} | {role:'client', clientId}

  // server rejimi: bazaga ulangan bo'lsa sessiya cookie'da yashaydi
  const boot = async () => {
    setState("loading");
    let mode = null;
    try {
      const r = await fetch("/api/mode");
      if (r.ok) mode = await r.json();
    } catch {}

    if (mode?.db) {
      setServerMode(true);
      if (!mode.ok) { setState("dberr"); return; }
      setAccount(mode.account);
      if (mode.session) { setSess(mode.session); setState("in"); }
      else if (!mode.account) setState("setup");
      else setState("login");
      return;
    }

    // lokal rejim (baza sozlanmagan): ma'lumotlar shu qurilmada
    const acc = getAccount();
    setAccount(acc);
    if (!acc) { setState("setup"); return; }
    const s = getSession();
    if (s) {
      if (s.role === "client") {
        try {
          const db = JSON.parse(localStorage.getItem("logoped_db"));
          const c = db?.clients?.find((x) => x.id === s.clientId && !x.archived && x.login);
          if (!c) { clearSession(); setState("login"); return; }
        } catch { clearSession(); setState("login"); return; }
      }
      setSess(s);
      setState("in");
    } else setState("login");
  };

  useEffect(() => { boot(); }, []);

  const logout = async () => {
    if (serverMode) {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    } else clearSession();
    setSess(null);
    setState("login");
  };

  if (state === "loading") return <div className="loader">Yuklanmoqda...</div>;
  if (state === "dberr")
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">Logoped<span>.uz</span></div>
          <h2>Baza bilan aloqa yo'q 😔</h2>
          <p className="muted">Server ma'lumotlar bazasiga ulana olmadi. Birozdan so'ng qayta urinib ko'ring.</p>
          <button className="btn login-btn" onClick={boot}>🔄 Qayta urinish</button>
        </div>
      </div>
    );
  if (state === "setup")
    return <Setup serverMode={serverMode} onDone={(acc, s) => { setAccount(acc); setSess(s); setState("in"); }} />;
  if (state === "login")
    return <Login serverMode={serverMode} account={account} onDone={(s) => { setSess(s); setState("in"); }} />;

  return <AuthCtx.Provider value={{ account, session, logout, serverMode }}>{children}</AuthCtx.Provider>;
}

/* suzuvchi harflar — bolalar talaffuzida qiyin tovushlar (R va Sh CSS'da) */
const LoginBubbles = () => (
  <div className="login-bubbles" aria-hidden="true">
    <span>S</span>
    <span>L</span>
    <span>Z</span>
  </div>
);

/* ---------- birinchi ishga tushirish: logoped hisobini yaratish ---------- */
function Setup({ serverMode, onDone }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Ismingizni kiriting");
    if (pass.length < 4) return setErr("Parol kamida 4 ta belgidan iborat bo'lsin");
    if (pass !== pass2) return setErr("Parollar bir xil emas");

    if (serverMode) {
      setBusy(true);
      try {
        const r = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), pass }),
        });
        const j = await r.json();
        if (!r.ok) return setErr(j.error || "Xatolik yuz berdi");
        onDone({ name: name.trim() }, j.session);
      } catch {
        setErr("Server bilan aloqa yo'q");
      } finally {
        setBusy(false);
      }
      return;
    }

    const acc = { name: name.trim(), ...(await makeHashes(newSalt(), pass)) };
    localStorage.setItem(ACC_KEY, JSON.stringify(acc));
    setSession({ role: "logoped" }, false);
    onDone(acc, { role: "logoped" });
  };

  return (
    <div className="login-wrap">
      <LoginBubbles />
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">Logoped<span>.uz</span></div>
        <h2>Xush kelibsiz! 👋</h2>
        <p className="muted">
          Logoped hisobini yarating. Ismingiz kirish uchun login bo'lib xizmat qiladi.
          {serverMode
            ? " Ma'lumotlar serverda xavfsiz saqlanadi."
            : " Parol faqat shu qurilmada saqlanadi."}
        </p>
        <label>Ismingiz (login)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: Dilnoza Karimova" autoFocus />
        <label>Parol</label>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
        <label>Parolni takrorlang</label>
        <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
        {err && <div className="login-err">{err}</div>}
        <button className="btn login-btn" type="submit" disabled={busy}>
          {busy ? "Yaratilmoqda..." : "Hisob yaratish"}
        </button>
      </form>
    </div>
  );
}

/* ---------- kirish: ism (login) + parol ---------- */
function Login({ serverMode, account, onDone }) {
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const name = login.trim().toLowerCase();
    if (!name) return setErr("Ism yoki loginni kiriting");
    if (!pass) return setErr("Parolni kiriting");

    if (serverMode) {
      setBusy(true);
      try {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: name, pass, remember }),
        });
        const j = await r.json();
        if (!r.ok) { setPass(""); return setErr(j.error || "Xatolik yuz berdi"); }
        onDone(j.session);
      } catch {
        setErr("Server bilan aloqa yo'q");
      } finally {
        setBusy(false);
      }
      return;
    }

    const acc = account || getAccount();
    let db = null;
    try { db = JSON.parse(localStorage.getItem("logoped_db")); } catch {}
    const clients = (db?.clients || []).filter((x) => !x.archived && x.login && x.auth);

    // logoped — o'z ismi bilan kiradi
    if (acc?.name?.trim().toLowerCase() === name && (await checkPass(acc, pass))) {
      setSession({ role: "logoped" }, remember);
      return onDone({ role: "logoped" });
    }

    // mijoz — o'z logini bilan kiradi
    const c = clients.find((x) => x.login.toLowerCase() === name);
    if (c && (await checkPass(c.auth, pass))) {
      setSession({ role: "client", clientId: c.id }, remember);
      return onDone({ role: "client", clientId: c.id });
    }

    setErr("Ism yoki parol noto'g'ri");
    setPass("");
  };

  return (
    <div className="login-wrap">
      <LoginBubbles />
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">Logoped<span>.uz</span></div>
        <h2>Assalomu alaykum!</h2>
        <p className="muted">Ismingiz (login) va parolingizni kiriting.</p>
        <label>Ism / login</label>
        <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="masalan: Dilnoza Karimova" autoFocus />
        <label>Parol</label>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
        <label className="login-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Bu qurilmada eslab qolish
        </label>
        {err && <div className="login-err">{err}</div>}
        <button className="btn login-btn" type="submit" disabled={busy}>
          {busy ? "Tekshirilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}
