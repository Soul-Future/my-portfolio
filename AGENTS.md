# AGENTS.md Cursor 开发代理规范

你是资深前端工程师，开发一个全栈的开发者作品集网站（Cloudflare Pages + D1）。

- 参考 UI 风格：`dmego/home.github.io`（玻璃拟态深色 UI）
- 参考内容标准：`emmabostian/developer-portfolios`（作品集规范）

## 项目重要规则

1. 前台页面**禁止使用 React、Vue、Svelte 等前端框架**，全部原生 HTML + CSS + Vanilla JS。
2. 项目分两套端：
   - 前台（访客）：只读，无需登录，不能修改任何数据。
   - 后台（`admin.html`）：管理员登录后可增删改查网站内容。
3. 网站所有展示内容由后端接口 `/api/config` 驱动，不要硬编码个人信息到 HTML。
4. 后端为 Cloudflare Pages Functions（`functions/` 目录），数据库为 D1，管理员账号预置在环境变量。
5. 首页、简历页、联系页之间通过导航一键切换（首页默认展示）。
6. 不生成 WakaTime、周报弹窗、粒子特效代码。

## 代码开发规范

1. 前台 HTML5 + CSS3 + Vanilla JS；尽量少引入第三方库；图标使用 SVG。
2. 安全规范：
   - 所有外部接口文本、配置渲染文本，一律用 `textContent`，禁止 `innerHTML`，防 XSS；
   - 写接口必须鉴权，未授权返回 401；
   - 会话 Cookie 用 HMAC 签名，HttpOnly + SameSite，生产环境 Secure。
3. CSS 规范：CSS 变量统一管理颜色；移动端优先；玻璃拟态 `backdrop-filter: blur`；无横向滚动条；hover 柔和动画。
4. JS 规范：
   - 配置加载在 `assets/js/config.js`，前台逻辑在 `assets/js/main.js`，后台逻辑在 `assets/js/admin.js`；
   - 后端函数在 `functions/api/`，共享工具在 `functions/_lib/`；
   - 代码添加关键注释，拆分清晰。

## 后端与部署

1. 后端接口见 `TECH_DESIGN.md`；本地调试用 `wrangler pages dev`，数据库迁移在 `migrations/`。
2. 允许使用 npm 与 `wrangler`（仅限后端函数与本地调试）；前台仍无需打包，双击 HTML 可看占位内容。
3. 环境变量：`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`AUTH_SECRET`，本地用 `.dev.vars`。

## 页面规范

- 前台：`index.html`、`resume.html`、`contact.html`、`projects.html`、`about.html`、`404.html`
- 后台：`admin.html`

## 测试要求

1. 浏览器打开全部前台页面，无控制台报错。
2. 未登录调用写接口返回 401。
3. 管理员登录后增删改查正常，保存后前台更新。
4. 移动端窗口缩放，布局与汉堡菜单正常。
5. `site-config.json` 与后端接口均异常时，前台加载默认占位内容，不崩溃。

## 输出要求

1. 创建 / 修改文件时输出完整代码并标明路径；不要只输出片段。
2. 优先完成 MVP 核心功能，美化细节放在迭代优化。

## 禁止事项

1. 禁止前台引入前端框架。
2. 禁止增加 WakaTime、周报弹窗、粒子动画。
3. 不要自行新增 PRD 未提到的额外功能。
