"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { WD, fmtD, fmtMoney, nazorat, today } from "@/lib/helpers";
import { ApptRow, ApptForm } from "../appt";
import { TaskRow } from "../task";
import { Stat, Empty, PageHead } from "../ui";

export default function Home({ go }) {
  const { db, toast, activeClients } = useApp();
  const [modal, setModal] = useState(null); // null | {appt}
  const t = today();
  const d = new Date();

  const todays = db.appts.filter((a) => a.date === t).sort((a, b) => a.time.localeCompare(b.time));
  const dueTasks = db.tasks.filter((k) => k.status === "berildi" && k.due === t);
  const nz = nazorat(db);
  const income =
    db.appts.filter((a) => a.date === t && a.paid).reduce((s, a) => s + (+a.price || 0), 0) +
    db.sales.filter((s) => s.date === t).reduce((s, x) => s + x.total, 0);

  const openForm = (appt) => {
    if (!activeClients().length) return toast("Avval mijoz qo'shing");
    setModal({ appt });
  };

  return (
    <>
      <PageHead
        title="Bugungi reja"
        sub={`${WD[d.getDay()]}, ${fmtD(t)} — reja avtomatik tuzildi`}
        action={<button className="btn no-print" onClick={() => openForm(null)}>＋ Qabul qo'shish</button>}
      />
      <div className="grid4">
        <Stat n={todays.length} l="Bugungi qabullar" />
        <Stat n={todays.filter((a) => a.status === "keldi").length} l="Qabul qilindi" />
        <Stat n={nz.total} l="Nazorat ogohlantirishi" cls={nz.total ? "bad" : ""} />
        <Stat n={fmtMoney(income)} l="Bugungi tushum" small />
      </div>

      <div className="card mt">
        <h3>🗓️ Bugungi qabullar</h3>
        {todays.length
          ? todays.map((a) => <ApptRow key={a.id} appt={a} onEdit={openForm} />)
          : <Empty icon="🌿">Bugunga qabul yo'q. «Qabul qo'shish» tugmasini bosing.</Empty>}
      </div>

      <div className="card">
        <h3>📝 Bugun tekshiriladigan topshiriqlar</h3>
        {dueTasks.length
          ? dueTasks.map((k) => <TaskRow key={k.id} task={k} />)
          : <Empty>Bugunga muddatli topshiriq yo'q.</Empty>}
      </div>

      {nz.total > 0 && (
        <div className="card">
          <h3>🔔 Avto nazorat</h3>
          <div className="muted">
            E'tibor talab qiladigan {nz.total} ta holat bor.{" "}
            <button className="btn sm warn" onClick={() => go("nazorat")}>Ko'rish</button>
          </div>
        </div>
      )}

      {modal && <ApptForm initial={modal.appt} onClose={() => setModal(null)} />}
    </>
  );
}
