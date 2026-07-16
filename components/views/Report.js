"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { M, fmtMoney, today } from "@/lib/helpers";
import { Stat, PageHead } from "../ui";

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

  return (
    <>
      <PageHead
        title="Hisobot"
        sub={`${M[+mm - 1]} ${y} oyi natijalari`}
        action={
          <div className="row no-print">
            <input type="month" value={month} style={{ maxWidth: 170 }} onChange={(e) => setMonth(e.target.value)} />
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
