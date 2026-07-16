"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { freshDb, today } from "./helpers";

const Ctx = createContext(null);
const KEY = "logoped_db";

export function AppProvider({ children }) {
  const [db, setDb] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch {}
    setDb(d && d.clients ? d : freshDb());
  }, []);

  useEffect(() => {
    if (db) localStorage.setItem(KEY, JSON.stringify(db));
  }, [db]);

  // patch(fn): fn nusxa ustida o'zgartirish kiritadi, so'ng saqlanadi
  const patch = (fn) => setDb((d) => { const c = structuredClone(d); fn(c); return c; });

  const toast = (msg) => {
    setToastMsg(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 2200);
  };

  const client = (id) => db?.clients.find((c) => c.id === id);
  const cname = (id) => client(id)?.name || "(o'chirilgan)";
  const activeClients = () => db?.clients.filter((c) => !c.archived) || [];

  if (!db) return <div className="loader">Yuklanmoqda...</div>;

  return (
    <Ctx.Provider value={{ db, setDb, patch, toast, client, cname, activeClients }}>
      {children}
      <div className={"toast" + (toastMsg ? " show" : "")}>{toastMsg}</div>
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);

export function exportData(db, toast) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: "application/json" }));
  a.download = "logoped_zaxira_" + today() + ".json";
  a.click();
  toast("Zaxira fayli yuklandi ⬇");
}

export function importData(file, setDb, toast) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.clients) throw new Error();
      if (!confirm("Joriy ma'lumotlar zaxiradagi bilan ALMASHTIRILADI. Davom etilsinmi?")) return;
      setDb(d);
      toast("Zaxira tiklandi ✓");
    } catch {
      toast("Fayl noto'g'ri formatda");
    }
  };
  rd.readAsText(file);
}
