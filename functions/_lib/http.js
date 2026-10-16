// ============================================================
// http.js —— 通用 HTTP 工具
// ============================================================

/** 返回 JSON 响应 */
export function json(data, status = 200, extraHeaders = {}) {
  const headers = Object.assign(
    { "Content-Type": "application/json; charset=utf-8" },
    extraHeaders
  );
  return new Response(JSON.stringify(data), { status, headers });
}

/** 解析 Cookie 请求头，返回 { name: value } */
export function parseCookies(header) {
  const result = {};
  if (!header) return result;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) result[name] = value;
  });
  return result;
}

/** 判断当前请求是否走 HTTPS（用于决定 Cookie 是否加 Secure） */
export function isHttps(request) {
  try {
    return new URL(request.url).protocol === "https:";
  } catch (e) {
    return false;
  }
}
