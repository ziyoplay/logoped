"use client";
import { useRef } from "react";
import { initials } from "@/lib/helpers";

// mijoz avatari: rasm bo'lsa rasm, bo'lmasa ismning bosh harflari
export function Avatar({ c, big }) {
  return (
    <div className={"avatar" + (big ? " big" : "")}>
      {c?.photo ? <img src={c.photo} alt={c.name || "avatar"} /> : initials(c?.name || "?")}
    </div>
  );
}

export function Modal({ onClose, children }) {
  // bosish modal ichida boshlanib tashqarida qo'yib yuborilsa, modal yopilmasligi kerak
  const downOnBg = useRef(false);
  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => { downOnBg.current = e.target === e.currentTarget; }}
      onClick={(e) => downOnBg.current && e.target === e.currentTarget && onClose()}
    >
      <div className="modal">{children}</div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Stat({ n, l, cls = "", small }) {
  return (
    <div className={"stat " + cls}>
      <div className="n" style={small ? { fontSize: 19 } : undefined}>{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

export function Empty({ icon, children }) {
  return (
    <div className="empty">
      {icon && <span className="big">{icon}</span>}
      {children}
    </div>
  );
}

export function PageHead({ title, sub, action }) {
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      {action}
    </div>
  );
}
