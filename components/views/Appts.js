"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { fmtD, today } from "@/lib/helpers";
import { ApptRow, ApptForm } from "../appt";
import { Empty, PageHead } from "../ui";

export default function Appts() {
  const { db, toast, activeClients } = useApp();
  const [date, setDate] = useState(today());
  const [modal, setModal] = useState(null);

  const list = db.appts.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time));

  const shift = (n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };

  const openForm = (appt) => {
    if (!activeClients().length) return toast("Avval mijoz qo'shing");
    setModal({ appt });
  };

  return (
    <>
      <PageHead
        title="Qabul qilish"
        sub="Qabullarni rejalashtirish va belgilash"
        action={<button className="btn" onClick={() => openForm(null)}>＋ Qabul qo'shish</button>}
      />
      <div className="card">
        <div className="row">
          <button className="btn sm ghost" onClick={() => shift(-1)}>←</button>
          <input type="date" style={{ maxWidth: 170 }} value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn sm ghost" onClick={() => shift(1)}>→</button>
          <button className="btn sm ghost" onClick={() => setDate(today())}>Bugun</button>
          <div className="spacer" />
          <span className="muted">{fmtD(date)} — {list.length} ta qabul</span>
        </div>
        <div className="mt">
          {list.length
            ? list.map((a) => <ApptRow key={a.id} appt={a} onEdit={openForm} />)
            : <Empty icon="🗓️">Bu kunga qabul yo'q.</Empty>}
        </div>
      </div>
      {modal && <ApptForm initial={modal.appt} defaultDate={date} onClose={() => setModal(null)} />}
    </>
  );
}
