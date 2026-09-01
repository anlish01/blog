<p align="center">
  <img src="screenshots/home.png" alt="Qingyu'Blog" width="100%" />
</p>

<h1 align="center">Qingyu'Blog</h1>

<p align="center">
  <b>零框架 · 零构建 · 零依赖 —— 双击 index.html 就能用的个人博客</b>
</p>

<p align="center">
  <a href="https://kejiland.azhz.workers.dev">
    <img src="https://img.shields.io/badge/在线预览-kejiland.azhz.workers.dev-blue?style=flat-square" alt="Demo" />
  </a>
  <img src="https://img.shields.io/badge/许可证-MIT-green?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/技术栈-原生JS-orange?style=flat-square" alt="Vanilla JS" />
  <img src="https://img.shields.io/badge/部署-Cloudflare_Workers-purple?style=flat-square" alt="Cloudflare Workers" />
</p>

<p align="center">
  <a href="https://github.com/kejiland/blog/stargazers">
    <img src="https://img.shields.io/github/stars/kejiland/blog?style=social&logo=github" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/kejiland/blog/network/members">
    <img src="https://img.shields.io/github/forks/kejiland/blog?style=social&logo=github" alt="GitHub Forks" />
  </a>
  <a href="https://github.com/kejiland/blog/issues">
    <img src="https://img.shields.io/github/issues/kejiland/blog?style=social&logo=github" alt="GitHub Issues" />
  </a>
  <a href="https://github.com/kejiland/blog/pulls">
    <img src="https://img.shields.io/github/issues-pr/kejiland/blog?style=social&logo=github" alt="GitHub Pull Requests" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/kejiland/blog?style=flat-square&logo=github" alt="Last Commit" />
  <img src="https://img.shields.io/github/commit-activity/w/kejiland/blog?style=flat-square" alt="Commit Activity" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square&logo=git&logoColor=white" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/Issues-Welcome-brightgreen?style=flat-square&logo=github&logoColor=white" alt="Issues Welcome" />
  <a href="https://github.com/kejiland/blog/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/kejiland/blog?style=flat-square" alt="License" />
  </a>
</p>

---

## 📑 目录

- [📖 项目介绍](#-项目介绍)
- [✅ 优点](#-优点)
- [✨ 特色功能](#-特色功能)
- [🚀 部署方式](#-部署方式)
- [☁️ Cloudflare 服务说明](#️-cloudflare-服务说明)
- [⚙️ 配置文件说明](#️-配置文件说明)
- [🛡️ 安全设计](#️-安全设计)
- [🧪 测试](#-测试)
- [🖼️ 项目截图](#️-项目截图)
- [📄 许可证](#-许可证)

## 📖 项目介绍

Qingyu'Blog（轻语博客）是一个**纯原生 JavaScript** 编写的个人博客系统，不依赖任何前端框架（React / Vue / Svelte）和构建工具（Webpack / Vite）。

它支持两种运行模式：

| 模式 | 说明 | 适用场景 |
| --- | --- | --- |
| **静态模式** | 双击 `index.html` 即可使用，数据存浏览器 localStorage | 本地写作、临时预览 |
| **云端模式** | 部署到 Cloudflare Workers + D1，数据存云端数据库 | 正式发布、多人访问 |

整个博客本体就在 `public/` 目录：前台 `index.html` + `style.css` + `app.js` + `posts.js`，后台 `admin.js` + `admin.css`，国际化 `i18n.js` + `locales/`。无需任何第三方运行时依赖。

> 💡 仓库根目录的 `index.html` 只是一个跳转页，会自动打开 `public/index.html`（Cloudflare Pages / Workers 的部署目录）。本地双击 `public/index.html` 同样可用。

---

## ✅ 优点

| 优点 | 说明 |
| --- | --- |
| **零门槛** | 不需要 Node.js、不需要 npm、不需要构建，双击即可运行 |
| **零成本** | Cloudflare Workers + D1 免费额度完全够个人博客使用 |
| **零依赖** | 不引入任何第三方库，代码量可控，加载极快 |
| **零锁定** | 文章是 Markdown 文件，随时可以迁移到任何平台 |
| **双通道** | 静态导出 + 云端 API，同一份代码两种部署方式 |
| **响应式** | 前台 + 后台均支持手机 / 平板 / 桌面全适配 |
| **多语言** | 内置中文 / English / 日本語 / 한국어 / हिन्दी 五语界面，自动识别浏览器语言 |
| **衬线美学** | 四级衬线字体栈（思源宋体 / 源樣明體 / 梦源宋体 / 朱雀仿宋），中文阅读更有温度 |
| **安全** | PBKDF2 + AES-GCM 加密，密码哈希存储，会话令牌鉴权，Origin / CORS 校验 |

---

## 📁 目录结构

```
├── public/                          # 站点本体（静态资源，部署目录）
│   ├── index.html                   # 页面入口（双击 / 部署起点）
│   ├── config.js                    # 全站配置（页脚 / 广告 / 模式 / 语言）
│   ├── style.css                    # 前台样式（深色模式 + 响应式 + 四级衬线字体）
│   ├── app.js                       # 前台逻辑（路由 / 评论 / 加密 / 搜索 / 多语言 / 主题）
│   ├── admin.js                     # 后台管理 SPA（仪表盘 / 文章 / 评论 / 设置）
│   ├── admin.css                    # 后台样式（响应式布局）
│   ├── i18n.js                      # 国际化模块（中/英/日/韩/印地，内置中文兜底）
│   ├── posts.js                     # 静态模式文章数据（由「导出 posts.js」生成）
│   ├── locales/                     # 语言包（zh-CN / en / ja / ko / hi）
│   ├── fonts/dreamserif/            # 本地分片衬线字体（梦源宋体 QY-Display）
│   ├── feed.xml                     # 静态 RSS（可选，云端由 API 生成）
│   ├── sitemap.xml                  # 静态 Sitemap（可选）
│   ├── robots.txt                   # 爬虫规则（禁止抓取后台，声明 Sitemap）
│   └── _redirects                   # Cloudflare Pages 路由（SPA 回退 + /public 重定向）
├── functions/                       # Cloudflare API（Pages Functions / Workers 共用）
│   ├── api/
│   │   ├── posts.js                 # 文章 CRUD
│   │   ├── posts/[id]/
│   │   │   ├── index.js             # 单篇文章（GET / PUT / DELETE）
│   │   │   ├── comments.js          # 文章评论（GET / POST，支持嵌套回复）
│   │   │   ├── comments/[cid].js    # 单条评论删除（管理）
│   │   │   └── stats.js             # 阅读 / 点赞统计
│   │   ├── comments.js              # 全局评论列表（管理后台）
│   │   ├── comments/[id].js         # 评论审核 / 删除
│   │   ├── media.js                 # 媒体资源库
│   │   ├── media/[id].js            # 媒体删除
│   │   ├── settings.js              # 站点设置
│   │   ├── site-files/              # 站点产物（feed.xml / sitemap.xml / posts.js）
│   │   │   ├── index.js             # 列出 / 保存产物
│   │   │   └── [name].js            # 下载产物内容
│   │   ├── admin/
│   │   │   ├── setup.js             # 首次设置密码
│   │   │   ├── login.js             # 密码登录
│   │   │   ├── logout.js            # 登出
│   │   │   └── password.js          # 修改密码
│   │   ├── stats/trend.js           # 30 天趋势数据
│   │   ├── feed.xml.js              # RSS 生成
│   │   └── sitemap.xml.js           # Sitemap 生成
│   └── _lib/
│       └── api-core.js              # API 核心逻辑（D1 + 鉴权 + 安全）
├── worker.js                        # Cloudflare Workers 入口（路由分发）
├── migrations/                      # D1 数据库迁移（CI 自动执行，幂等）
│   ├── 0001_init.sql                # 基础表结构
│   ├── 0002_site_files.sql          # 站点文件存储
│   ├── 0003_cover_column.sql        # 封面图字段
│   ├── 0004_post_meta.sql           # 分类 / 发布状态
│   ├── 0005_comment_status.sql      # 评论审核状态
│   ├── 0006_media.sql              # 媒体资源表
│   ├── 0007_settings.sql            # 站点设置表
│   ├── 0008_stats_daily.sql         # 每日统计表
│   ├── 0009_comment_status_index.sql # 评论状态索引
│   ├── 0010_admin_must_change.sql   # 强制改密标记
│   ├── 0011_comment_reply.sql       # 评论回复 parent_id 字段
│   └── 0012_clear_orphaned_nav.sql  # 清理遗留 nav 配置
├── scripts/
│   └── migrate-kv-to-d1.mjs         # 一次性迁移：KV 数据 → D1
├── .github/workflows/
│   ├── deploy.yml                   # GitHub Actions 自动部署到 Workers
│   └── migrate-kv-to-d1.yml         # 手动触发 KV → D1 迁移
├── seed.js                          # 导入示例文章到云端 API
├── _addtheme.py                     # 历史脚本：注入主题切换（已固化进源码，无需再跑）
├── wrangler.toml                    # Cloudflare Pages 配置
├── wrangler.workers.toml            # Cloudflare Workers 配置
├── smoke-test.js                    # 冒烟测试
├── README.md                        # 中文说明
└── README_EN.md                     # 英文说明
```

---

## ✨ 特色功能

### 前台

| 功能 | 说明 |
| --- | --- |
| 真实路径路由 | 无 hash：`/`、`/archive`、`/about`、`/tags`、`/posts/<别名>/`、`/admin`、`/write`，刷新不 404 |
| Markdown 写作台 | 实时预览、工具栏一键插入、字数统计、草稿自动保存 |
| 文章加密 | PBKDF2 + AES-GCM 端到端加密，正文只存密文 |
| 评论系统 | 云端 D1 全局评论 + 审核模式；静态模式 localStorage；支持**嵌套回复** |
| 站内搜索 | 实时匹配标题 / 标签 / 摘要 |
| 正文目录 TOC | 自动生成、锚点跳转；代码高亮 |
| 阅读统计 | 浏览数 / 点赞（云端全局 / 静态本机） |
| 精选文章 | 评论区下方自动推荐（点赞×3 + 浏览 + 评论×5） |
| RSS / Sitemap | 自动生成，加密文章自动排除 |
| 上一篇 / 下一篇 | 只有一条时自动隐藏空位 |
| 卡片式列表 | 封面缩略图、置顶徽章、标签贴底 |
| 深色 / 浅色主题 | 一键切换，多断点响应式适配 |
| 多语言界面 | 中文 / English / 日本語 / 한국어 / हिन्दी，自动识别 + 手动切换 |
| 四级衬线字体 | 正文思源宋体 · 章节标题源樣明體 · 大标题梦源宋体 · 引用朱雀仿宋 |

### 管理后台

| 功能 | 说明 |
| --- | --- |
| 仪表盘 | 7 项统计卡片 + 30 天访问 / 评论趋势图 |
| 文章管理 | 搜索 / 分类筛选 / 分页 / 置顶切换 / 加密切换 |
| 编辑器 | Markdown 实时预览 + 分类 / 标签 / 封面 / 置顶 / 加密 |
| 评论管理 | 全局评论列表，审核 / 删除，回复链追踪 |
| 分类 / 标签管理 | 重命名 / 删除（批量更新所有相关文章） |
| 媒体资源库 | 图片上传（base64 存 D1） |
| 博客设置 | 站点信息 / 个人资料 / 导航菜单 |
| 一键导出 | 同时导出 posts.js / feed.xml / sitemap.xml，覆盖即发布 |
| 响应式 | PC 固定侧栏 / 移动端抽屉导航 |

---

## 🚀 部署方式

### 方式一：本地静态

```bash
git clone https://github.com/kejiland/blog.git
cd blog
```

双击 `public/index.html`，或启动本地服务器：

```bash
# Python
python -m http.server 8080 -d public

# Node.js
npx serve public
```

打开 `http://localhost:8080/admin`，设置密码即可开始写作。

### 方式二：Cloudflare Workers（推荐）

#### 1. 准备工作



- 注册 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)：`npm install -g wrangler`

#### 2. 创建 Cloudflare 资源

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库（主存储：文章 / 评论 / 统计 / 密码）
npx wrangler d1 create blog
# 记下输出的 database_id（是 UUID，不是数据库名，也不是 KV 的 id）

# 创建 KV 命名空间（备用绑定）
npx wrangler kv namespace create BLOG
# 记下输出的 id（32 位十六进制）
```

#### 3. 配置 GitHub Secrets

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 必填 | 说明 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API Token（需要 Workers + D1 + KV 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare 账户 ID（在 Dashboard 右侧可见） |
| `BLOG_D1_ID` | ✅ | D1 数据库 ID（上一步创建获得，UUID 格式） |
| `BLOG_KV_ID` | ✅ | KV 命名空间 ID（上一步创建获得，32 位十六进制） |
| `BLOG_ADMIN_SETUP_KEY` | 推荐 | 首次设置管理员密码的一次性密钥（防抢注） |
| `SITE_URL` | 推荐 | 站点对外域名，如 `https://blog.example.com`（用于收紧 CORS / RSS / Sitemap） |
| `CF_ZONE_ID` | 可选 | 自定义域名的 Zone ID（配置后发布即清边缘缓存） |

#### 4. 部署

推送到 `main` 分支，GitHub Actions 会自动：

1. ✅ 校验必要 Secrets
2. ✅ 执行 D1 迁移（建表 + 加列，按序幂等）
3. ✅ 部署 Worker 到 Cloudflare
4. ✅ 写入运行时 Secret（`BLOG_ADMIN_SETUP_KEY` 等）

部署完成后访问 `https://<worker名>.<子域>.workers.dev/admin`：
- 若配置了 `BLOG_ADMIN_SETUP_KEY`，首次用该密钥设置管理员密码；
- 否则系统自动生成随机默认密码，登录后强制修改。

#### 5. 从 KV 迁移到 D1（旧数据）

若你此前使用 KV 单 key 存储，可手动运行迁移工作流把线上数据搬到 D1：

```bash
# 本地执行（需 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / BLOG_KV_ID / BLOG_D1_ID）
node scripts/migrate-kv-to-d1.mjs --dry-run   # 仅预览 SQL
node scripts/migrate-kv-to-d1.mjs             # 正式写入 D1
```

或在仓库 Actions 标签页手动触发 `Migrate KV to D1` 工作流（仓库 Secrets 自动注入，支持 `dry-run` / `migrate` 两种模式）。

---

## ☁️ Cloudflare 服务说明

### Workers

Workers 是 Cloudflare 的边缘计算平台，本项目用它运行后端 API：

- **入口文件**：`worker.js`（路由分发）+ `functions/`（Pages Functions）
- **静态资源**：`public/` 目录通过 Workers 的 `[assets]` 绑定自动提供
- **兼容性日期**：`2025-02-01`

**wrangler.workers.toml 关键配置**：

```toml
name = "kejiland"
main = "worker.js"

[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"  # SPA 回退
html_handling = "auto-trailing-slash"

[[kv_namespaces]]
binding = "BLOG"
id = "{env.BLOG_KV_ID}"

[[d1_databases]]
binding = "DB"
database_name = "blog"
database_id = "{env.BLOG_D1_ID}"
```

### KV（Key-Value 存储）

KV 用于备用绑定（已基本被 D1 取代），当前用途：

| 用途 | 说明 |
| --- | --- |
| 点赞去重 | `liked:{ip}:{postId}` → 防刷赞 |
| 站点文件缓存 | feed.xml / sitemap.xml / posts.js 缓存 |
| 缓存清除标记 | `purge:{tag}` → 版本控制 |

> ⚠️ KV 是**最终一致性**（全球传播有延迟），不适合需要强一致性的场景。D1 是 SQLite，提供强一致性。

### D1（SQLite 数据库）

D1 是 Cloudflare 的边缘 SQLite 数据库，本项目的**主存储**：

| 表 | 说明 | 关键字段 |
| --- | --- | --- |
| `posts` | 文章 | id, title, content, cover, pinned, protected, enc, tags, category, status |
| `comments` | 评论 | id, post_id, author, content, date, status (approved/pending), **parent_id**（回复） |
| `stats` | 阅读/点赞 | post_id, views, likes |
| `admin_auth` | 管理员密码 | k, salt, hash, iter, must_change |
| `admin_sessions` | 登录会话 | token, exp |
| `admin_fails` | 登录限流 | ip, n, until |
| `media` | 媒体资源 | id, name, url, type, size |
| `site_settings` | 站点设置 | k, v（键值对） |
| `site_files` | 站点产物 | name, content, updated_at（feed/sitemap/posts.js） |
| `stats_daily` | 每日统计 | post_id, date, views, likes |

---

## ⚙️ 配置文件说明

### config.js

```javascript
window.BLOG_CONFIG = {
  // ====== 基础配置 ======
  mode: 'auto',           // 'auto' | 'static' | 'api'
  apiBase: '',            // API 基础地址，留空 = 同源
  siteUrl: '',            // 站点对外地址（RSS/Sitemap 用）
  writeToken: '',         // 旧版静态令牌（建议用登录替代）
  pageSize: 5,            // 首页每页文章数（0 = 不分页）
  adminPwd: '',           // 静态模式本地密码（云端模式请留空）

  // 导航项统一在 public/app.js 的 NAV 数组中定义（单一数据源，无需在此配置）

  // ====== 页脚配置 ======
  footer: {
    text: '',
    icp: '',               // 备案号
    contact: [],           // 联系方式
    links: [],             // 友情链接
    decl: '',              // 站点声明
    email: '',             // 联系邮箱
    startYear: 2019,       // 版权起始年
    copyrightName: "Qingyu'Blog"
  },

  // ====== 广告位 ======
  ads: {
    enabled: false,
    belowSearch: '',       // 首页列表上方
    between: '',           // 列表间隔插入
    betweenEvery: 3,       // 每 N 篇插入
    content: ''            // 文章详情底部
  }
};
```

### mode 说明

| 值 | 行为 |
| --- | --- |
| `'auto'` | **推荐**。自动检测：请求 `/api/posts` 成功 → 云端；失败 → 静态 |
| `'static'` | 强制静态模式，只用 posts.js |
| `'api'` | 强制云端模式，需要后端 API |

### 多语言（i18n）

`i18n.js` 内置 5 种语言（中文 / English / 日本語 / 한국어 / हिन्दी），默认按浏览器 `navigator.language` 自动识别，并提供手动切换。语言包放在 `public/locales/<lang>.json`（中文同时内嵌兜底，确保 `file://` 本地预览时核心文字始终可读）。

---

## 🛡️ 安全设计

| 层 | 机制 |
| --- | --- |
| 密码存储 | PBKDF2-SHA256 加盐哈希（100,000 次迭代），永不存明文 |
| 首次部署 | 自动生成随机默认密码（或 `BLOG_ADMIN_SETUP_KEY` 设密），登录后强制修改 |
| 静态模式 | 密码 SHA-256 哈希存储（兼容旧明文，登录后自动升级） |
| 会话管理 | 随机 Token（32 字节 hex），7 天有效，登出即销毁 |
| 限流 | 同一 IP 连续失败 5 次锁定 15 分钟 |
| 文章加密 | PBKDF2 + AES-GCM 端到端加密，密文只存服务端 |
| 评论安全 | XSS 转义 + SQL 注入参数化 + 每 IP 频率限制 + Origin 校验 |
| 接口边界 | 未知 /api/* 返回 JSON 404，绝不回退到 index.html |
| CORS | 配置 `SITE_URL` 后仅允许本站来源，未配置回退为回显来源 |

---

## 🧪 测试

```bash
node smoke-test.js
```

覆盖 Markdown 渲染、TOC、代码高亮、导入导出、管理门禁、置顶、归档、标签、评论安全、加密、统计、搜索、RSS、Sitemap、云端 API、缓存等。

导入示例文章到已部署的云端实例：

```bash
node seed.js https://your-blog.workers.dev [--token <会话或写入令牌>]
```

---

## 🖼️ 项目截图

| 首页（浅色） | 文章详情 | 写作台 |
| --- | --- | --- |
| ![首页](screenshots/home.png) | ![文章详情](screenshots/detail.png) | ![写作台](screenshots/write.png) |

| 管理后台 · 仪表盘 | 评论管理 | 移动端 |
| --- | --- | --- |
| ![后台仪表盘](screenshots/admin.png) | ![评论管理](screenshots/admin-list.png) | ![移动端](screenshots/mobile.png) |

### 衬线字体预览

| 首页（浅色） | 文章（浅色） | 文章（深色） |
| --- | --- | --- |
| ![首页浅色](screenshots/font-preview/home-light.png) | ![文章浅色](screenshots/font-preview/article-light.png) | ![文章深色](screenshots/font-preview/article-dark.png) |

---

## 📄 许可证

[MIT](LICENSE)

---

<p align="center">
  如果 Qingyu'Blog 对你有帮助，欢迎 ⭐ Star / Fork，或到 <a href="https://github.com/kejiland/blog/issues">Issues</a> 提建议。
</p>

<p align="center">
  <b>如果你觉得不错，请给个 ⭐ Star 支持一下！这会帮助更多人发现这个项目。</b>
</p>

<!-- Topics: blog, personal-blog, vanilla-js, no-framework, no-dependency, static-site, cloudflare-workers, cloudflare-d1, markdown-blog, javascript, zero-build, lightweight, responsive-design, dark-theme, i18n, end-to-end-encryption, open-source, self-hosted, serif-font, cloudflare-pages -->