// GET /api/auth/me —— 查询当前会话是否有效
import { requireAuth } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet(context) {
  const authenticated = await requireAuth(context);
  return json({ authenticated });
}
