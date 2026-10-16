// POST /api/auth/logout —— 清除会话 Cookie
import { clearSessionCookie } from "../../_lib/auth.js";
import { json, isHttps } from "../../_lib/http.js";

export async function onRequestPost(context) {
  const cookie = clearSessionCookie() + (isHttps(context.request) ? "; Secure" : "");
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}
