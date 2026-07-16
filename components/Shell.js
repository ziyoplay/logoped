"use client";
import { useRef, useState } from "react";
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
  const fileRef = useRef(null);

  const nzCount = nazorat(db).total;
  const go = (p) => { setPage(p); window.scrollTo(0, 0); };

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

  const NavBtn = ({ p, mobile }) => (
    <button className={p.id === page ? "active" : ""} onClick={() => go(p.id)}>
      <span className="ic">{p.ic}</span>
      {mobile ? p.t.split(" ")[0] : p.t}
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
      <main className="main">{views[page]}</main>
      <nav className="bottomnav">
        {PAGES.map((p) => <NavBtn key={p.id} p={p} mobile />)}
        <button onClick={logout}><span className="ic">🚪</span>Chiqish</button>
      </nav>
    </div>
  );
}
