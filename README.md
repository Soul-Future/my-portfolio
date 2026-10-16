# 开发者个人作品集网站（全栈）

深色玻璃拟态的个人作品集网站，含「用户访问端（前台，只读）」与「管理员端（后台，登录后可增删改查）」。

- 前台：原生 HTML / CSS / Vanilla JS
- 后端：Cloudflare Pages Functions
- 数据库：Cloudflare D1（SQLite）

## 本地开发

前置：安装 Node.js 18+。

```bash
# 1. 安装依赖
npm install

# 2. 准备本地环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置管理员账号密码与 AUTH_SECRET

# 3. 初始化本地 D1 数据库（首次）
npm run d1:migrate:local

# 4. 启动本地开发服务器
npm run dev
# 访问 http://localhost:8788（wrangler 会提示实际端口）
```

前台首页：`http://localhost:8788/`；后台：`http://localhost:8788/admin.html`。

> 说明：纯静态预览（双击 `index.html`）仍可打开前台占位内容（走本地 `site-config.json` 降级分支），但后台与登录依赖后端，需用 `wrangler pages dev` 才能跑通。

## 部署到 Cloudflare Pages

1. 在 Cloudflare 后台创建 D1 数据库：
   ```bash
   npx wrangler d1 create my-portfolio-db
   ```
   将输出的 `database_id` 填入 `wrangler.toml`。

2. 把项目推送到 GitHub 仓库。

3. 在 Cloudflare Pages 新建项目并关联该仓库：
   - 构建命令：留空
   - 构建输出目录：`.`
   - 函数目录：`functions`（通常自动识别）

4. 执行远程迁移（初始化线上数据库）：
   ```bash
   npx wrangler d1 execute DB --remote --file=migrations/0001_init.sql
   ```

5. 在 Pages 项目的「Settings → Environment variables」添加：
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`

6. 在 Pages 项目的「Settings → Bindings」添加 D1 绑定，变量名 `DB`，指向第 1 步创建的数据库。

7. 在「Custom domains」绑定自定义域名。

## 接口说明

见 `TECH_DESIGN.md` 与 `PRD.md`。
