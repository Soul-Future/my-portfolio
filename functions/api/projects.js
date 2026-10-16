// GET /api/projects（公开） / POST /api/projects（管理员）
import { readConfig, writeConfig, ensureSeed } from "../_lib/db.js";
import { DEFAULT_CONFIG } from "../_lib/default-config.js";
import { requireAuth } from "../_lib/auth.js";
import { json } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    await ensureSeed(context.env, DEFAULT_CONFIG);
    const config = await readConfig(context.env);
    const projects = config && Array.isArray(config.projects) ? config.projects : [];
    return json(projects);
  } catch (err) {
    return json({ error: "读取项目失败" }, 500);
  }
}

export async function onRequestPost(context) {
  if (!(await requireAuth(context))) {
    return json({ error: "未授权" }, 401);
  }
  try {
    const body = await context.request.json();
    if (!body || !body.name) {
      return json({ error: "项目名称必填" }, 400);
    }
    const config = (await readConfig(context.env)) || DEFAULT_CONFIG;
    if (!Array.isArray(config.projects)) config.projects = [];

    const project = Object.assign({}, body);
    if (!project.id) project.id = "proj" + Date.now();
    config.projects.push(project);
    await writeConfig(context.env, config);
    return json(project, 201);
  } catch (err) {
    return json({ error: "新增项目失败" }, 500);
  }
}
