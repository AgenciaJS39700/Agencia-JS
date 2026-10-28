// /asistentes/push.js — Avisos push al móvil del negocio (plan Avanzado). Solo servidor; no se publica.
// Web Push estándar (VAPID + cifrado aes128gcm, RFC 8291), sin servicios de pago. Mismo sistema que Infinity Barber.
// Las claves VAPID se crean solas la primera vez y se guardan en la tabla `ajustes` de la D1 (o se fijan con los
// secretos VAPID_PUBLIC + VAPID_PRIVATE_JWK). Solo se envía a servicios de push conocidos (anti-SSRF).

const te = new TextEncoder();
const HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "push.services.mozilla.com", "web.push.apple.com", "push.apple.com", "notify.windows.com", "push.microsoft.com"];
const MAX_POR_NEGOCIO = 10;

export function hostValido(endpoint) {
  let u; try { u = new URL(endpoint); } catch (e) { return false; }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return false;
  return HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
}
const b64u = (buf) => { let s = ""; for (const x of new Uint8Array(buf)) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = (s) => { const t = String(s).replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4)); const o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; };
const concat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

export async function clavesVapid(env) {
  if (env.VAPID_PUBLIC && env.VAPID_PRIVATE_JWK) { try { return { pub: env.VAPID_PUBLIC, jwk: JSON.parse(env.VAPID_PRIVATE_JWK) }; } catch (e) { /* usa las guardadas */ } }
  const leer = async () => { const r = await env.CITAS.prepare("SELECT v FROM ajustes WHERE k = 'vapid'").first(); return r ? JSON.parse(r.v) : null; };
  let v = await leer();
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const rec = { pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)), jwk: await crypto.subtle.exportKey("jwk", kp.privateKey) };
    await env.CITAS.prepare("INSERT OR IGNORE INTO ajustes (k, v) VALUES ('vapid', ?)").bind(JSON.stringify(rec)).run();
    v = (await leer()) || rec; // si dos peticiones compiten, gana la primera guardada
  }
  return v;
}
async function cabeceraVapid(env, endpoint) {
  const v = await clavesVapid(env);
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:" + (env.MAIL_FROM || "info@agencia-js.com") })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(head + "." + claims));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${v.pub}`;
}
async function hkdf(ikm, salt, info, len) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}
async function cifrar(sub, plano) {
  const ua = unb64u(sub.p256dh), auth = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(shared, auth, concat(te.encode("WebPush: info\0"), ua, asPub), 32);
  const cek = await hkdf(ikm, salt, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, te.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(plano, new Uint8Array([2]))));
  return concat(salt, new Uint8Array([0, 0, 0x10, 0, asPub.length]), asPub, ct);
}
async function enviar(env, sub, datos) {
  try {
    if (!hostValido(sub.endpoint)) return false;
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: { Authorization: await cabeceraVapid(env, sub.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
      body: await cifrar(sub, te.encode(JSON.stringify(datos))),
    });
    if (r.status === 404 || r.status === 410) await env.CITAS.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(sub.endpoint).run();
    else if (!r.ok) console.error("push rechazado:", r.status);
    return r.ok;
  } catch (e) { console.error("push", e && e.message); return false; }
}

/** Avisa a todos los móviles del negocio que activaron los avisos. */
export async function avisarMoviles(env, slug, titulo, texto) {
  if (!env.CITAS) return;
  const { results } = await env.CITAS.prepare("SELECT endpoint, p256dh, auth FROM push_subs WHERE slug = ?").bind(slug).all();
  await Promise.allSettled((results || []).map((s) => enviar(env, s, { title: titulo, body: texto, url: `/panel/${slug}`, tag: "cita-" + slug })));
  return (results || []).length;
}
export async function altaMovil(env, slug, sub) {
  const ep = String((sub && sub.endpoint) || ""), k = (sub && sub.keys) || {};
  if (!hostValido(ep) || !/^[A-Za-z0-9_-]{40,200}$/.test(k.p256dh || "") || !/^[A-Za-z0-9_-]{10,60}$/.test(k.auth || "")) return false;
  await env.CITAS.batch([
    env.CITAS.prepare("INSERT INTO push_subs (endpoint, slug, p256dh, auth) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET slug = excluded.slug, p256dh = excluded.p256dh, auth = excluded.auth").bind(ep, slug, k.p256dh, k.auth),
    // límite de móviles por negocio: se quedan los más recientes
    env.CITAS.prepare("DELETE FROM push_subs WHERE slug = ? AND endpoint NOT IN (SELECT endpoint FROM push_subs WHERE slug = ? ORDER BY creada DESC LIMIT ?)").bind(slug, slug, MAX_POR_NEGOCIO),
  ]);
  return true;
}
export async function bajaMovil(env, slug, endpoint) {
  await env.CITAS.prepare("DELETE FROM push_subs WHERE slug = ? AND endpoint = ?").bind(slug, String(endpoint || "")).run();
}
