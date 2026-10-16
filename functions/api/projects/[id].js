// PUT /api/projects/:id（管理员） / DELETE /api/projects/:id（管理员）
import { readConfig, writeConfig } from "../../_lib/db.js";
import { DEFAULT_CONFIG } from "../../_lib/default-config.js";
import { requireAuth } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestPut(context) {
  if (!(await requireAuth(context))) {
    return json({ error: "未授权" }, 401);
  }
  const id = context.params.id;
  try {
    const body = await context.request.json();
    const config = (await readConfig(context.env)) || DEFAULT_CONFIG;
    if (!Array.isArray(config.projects)) config.projects = [];

    const index = config.projects.findIndex((p) => p.id === id);
    if (index === -1) return json({ error: "项目不存在" }, 404);

    config.projects[index] = Object.assign({}, config.projects[index], body, { id: id });
    await writeConfig(context.env, config);
    return json(config.projects[index]);
  } catch (err) {
    return json({ error: "更新项目失败" }, 500);
  }
}

export async function onRequestDelete(context) {
  if (!(await requireAuth(context))) {
    return json({ error: "未授权" }, 401);
  }
  const id = context.params.id;
  try {
    const config = (await readConfig(context.env)) || DEFAULT_CONFIG;
    if (!Array.isArray(config.projects)) config.projects = [];

    const index = config.projects.findIndex((p) => p.id === id);
    if (index === -1) return json({ error: "项目不存在" }, 404);

    config.projects.splice(index, 1);
    await writeConfig(context.env, config);
    return json({ ok: true });
  } catch (err) {
    return json({ error: "删除项目失败" }, 500);
  }
}
