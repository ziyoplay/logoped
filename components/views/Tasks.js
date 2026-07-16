"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { TaskRow, TaskForm } from "../task";
import { Empty, PageHead } from "../ui";

export default function Tasks() {
  const { db, toast, activeClients } = useApp();
  const [open, setOpen] = useState(false);

  const list = [...db.tasks].sort((a, b) => (b.given || "").localeCompare(a.given || ""));
  const active = list.filter((k) => k.status === "berildi");

  const openForm = () => {
    if (!activeClients().length) return toast("Avval mijoz qo'shing");
    setOpen(true);
  };

  return (
    <>
      <PageHead
        title="Mijozga topshiriqlar"
        sub={`Uyga vazifalar: ${active.length} ta bajarilmoqda`}
        action={<button className="btn" onClick={openForm}>＋ Topshiriq berish</button>}
      />
      <div className="card">
        {list.length
          ? list.map((k) => <TaskRow key={k.id} task={k} />)
          : <Empty icon="📝">Topshiriqlar yo'q. Mijozga uyga vazifa bering.</Empty>}
      </div>
      {open && <TaskForm onClose={() => setOpen(false)} />}
    </>
  );
}
