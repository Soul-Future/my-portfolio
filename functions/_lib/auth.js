// ============================================================
// auth.js —— 会话签名、验签与鉴权（Web Crypto，HMAC-SHA256）
// ============================================================

import { parseCookies } from "./http.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

function base64urlEncode(bytes) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(sig);
}

/** 生成签名会话 token：base64url(payload).base64url(签名) */
export async function createSessionToken(secret, username) {
  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(secret, payloadB64);
  return payloadB64 + "." + base64urlEncode(sig);
}

/** 校验会话 token，有效返回 payload，否则返回 null */
export async function verifySessionToken(secret, token) {
  if (!secret || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const payloadB64 = parts[0];
  const sigB64 = parts[1];

  const expected = await hmacSign(secret, payloadB64);
  const provided = base64urlDecode(sigB64);

  // 常量时间比较签名
  if (expected.length !== provided.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ provided[i];
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(decoder.decode(base64urlDecode(payloadB64)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/** 常量时间密码比较 */
export async function verifyPassword(input, expected) {
  const a = encoder.encode(input || "");
  const b = encoder.encode(expected || "");
  const len = Math.max(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < len; i++) {
    const x = i < a.length ? a[i] : 0;
    const y = i < b.length ? b[i] : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}

/** 校验当前请求是否已登录（管理员） */
export async function requireAuth(context) {
  const secret = context.env && context.env.AUTH_SECRET;
  if (!secret) return false;
  const cookie = parseCookies(context.request.headers.get("Cookie") || "");
  const token = cookie[SESSION_COOKIE];
  if (!token) return false;
  const payload = await verifySessionToken(secret, token);
  return payload ? true : false;
}

/** 构造会话 Cookie 字符串（供登录/退出使用） */
export function sessionCookie(token, maxAgeSeconds) {
  return SESSION_COOKIE + "=" + token +
    "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + maxAgeSeconds;
}

export function clearSessionCookie() {
  return SESSION_COOKIE + "=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}
