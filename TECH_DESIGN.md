# TECH_DESIGN.md 技术设计文档

## 1. 技术栈选型

> 目标：前台纯静态原生实现，后端用 Serverless 函数 + 云数据库，轻量、免本地数据库、一键部署。

- 前台页面：原生 HTML5 + CSS3 + Vanilla JS，**禁止 React / Vue / Svelte**
- 样式：CSS 变量，玻璃拟态、响应式布局
- 后端：Cloudflare Pages Functions（Workers 运行时）
- 数据库：Cloudflare D1（SQLite）
- 鉴权：HMAC-SHA256 签名会话 Cookie（Web Crypto），管理员账号预置在环境变量
- 图标：开源 SVG 图标，不引入大图标库

## 2. 项目目录结构

```
my-portfolio/
├─ index.html                # 首页（Hero）
├─ resume.html               # 简历页面
├─ contact.html              # 联系页面
├─ projects.html             # 项目作品集页
├─ about.html                # 关于我页面
├─ 404.html                  # 404 页面
├─ admin.html                # 后台管理面板
├─ site-config.json          # 本地降级种子数据（部署后以后端 /api/config 为准）
├─ assets/
│   ├─ css/main.css          # 全局样式
│   ├─ js/
│   │   ├─ config.js         # 读取 /api/config（回退 site-config.json → 默认配置）
│   │   ├─ main.js           # 前台公共逻辑：壁纸、一言、导航、渲染
│   │   └─ admin.js          # 后台：登录 + 增删改查
│   ├─ mock/images.js        # 模拟必应壁纸数据
│   └─ images/               # 静态图片资源
├─ functions/                # Cloudflare Pages Functions（Serverless 后端）
│   ├─ _lib/
│   │   ├─ http.js           # json / parseCookies 等工具
│   │   ├─ auth.js           # 会话签名、验签、鉴权
│   │   ├─ db.js             # D1 读写 site_config
│   │   └─ default-config.js # 默认配置
│   └─ api/
│       ├─ config.js         # GET /api/config, PUT /api/config
│       ├─ projects.js       # GET /api/projects, POST /api/projects
│       ├─ projects/[id].js  # PUT/DELETE /api/projects/:id
│       └─ auth/
│           ├─ login.js      # POST /api/auth/login
│           ├─ logout.js     # POST /api/auth/logout
│           └─ me.js         # GET /api/auth/me
├─ migrations/
│   └─ 0001_init.sql         # 建表 + 种子数据
├─ package.json              # wrangler 本地调试依赖
├─ wrangler.toml             # D1 绑定等配置
├─ .dev.vars.example         # 本地环境变量示例
└─ README.md                 # 本地开发 + 部署说明
```

## 3. 数据模型

### 3.1 D1 表结构

```sql
CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,          -- 完整配置 JSON 字符串
  updated_at TEXT NOT NULL
);
```

### 3.2 配置 JSON 结构（与前台渲染一致）

```json
{
  "profile": { "name": "", "title": "", "avatarUrl": "", "avatarBackText": "", "bio": "" },
  "contact": { "emailBase64": "", "githubUrl": "", "blogUrl": "", "links": [] },
  "projects": [ { "id": "", "name": "", "description": "", "tags": [], "imageUrl": "", "demoUrl": "", "githubUrl": "" } ],
  "resume": { "summary": "", "education": [], "experience": [], "skills": [] },
  "about": { "intro": "", "skills": [], "interests": [] }
}
```

## 4. 鉴权方案

- 环境变量：`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`AUTH_SECRET`（长随机串）。
- 登录成功后签发 `admin_session` Cookie：`base64url(payload).base64url(HMAC-SHA256(payload))`，payload 含用户名与过期时间。
- Cookie 属性：`HttpOnly; SameSite=Lax; Path=/`，生产环境（https）加 `Secure`。
- 写接口用 `requireAuth()` 验签，失败返回 401。

## 5. 核心流程

1. 前台 JS 请求 `GET /api/config` 获取配置并渲染页面；失败回退 `site-config.json` → 内置默认配置。
2. 管理员在 `/admin.html` 登录 → 后端签发会话 → 加载配置生成表单 → 修改 → 保存时 `PUT /api/config`（项目通过 `/api/projects` 接口增删改）。
3. 保存成功后数据写入 D1，前台刷新即显示最新内容。

## 6. 安全说明

- 前台所有渲染文本用 `textContent`，禁止 `innerHTML`，防 XSS。
- 写接口全部鉴权；会话 Cookie HttpOnly，脚本无法读取。
- 管理员密码存环境变量，不写入数据库；HTTPS 部署下 Cookie 加 `Secure`。
