"use client";

export const ACC_KEY = "logoped_auth";
export const SES_KEY = "logoped_session";

// oddiy xesh — har qanday brauzerda ishlaydi (crypto.subtle faqat https/localhost'da bor)
export function simpleHash(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "f_" + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

export async function sha256(text) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  return null;
}

export const newSalt = () => Math.random().toString(36).slice(2, 12);

export async function makeHashes(salt, pass) {
  return { salt, hash: await sha256(salt + pass), fhash: simpleHash(salt + pass) };
}

export async function checkPass(cred, pass) {
  if (!cred?.salt) return false;
  const strong = await sha256(cred.salt + pass);
  if (strong && cred.hash) return strong === cred.hash;
  return simpleHash(cred.salt + pass) === cred.fhash;
}

export function getAccount() {
  try { return JSON.parse(localStorage.getItem(ACC_KEY)); } catch { return null; }
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SES_KEY) || localStorage.getItem(SES_KEY);
    if (!raw) return null;
    if (raw === "1") return { role: "logoped" }; // eski format bilan moslik
    return JSON.parse(raw);
  } catch { return null; }
}

export function setSession(sess, remember) {
  const s = JSON.stringify(sess);
  if (remember) localStorage.setItem(SES_KEY, s);
  else sessionStorage.setItem(SES_KEY, s);
}

export function clearSession() {
  sessionStorage.removeItem(SES_KEY);
  localStorage.removeItem(SES_KEY);
}
