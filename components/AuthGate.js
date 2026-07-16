"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  ACC_KEY, getAccount, getSession, setSession, clearSession,
  makeHashes, checkPass, newSalt,
} from "@/lib/auth";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthGate({ children }) {
  const [state, setState] = useState("loading"); // loading | setup | login | in
  const [account, setAccount] = useState(null);
  const [session, setSess] = useState(null); // {role:'logoped'} | {role:'client', clientId}

  useEffect(() => {
    const acc = getAccount();
    setAccount(acc);
    if (!acc) { setState("setup"); return; }
    const s = getSession();
    if (s) {
      // mijoz sessiyasi bo'lsa — mijoz hali bazada borligini tekshiramiz
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
  }, []);

  const logout = () => {
    clearSession();
    setSess(null);
    setState("login");
  };

  if (state === "loading") return <div className="loader">Yuklanmoqda...</div>;
  if (state === "setup")
    return <Setup onDone={(acc) => { setAccount(acc); setSess({ role: "logoped" }); setState("in"); }} />;
  if (state === "login")
    return <Login account={account} onDone={(s) => { setSess(s); setState("in"); }} />;

  return <AuthCtx.Provider value={{ account, session, logout }}>{children}</AuthCtx.Provider>;
}

/* ---------- birinchi ishga tushirish: logoped hisobini yaratish ---------- */
function Setup({ onDone }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Ismingizni kiriting");
    if (pass.length < 4) return setErr("Parol kamida 4 ta belgidan iborat bo'lsin");
    if (pass !== pass2) return setErr("Parollar bir xil emas");
    const acc = { name: name.trim(), ...(await makeHashes(newSalt(), pass)) };
    localStorage.setItem(ACC_KEY, JSON.stringify(acc));
    setSession({ role: "logoped" }, false);
    onDone(acc);
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">Logoped<span>.uz</span></div>
        <h2>Xush kelibsiz! 👋</h2>
        <p className="muted">Logoped hisobini yarating. Parol faqat shu qurilmada saqlanadi.</p>
        <label>Ismingiz</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: Dilnoza Karimova" autoFocus />
        <label>Parol</label>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
        <label>Parolni takrorlang</label>
        <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
        {err && <div className="login-err">{err}</div>}
        <button className="btn login-btn" type="submit">Hisob yaratish</button>
      </form>
    </div>
  );
}

/* ---------- kirish: logoped yoki mijoz ---------- */
function Login({ account, onDone }) {
  const [role, setRole] = useState("logoped");
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (role === "logoped") {
      const acc = account || getAccount();
      if (!(await checkPass(acc, pass))) { setErr("Parol noto'g'ri"); setPass(""); return; }
      setSession({ role: "logoped" }, remember);
      onDone({ role: "logoped" });
    } else {
      let db = null;
      try { db = JSON.parse(localStorage.getItem("logoped_db")); } catch {}
      const c = db?.clients?.find(
        (x) => !x.archived && x.login && x.login.toLowerCase() === login.trim().toLowerCase()
      );
      if (!c || !(await checkPass(c.auth, pass))) {
        setErr("Login yoki parol noto'g'ri");
        setPass("");
        return;
      }
      const sess = { role: "client", clientId: c.id };
      setSession(sess, remember);
      onDone(sess);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">Logoped<span>.uz</span></div>
        <div className="login-tabs">
          <button type="button" className={role === "logoped" ? "active" : ""}
            onClick={() => { setRole("logoped"); setErr(""); }}>🧑‍⚕️ Logoped</button>
          <button type="button" className={role === "client" ? "active" : ""}
            onClick={() => { setRole("client"); setErr(""); }}>👤 Mijoz</button>
        </div>
        {role === "logoped" ? (
          <>
            <h2>Assalomu alaykum, {account?.name || ""}!</h2>
            <p className="muted">Davom etish uchun parolni kiriting.</p>
          </>
        ) : (
          <>
            <h2>Mijoz kabineti</h2>
            <p className="muted">Login va parolni logopedingiz beradi.</p>
            <label>Login</label>
            <input value={login} onChange={(e) => setLogin(e.target.value)} autoFocus />
          </>
        )}
        <label>Parol</label>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus={role === "logoped"} />
        <label className="login-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Bu qurilmada eslab qolish
        </label>
        {err && <div className="login-err">{err}</div>}
        <button className="btn login-btn" type="submit">Kirish</button>
      </form>
    </div>
  );
}
