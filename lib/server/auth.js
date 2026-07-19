// Server tomoni: parol tekshirish (brauzerdagi lib/auth.js bilan bir xil sxema)
// va HMAC bilan imzolangan sessiya-cookie.
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { getSecret } from "./db";

export const COOKIE = "logoped_token";

export const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

// lib/auth.js dagi simpleHash bilan aynan bir xil (eski parollar ham ishlashi uchun)
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

export function checkPass(cred, pass) {
  if (!cred?.salt) return false;
  if (cred.hash) return sha256(cred.salt + pass) === cred.hash;
  return simpleHash(cred.salt + pass) === cred.fhash;
}

export const makeHashes = (salt, pass) => ({
  salt,
  hash: sha256(salt + pass),
  fhash: simpleHash(salt + pass),
});

export const newSalt = () => Math.random().toString(36).slice(2, 12);

/* ---- sessiya tokeni: base64(json) + "." + hmac ---- */
export async function signSession(sess) {
  const secret = await getSecret();
  const body = Buffer.from(JSON.stringify(sess)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + sig;
}

export async function readSession(request) {
  try {
    const token = request.cookies.get(COOKIE)?.value;
    if (!token) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const secret = await getSecret();
    const expect = createHmac("sha256", secret).update(body).digest("base64url");
    const a = Buffer.from(sig), b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const sess = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (sess.exp && sess.exp < Date.now()) return null;
    return sess;
  } catch {
    return null;
  }
}

export function sessionCookie(token, remember) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}), // 30 kun; aks holda brauzer yopilguncha
  };
}
