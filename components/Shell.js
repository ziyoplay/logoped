"use client";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useApp, exportData, importData } from "@/lib/store";
import { useAuth } from "./AuthGate";
import { nazorat } from "@/lib/helpers";
import Home from "./views/Home";
import Clients from "./views/Clients";
import Appts from "./views/Appts";
import Tasks from "./views/Tasks";
import Nazorat from "./views/Nazorat";
import Exercises from "./views/Exercises";
import Progress from "./views/Progress";
import Products from "./views/Products";
import Report from "./views/Report";

const PAGES = [
  { id: "home", ic: "📅", t: "Kunlik reja" },
  { id: "clients", ic: "👥", t: "Mijozlar" },
  { id: "appts", ic: "🗓️", t: "Qabul qilish" },
  { id: "tasks", ic: "📝", t: "Topshiriqlar" },
  { id: "nazorat", ic: "🔔", t: "Avto nazorat" },
  { id: "exercises", ic: "🧩", t: "Mashq turlari" },
  { id: "progress", ic: "📈", t: "Oldin / Keyin" },
  { id: "products", ic: "🛍️", t: "Tovarlar" },
  { id: "report", ic: "📊", t: "Hisobot" },
];

export default function Shell() {
  const { db, setDb, toast } = useApp();
  const { account, logout } = useAuth();
  const [page, setPage] = useState("home");
  const [progClient, setProgClient] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef(null);

  const nzCount = nazorat(db).total;
  // Sahifa almashuvi. Brauzer View Transitions'ni qo'llasa, eski va yangi sahifa
  // bir-biriga yumshoq singib almashadi; qo'llamasa — .page-fade animatsiyasi qoladi.
  const go = (p) => {
    const apply = () => {
      flushSync(() => { setPage(p); setMenuOpen(false); });
      window.scrollTo(0, 0);
    };
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (calm || typeof document.startViewTransition !== "function") return apply();

    const root = document.documentElement;
    root.classList.add("vt-active"); // ikkita animatsiya ustma-ust tushmasligi uchun
    document.startViewTransition(apply).finished
      .catch(() => {})
      .finally(() => root.classList.remove("vt-active"));
  };

  const views = {
    home: <Home go={go} />,
    clients: <Clients go={go} setProgClient={setProgClient} />,
    appts: <Appts />,
    tasks: <Tasks />,
    nazorat: <Nazorat />,
    exercises: <Exercises />,
    progress: <Progress progClient={progClient} setProgClient={setProgClient} />,
    products: <Products />,
    report: <Report />,
  };

  const NavBtn = ({ p }) => (
    <button className={p.id === page ? "active" : ""} onClick={() => go(p.id)}>
      <span className="ic">{p.ic}</span>
      {p.t}
      {p.id === "nazorat" && nzCount > 0 && <span className="badge">{nzCount}</span>}
    </button>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">Logoped<span>.uz</span></div>
        <nav className="nav">
          {PAGES.map((p) => <NavBtn key={p.id} p={p} />)}
        </nav>
        <div className="side-foot">
          👤 {account?.name}<br />
          Ma'lumotlar shu qurilmada saqlanadi.<br />
          <button onClick={() => exportData(db, toast)}>⬇ Zaxira</button>
          <button onClick={() => fileRef.current?.click()}>⬆ Yuklash</button>
          <button onClick={logout}>🚪 Chiqish</button>
          <input
            type="file"
            ref={fileRef}
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => { importData(e.target.files[0], setDb, toast); e.target.value = ""; }}
          />
        </div>
      </aside>
      <main className="main">
        <div key={page} className="page-fade">{views[page]}</div>
      </main>

      {/* telefon: yuqori panel + uch chiziqli menyu */}
      <header className="mobilebar">
        <div className="logo">Logoped<span>.uz</span></div>
        <button className="burger" aria-label="Menyuni ochish" onClick={() => setMenuOpen(true)}>
          ☰{nzCount > 0 && <span className="badge">{nzCount}</span>}
        </button>
      </header>
      {menuOpen && (
        <div className="drawer-bg" onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
          <div className="drawer">
            <div className="drawer-head">
              <div className="logo">Logoped<span>.uz</span></div>
              <button className="burger" aria-label="Menyuni yopish" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <nav className="nav">
              {PAGES.map((p) => <NavBtn key={p.id} p={p} />)}
            </nav>
            <div className="side-foot">
              👤 {account?.name}<br />
              <button onClick={() => exportData(db, toast)}>⬇ Zaxira</button>
              <button onClick={() => fileRef.current?.click()}>⬆ Yuklash</button>
              <button onClick={logout}>🚪 Chiqish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
