// ============================================================
// db.js —— D1 读写 site_config
// ============================================================

/** 读取完整配置对象，不存在返回 null */
export async function readConfig(env) {
  const row = await env.DB.prepare(
    "SELECT data FROM site_config WHERE id = 1"
  ).first();
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch (e) {
    return null;
  }
}

/** 写入完整配置对象，返回写入后的配置 */
export async function writeConfig(env, config) {
  const json = JSON.stringify(config);
  await env.DB.prepare(
    "UPDATE site_config SET data = ?, updated_at = datetime('now') WHERE id = 1"
  ).bind(json).run();
  return config;
}

/** 若表为空则写入默认种子数据 */
export async function ensureSeed(env, defaultConfig) {
  const row = await env.DB.prepare("SELECT id FROM site_config WHERE id = 1").first();
  if (!row) {
    await env.DB.prepare(
      "INSERT INTO site_config (id, data, updated_at) VALUES (1, ?, datetime('now'))"
    ).bind(JSON.stringify(defaultConfig)).run();
  }
}
