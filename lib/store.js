"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { freshDb, today } from "./helpers";
import { useAuth } from "@/components/AuthGate";
import { setFlushHandler } from "./pending-save";

const Ctx = createContext(null);
const KEY = "logoped_db";

export function AppProvider({ children }) {
  const { session, serverMode } = useAuth();
  const [db, setDb] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const timer = useRef(null);
  const saveTimer = useRef(null);
  const loaded = useRef(false);
  const dirty = useRef(false);

  const toast = (msg) => {
    setToastMsg(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 2200);
  };

  /* ---- yuklash ---- */
  useEffect(() => {
    let local = null;
    try { local = JSON.parse(localStorage.getItem(KEY)); } catch {}

    if (!serverMode) {
      setDb(local && local.clients ? local : freshDb());
      loaded.current = true;
      return;
    }

    (async () => {
      try {
        const r = await fetch("/api/data");
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        if (j.data) {
          setDb(j.data);
        } else if (session?.role === "logoped" && local?.clients?.length) {
          // serverda hali ma'lumot yo'q, brauzerda eski ma'lumot bor — ko'chiramiz
          const ok = await pushData(local);
          setDb(local);
          toast(ok ? "Avvalgi ma'lumotlar serverga ko'chirildi ✓" : "Diqqat: serverga saqlanmadi");
        } else {
          setDb(freshDb());
        }
      } catch {
        toast("Server bilan aloqa yo'q");
        setDb(local && local.clients ? local : freshDb());
      }
      loaded.current = true;
    })();
  }, [serverMode]);

  /* ---- saqlash ---- */
  const pushData = async (data) => {
    try {
      const r = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return r.ok;
    } catch {
      return false;
    }
  };

  const dbRef = useRef(null);
  dbRef.current = db;

  const firstSave = useRef(true);
  useEffect(() => {
    if (!db || !loaded.current) return;
    if (!serverMode) {
      localStorage.setItem(KEY, JSON.stringify(db));
      return;
    }
    if (session?.role !== "logoped") return;
    if (firstSave.current) { firstSave.current = false; return; } // yuklashning o'zi saqlashni talab qilmaydi
    dirty.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await pushData(dbRef.current);
      if (ok) dirty.current = false;
      else toast("Diqqat: serverga saqlanmadi, internetni tekshiring");
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [db, serverMode, session]);

  // Chiqishdan oldin kechikkan yozuvni darhol jo'natamiz.
  // Cookie hali o'chirilmagan paytda chaqirilishi shart, aks holda server 403 beradi.
  const canSave = useRef(false);
  canSave.current = serverMode && session?.role === "logoped";

  useEffect(() => {
    setFlushHandler(async () => {
      if (!dirty.current || !dbRef.current || !canSave.current) return;
      clearTimeout(saveTimer.current);
      const ok = await pushData(dbRef.current);
      dirty.current = !ok;
      if (!ok) toast("Diqqat: oxirgi o'zgarishlar serverga saqlanmadi");
    });
    return () => setFlushHandler(null);
  }, []);

  // sahifa yopilayotganda saqlanmagan o'zgarishlarni jo'natib qolamiz
  useEffect(() => {
    if (!serverMode || session?.role !== "logoped") return;
    const flush = () => {
      if (!dirty.current || !dbRef.current) return;
      navigator.sendBeacon?.(
        "/api/data",
        new Blob([JSON.stringify({ data: dbRef.current })], { type: "application/json" })
      );
      dirty.current = false;
    };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [serverMode, session]);

  // patch(fn): fn nusxa ustida o'zgartirish kiritadi, so'ng saqlanadi
  const patch = (fn) => setDb((d) => { const c = structuredClone(d); fn(c); return c; });

  // mijoz o'z topshirig'ini bajardi deb belgilaydi; video ixtiyoriy
  const taskDone = async (id, video) => {
    patch((d) => { const t = d.tasks.find((x) => x.id === id); if (t) t.status = "bajarildi"; });
    if (!serverMode || session?.role !== "client") return true;
    try {
      // video FormData bilan ketadi — base64 qilsak hajmi uchdan birga oshib ketardi
      const r = video
        ? await fetch("/api/client/task-done", {
            method: "POST",
            body: (() => {
              const fd = new FormData();
              fd.append("taskId", id);
              fd.append("video", video);
              return fd;
            })(),
          })
        : await fetch("/api/client/task-done", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: id }),
          });

      if (!r.ok) {
        toast(r.status === 413 ? "Video juda katta — qisqaroq oling" : "Serverga yetkazilmadi, qayta urinib ko'ring");
        return false;
      }
      const j = await r.json().catch(() => ({}));
      if (j.videoId) patch((d) => { const t = d.tasks.find((x) => x.id === id); if (t) t.videoId = j.videoId; });
      return true;
    } catch {
      toast("Server bilan aloqa yo'q");
      return false;
    }
  };

  const client = (id) => db?.clients.find((c) => c.id === id);
  const cname = (id) => client(id)?.name || "(o'chirilgan)";
  const activeClients = () => db?.clients.filter((c) => !c.archived) || [];

  if (!db) return <div className="loader">Yuklanmoqda...</div>;

  return (
    <Ctx.Provider value={{ db, setDb, patch, taskDone, toast, client, cname, activeClients }}>
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
