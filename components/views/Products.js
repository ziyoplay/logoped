"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { fmtD, fmtMoney, today, uid } from "@/lib/helpers";
import { Modal, Field, Empty, PageHead } from "../ui";

export default function Products() {
  const { db, patch, cname } = useApp();
  const [modal, setModal] = useState(null); // {type:'form',product} | {type:'sell',product}

  const del = (id) => {
    if (!confirm("Tovar o'chirilsinmi?")) return;
    patch((d) => { d.products = d.products.filter((p) => p.id !== id); });
  };

  return (
    <>
      <PageHead
        title="Tovarlar"
        sub="Sotuvdagi mahsulotlar: kartochkalar, kitoblar, o'yinchoqlar..."
        action={<button className="btn" onClick={() => setModal({ type: "form", product: null })}>＋ Tovar qo'shish</button>}
      />
      <div className="card">
        <div className="t-wrap">
          <table>
            <thead>
              <tr><th>Nomi</th><th>Narxi</th><th>Qoldiq</th><th>Sotilgan</th><th></th></tr>
            </thead>
            <tbody>
              {db.products.length ? (
                db.products.map((p) => {
                  const sold = db.sales.filter((s) => s.productId === p.id).reduce((s, x) => s + x.qty, 0);
                  return (
                    <tr key={p.id}>
                      <td><b>{p.name}</b></td>
                      <td>{fmtMoney(p.price)}</td>
                      <td>{p.stock <= 2 ? <span className="tag red">{p.stock} dona</span> : p.stock + " dona"}</td>
                      <td>{sold} dona</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn sm" onClick={() => setModal({ type: "sell", product: p })} disabled={!p.stock}>Sotish</button>{" "}
                        <button className="btn sm ghost" onClick={() => setModal({ type: "form", product: p })}>✎</button>{" "}
                        <button className="btn sm bad" onClick={() => del(p.id)}>🗑</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={5}><Empty icon="🛍️">Tovarlar yo'q.</Empty></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>🧾 Oxirgi sotuvlar</h3>
        {db.sales.length ? (
          [...db.sales].reverse().slice(0, 15).map((s) => {
            const p = db.products.find((x) => x.id === s.productId);
            return (
              <div className="list-item" key={s.id}>
                <div className="li-main">
                  <div className="li-title">{p ? p.name : "(o'chirilgan)"} × {s.qty}</div>
                  <div className="li-sub">{fmtD(s.date)}{s.clientId ? " · " + cname(s.clientId) : ""}</div>
                </div>
                <span className="money">{fmtMoney(s.total)}</span>
              </div>
            );
          })
        ) : (
          <div className="muted">Sotuvlar hali yo'q</div>
        )}
      </div>

      {modal?.type === "form" && <ProductForm product={modal.product} onClose={() => setModal(null)} />}
      {modal?.type === "sell" && <SellForm product={modal.product} onClose={() => setModal(null)} />}
    </>
  );
}

function ProductForm({ product, onClose }) {
  const { patch, toast } = useApp();
  const p = product || {};
  const [f, setF] = useState({ name: p.name || "", price: p.price || "", stock: p.stock ?? 10 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveProd = () => {
    if (!f.name.trim() || !+f.price) return toast("Nomi va narxini kiriting");
    const data = { name: f.name.trim(), price: +f.price, stock: +f.stock || 0 };
    patch((d) => {
      if (p.id) Object.assign(d.products.find((x) => x.id === p.id), data);
      else d.products.push({ id: uid(), ...data });
    });
    toast("Saqlandi ✓");
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>{p.id ? "Tovarni tahrirlash" : "Yangi tovar"}</h3>
      <Field label="Nomi *"><input value={f.name} onChange={set("name")} /></Field>
      <div className="grid2">
        <Field label="Narxi (so'm) *"><input type="number" value={f.price} onChange={set("price")} /></Field>
        <Field label="Miqdori (dona)"><input type="number" value={f.stock} onChange={set("stock")} /></Field>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={saveProd}>Saqlash</button>
      </div>
    </Modal>
  );
}

function SellForm({ product: p, onClose }) {
  const { patch, toast, activeClients } = useApp();
  const [qty, setQty] = useState(1);
  const [clientId, setClientId] = useState("");

  const doSell = () => {
    const q = Math.min(Math.max(1, +qty || 1), p.stock);
    patch((d) => {
      d.products.find((x) => x.id === p.id).stock -= q;
      d.sales.push({ id: uid(), productId: p.id, clientId, qty: q, total: q * p.price, date: today() });
    });
    toast("Sotildi: " + fmtMoney(q * p.price));
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h3>Sotish: {p.name}</h3>
      <div className="muted">Narxi: {fmtMoney(p.price)} · qoldiq: {p.stock} dona</div>
      <Field label="Miqdor">
        <input type="number" min={1} max={p.stock} value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      <Field label="Mijoz (ixtiyoriy)">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">—</option>
          {activeClients().map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Bekor</button>
        <button className="btn" onClick={doSell}>Sotish ✓</button>
      </div>
    </Modal>
  );
}
