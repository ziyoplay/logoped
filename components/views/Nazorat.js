"use client";
import { useApp } from "@/lib/store";
import { fmtD, fmtMoney, initials, nazorat } from "@/lib/helpers";
import { TaskRow } from "../task";

function Section({ title, count, children }) {
  return (
    <div className="card">
      <h3>
        {title} <span className={"tag " + (count ? "red" : "green")}>{count}</span>
      </h3>
      {count ? children : <div className="muted">Hammasi joyida ✓</div>}
    </div>
  );
}

export default function Nazorat() {
  const { db, cname, patch, toast } = useApp();
  const nz = nazorat(db);

  const setAppt = (id, st) => {
    patch((d) => { d.appts.find((x) => x.id === id).status = st; });
    toast("Belgilandi ✓");
  };
  const setPaid = (id) => {
    patch((d) => { d.appts.find((x) => x.id === id).paid = true; });
    toast("To'lov qabul qilindi ✓");
  };

  return (
    <>
      <div className="page-title">Avto nazorat</div>
      <div className="page-sub">Tizim avtomatik tekshiradi va e'tibor kerak bo'lgan holatlarni ko'rsatadi</div>

      <Section title="⏰ Belgilanmagan o'tgan qabullar" count={nz.missedAppts.length}>
        {nz.missedAppts.map((a) => (
          <div className="list-item" key={a.id}>
            <div className="li-main">
              <div className="li-title">{cname(a.clientId)}</div>
              <div className="li-sub">{fmtD(a.date)} {a.time} — holati belgilanmagan</div>
            </div>
            <button className="btn sm" onClick={() => setAppt(a.id, "keldi")}>Keldi</button>
            <button className="btn sm bad" onClick={() => setAppt(a.id, "kelmadi")}>Kelmadi</button>
          </div>
        ))}
      </Section>

      <Section title="💰 To'lanmagan qabullar" count={nz.unpaid.length}>
        {nz.unpaid.map((a) => (
          <div className="list-item" key={a.id}>
            <div className="li-main">
              <div className="li-title">{cname(a.clientId)}</div>
              <div className="li-sub">{fmtD(a.date)} — {fmtMoney(a.price)}</div>
            </div>
            <button className="btn sm ghost" onClick={() => setPaid(a.id)}>To'landi ✓</button>
          </div>
        ))}
      </Section>

      <Section title="📝 Muddati o'tgan topshiriqlar" count={nz.overdueTasks.length}>
        {nz.overdueTasks.map((k) => <TaskRow key={k.id} task={k} />)}
      </Section>

      <Section title="😴 14+ kun kelmagan mijozlar" count={nz.inactive.length}>
        {nz.inactive.map((c) => (
          <div className="list-item" key={c.id}>
            <div className="avatar">{initials(c.name)}</div>
            <div className="li-main">
              <div className="li-title">{c.name}</div>
              <div className="li-sub">📞 {c.phone || "—"} — qo'ng'iroq qilib eslatish tavsiya etiladi</div>
            </div>
            {c.phone && <a href={"tel:" + c.phone} className="btn sm ghost">📞 Qo'ng'iroq</a>}
          </div>
        ))}
      </Section>

      <Section title="📦 Tugayotgan tovarlar (≤2 dona)" count={nz.lowStock.length}>
        {nz.lowStock.map((p) => (
          <div className="list-item" key={p.id}>
            <div className="li-main">
              <div className="li-title">{p.name}</div>
              <div className="li-sub">Qoldiq: {p.stock} dona</div>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
