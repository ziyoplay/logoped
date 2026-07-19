"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { useApp } from "@/lib/store";
import { M, fmtMoney, today } from "@/lib/helpers";
import { Stat, PageHead } from "../ui";

const ST_LABEL = { rejalashtirilgan: "Kutilmoqda", keldi: "Keldi", kelmadi: "Kelmadi", bekor: "Bekor" };

export default function Report() {
  const { db, cname } = useApp();
  const [month, setMonth] = useState(today().slice(0, 7));

  const appts = db.appts.filter((a) => a.date.startsWith(month));
  const came = appts.filter((a) => a.status === "keldi");
  const apptIncome = came.filter((a) => a.paid).reduce((s, a) => s + (+a.price || 0), 0);
  const debt = came.filter((a) => !a.paid).reduce((s, a) => s + (+a.price || 0), 0);
  const sales = db.sales.filter((s) => s.date.startsWith(month));
  const salesIncome = sales.reduce((s, x) => s + x.total, 0);
  const newClients = db.clients.filter((c) => (c.created || "").startsWith(month)).length;
  const tasksGiven = db.tasks.filter((k) => (k.given || "").startsWith(month));
  const tasksDone = tasksGiven.filter((k) => k.status === "bajarildi").length;

  const perClient = {};
  came.forEach((a) => {
    perClient[a.clientId] = perClient[a.clientId] || { n: 0, sum: 0 };
    perClient[a.clientId].n++;
    perClient[a.clientId].sum += a.paid ? +a.price || 0 : 0;
  });

  const [y, mm] = month.split("-");

  // hisobotni Excel (.xlsx) faylga yuklab olish: 3 varaq
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const umumiy = [
      ["Hisobot", `${M[+mm - 1]} ${y}`],
      [],
      ["Ko'rsatkich", "Qiymat"],
      ["Jami tushum (so'm)", apptIncome + salesIncome],
      ["Qabullardan tushum (so'm)", apptIncome],
      ["Tovarlardan tushum (so'm)", salesIncome],
      ["Qarzdorlik (so'm)", debt],
      ["Jami qabullar", appts.length],
      ["Bo'lib o'tgan qabullar", came.length],
      ["Kelmaganlar", appts.filter((a) => a.status === "kelmadi").length],
      ["Yangi mijozlar", newClients],
      ["Berilgan topshiriqlar", tasksGiven.length],
      ["Bajarilgan topshiriqlar", tasksDone],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(umumiy);
    ws1["!cols"] = [{ wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Umumiy");

    const mijozlar = [
      ["Mijoz", "Qabullar soni", "To'lagan (so'm)"],
      ...Object.entries(perClient)
        .sort((a, b) => b[1].sum - a[1].sum)
        .map(([cid, v]) => [cname(cid), v.n, v.sum]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(mijozlar);
    ws2["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Mijozlar");

    const qabullar = [
      ["Sana", "Vaqt", "Mijoz", "Xizmat", "Narx (so'm)", "Holat", "To'lov"],
      ...appts
        .slice()
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .map((a) => [
          a.date, a.time?.slice(0, 5) || "", cname(a.clientId),
          a.service || "Mashg'ulot", +a.price || 0,
          ST_LABEL[a.status] || a.status,
          a.status === "keldi" ? (a.paid ? "To'langan" : "Qarz") : "",
        ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(qabullar);
    ws3["!cols"] = [{ wch: 11 }, { wch: 7 }, { wch: 28 }, { wch: 24 }, { wch: 12 }, { wch: 11 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Qabullar");

    XLSX.writeFile(wb, `hisobot_${month}.xlsx`);
  };

  return (
    <>
      <PageHead
        title="Hisobot"
        sub={`${M[+mm - 1]} ${y} oyi natijalari`}
        action={
          <div className="row no-print">
            <input type="month" value={month} style={{ maxWidth: 170 }} onChange={(e) => setMonth(e.target.value)} />
            <button className="btn" onClick={exportExcel}>📊 Excel</button>
            <button className="btn ghost" onClick={() => window.print()}>🖨 Chop etish</button>
          </div>
        }
      />
      <div className="grid4">
        <Stat n={fmtMoney(apptIncome + salesIncome)} l="Jami tushum" small />
        <Stat n={fmtMoney(apptIncome)} l={`Qabullardan (${came.length} ta)`} small />
        <Stat n={fmtMoney(salesIncome)} l={`Tovarlardan (${sales.length} ta sotuv)`} small />
        <Stat n={fmtMoney(debt)} l="Qarzdorlik" cls={debt ? "warn" : ""} small />
      </div>
      <div className="grid4 mt">
        <Stat n={appts.length} l="Jami qabullar" />
        <Stat n={appts.filter((a) => a.status === "kelmadi").length} l="Kelmaganlar" />
        <Stat n={newClients} l="Yangi mijozlar" />
        <Stat n={`${tasksDone}/${tasksGiven.length}`} l="Bajarilgan topshiriqlar" />
      </div>
      <div className="card mt">
        <h3>👥 Mijozlar bo'yicha</h3>
        <div className="t-wrap">
          <table>
            <thead>
              <tr><th>Mijoz</th><th>Qabullar</th><th>To'lagan</th></tr>
            </thead>
            <tbody>
              {Object.keys(perClient).length ? (
                Object.entries(perClient)
                  .sort((a, b) => b[1].sum - a[1].sum)
                  .map(([cid, v]) => (
                    <tr key={cid}>
                      <td>{cname(cid)}</td>
                      <td>{v.n} ta</td>
                      <td className="money">{fmtMoney(v.sum)}</td>
                    </tr>
                  ))
              ) : (
                <tr><td colSpan={3} className="muted">Bu oyda qabullar bo'lmagan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
