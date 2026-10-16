// GET /api/config（公开） / PUT /api/config（管理员）
import { readConfig, writeConfig, ensureSeed } from "../_lib/db.js";
import { DEFAULT_CONFIG } from "../_lib/default-config.js";
import { requireAuth } from "../_lib/auth.js";
import { json } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    await ensureSeed(context.env, DEFAULT_CONFIG);
    const config = await readConfig(context.env);
    return json(config || DEFAULT_CONFIG);
  } catch (err) {
    return json({ error: "读取配置失败" }, 500);
  }
}

export async function onRequestPut(context) {
  if (!(await requireAuth(context))) {
    return json({ error: "未授权" }, 401);
  }
  try {
    const body = await context.request.json();
    if (!body || typeof body !== "object" || !body.profile) {
      return json({ error: "配置格式无效" }, 400);
    }
    const config = await writeConfig(context.env, body);
    return json(config);
  } catch (err) {
    return json({ error: "更新配置失败" }, 500);
  }
}
