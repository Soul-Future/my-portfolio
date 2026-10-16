// POST /api/auth/login —— 校验预置管理员账号，签发会话 Cookie
import { createSessionToken, verifyPassword, sessionCookie } from "../../_lib/auth.js";
import { json, isHttps } from "../../_lib/http.js";

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "请求体无效" }, 400);
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const ok = username === env.ADMIN_USERNAME &&
    (await verifyPassword(password, env.ADMIN_PASSWORD || ""));
  if (!ok) {
    return json({ error: "账号或密码错误" }, 401);
  }

  const token = await createSessionToken(env.AUTH_SECRET, username);
  const cookie = sessionCookie(token, TTL_SECONDS) + (isHttps(request) ? "; Secure" : "");
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}
