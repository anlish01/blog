# Qingyu'Blog · 一个可以双击打开的原生 JS 博客

> 零框架 · 零构建 · 零依赖 —— **双击 `index.html` 就能用的个人博客**，也可以一键部署到 Cloudflare 免费上云。
>
> 🚀 在线体验：**[kejiland.azhz.workers.dev](https://kejiland.azhz.workers.dev)**（线上 Demo，含置顶文章与评论）

---

## 为什么值得一试

市面上写博客要么用 Hexo / Hugo（要 Node、要构建），要么用 WordPress / 各类 CMS（要服务器、要数据库）。**Qingyu'Blog 不一样**：

```
📂 整个博客 = 一个文件夹 = 4 个文件
   index.html + style.css + app.js + posts.js
```

- ✅ **双击即开**：下载下来双击 `index.html` 就能写、能读，全程离线，连 `npm install` 都不需要
- ✅ **免费上云**：部署到 Cloudflare Workers + D1（免费额度），GitHub 推送即自动部署
- ✅ **功能完整**：写作后台 / 评论 / 加密 / 搜索 / 标签 / 归档 / RSS / 阅读统计，一个不少
- ✅ **原生技术**：纯 HTML/CSS/JS + 浏览器原生 Web API（Web Crypto、localStorage），无任何框架
- ✅ **数据属于你**：文章就是朴素的 Markdown 文件，随时带走，永不绑定平台

---

## ✨ 特色功能

### 📝 写作与发布

- **Markdown 写作台**：实时预览、工具栏一键插入、字数统计、草稿自动保存（关页面不丢）
- **双通道发布**：静态模式导出 `posts.js` 覆盖即发布；云端模式一键「发布到云端」全站即时可见
- **导入 .md**：支持带 `---` frontmatter（title / date / tags / excerpt / password）的 Markdown 文件
- **文章列表管理**：直接切换**置顶 / 加密 / 删除**，无需进入编辑器

### 🔒 隐私与安全

- **文章加密**：PBKDF2 + AES-GCM 端到端加密，正文只存密文（列表接口也屏蔽），锁屏输入密码阅读
- **管理员安全**：密码只存 PBKDF2-SHA256 加盐哈希；会话令牌 7 天有效；同一 IP 连续失败 5 次锁定 15 分钟；首次设置需一次性密钥防抢注
- **评论安全**：全文转义防 XSS、参数化查询防 SQL 注入、每 IP 频率限制、来源（Origin）校验、控制字符清洗、昵称/内容长度上限、管理员删除需令牌

### 💬 评论系统

- 云端 **D1 数据库全局评论**（所有访客共享），管理员可删除不当评论
- 静态模式评论存在本浏览器（localStorage）
- 移动端 / 桌面端统一体验

### 🧭 阅读体验

- **卡片式列表**：封面缩略图（指定图 / 正文首图 / 主题渐变占位）、置顶徽章、标签贴底
- **响应式布局**：深色 / 浅色主题一键切换，手机端多断点适配（OPPO / 小米 / vivo / 华为 / iPhone 全覆盖）
- **详情页秒开**：本地缓存 + SWR 后台刷新，二次进入瞬间打开
- **站内搜索**：顶部导航随时展开，实时匹配标题 / 标签 / 摘要
- **正文目录 TOC**：自动生成、锚点跳转；代码高亮支持 js / ts / python / bash / css / html / json
- **阅读统计**：阅读数 / 点赞（云端全局 / 静态本机）
- **归档 / 标签云 / 上一篇下一篇 / 一键复制链接**：一个不少

### 📡 内容分发

- **RSS + Sitemap** 自动生成（加密文章自动排除），利于订阅与搜索引擎收录
- **自定义导航 / 页脚 / 广告位**：全部 `config.js` 配置驱动，改配置不碰代码
- 页脚导航按登录态显示：普通用户见 RSS，管理员见写作后台

---

## 🖼️ 界面预览

| 首页（桌面端） | 文章详情（桌面端） |
| --- | --- |
| ![首页](screenshots/home.png) | ![文章详情](screenshots/detail.png) |

| 首页（手机端） | 管理后台（登录门禁） |
| --- | --- |
| ![手机端](screenshots/mobile.png) | ![管理后台](screenshots/admin.png) |

> 以上为线上站点的真实截图。想亲手体验？直接访问 <https://kejiland.azhz.workers.dev>，或按下方「快速开始」30 秒本地跑起来。

---

## 🚀 快速开始

### 方式一：本地静态（30 秒体验，零部署）

```bash
git clone https://github.com/kejiland/blog.git
# 或者直接下载 ZIP
```

双击 `public/index.html` → 右上角「✏️ 写文章」→ 设置一个管理密码 → 开始写作。

> 静态模式没有后端，"发布" = 浏览器弹出保存对话框，把生成的 `posts.js` 放回 `public/` 目录覆盖旧文件。

### 方式二：部署到云端（推荐，免费）

1. Fork 本仓库到你的 GitHub
2. Cloudflare 创建 **D1 数据库** `blog`（主存储）+ **KV 命名空间** `BLOG`（备用）
3. 仓库 Settings → Secrets 配置：`BLOG_D1_ID`、`BLOG_KV_ID`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（详细说明见下方）
4. 推送到 `main` → GitHub Actions 自动：建表 → 部署 → 写入密钥
5. 用一次性密钥初始化管理员密码 → 打开 `https://<你的域名>/admin` 开始写作

**部署 Secrets 一览**：

| Secret | 说明 |
| --- | --- |
| `BLOG_D1_ID` | D1 数据库 ID（UUID 格式，主存储） |
| `BLOG_KV_ID` | KV 命名空间 ID（备用绑定） |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（Workers / KV / D1 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `BLOG_ADMIN_SETUP_KEY` | （建议）一次性管理员密码初始化密钥，防抢注 |

---

## 🧰 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | 原生 JavaScript（ES5 风格，零框架、零依赖） |
| 云端 | Cloudflare Workers + D1（SQLite）+ KV（备用） |
| 部署 | GitHub Actions 自动部署（推送即上线） |
| 加密 | PBKDF2 + AES-GCM（浏览器原生 Web Crypto） |
| 数据 | Markdown 文件（本地）/ D1（云端），双通道 |

---

## 🗂️ 项目结构

```
├── public/                      # 站点本体（静态资源）
│   ├── index.html               # 页面骨架（双击 / 部署入口）
│   ├── config.js                # 全部站点配置（导航 / 页脚 / 广告位…）
│   ├── style.css                # 样式（深色模式 + 响应式多断点）
│   ├── app.js                   # 全部逻辑（路由 / 写作 / 评论 / 加密 / 搜索…）
│   └── posts.js                 # 静态模式文章数据（Markdown）
├── functions/                   # Cloudflare API（Pages Functions / Workers 共用）
│   ├── api/                     # 路由：posts / comments / stats / admin / feed / sitemap
│   └── _lib/api-core.js         # API 核心（D1 存储 + 鉴权 + 安全）
├── worker.js                    # Cloudflare Workers 入口
├── migrations/                  # D1 表结构（CI 自动应用）
├── .github/workflows/deploy.yml # 自动部署
├── smoke-test.js                # 冒烟测试（node smoke-test.js）
└── README.md                    # 本说明
```

---

## 🧪 测试

```bash
node smoke-test.js   # 68 项回归测试，零依赖
```

覆盖：Markdown 渲染 / TOC / 代码高亮 / 导入导出 / 管理门禁 / 置顶 / 归档 / 标签 / 评论（含安全加固）/ 加密 / 统计 / 搜索 / RSS / Sitemap / 云端 API / 缓存。

---

## 🛡️ 安全设计一览

- 管理员密码：PBKDF2-SHA256 加盐哈希（100,000 次迭代），永不存明文
- 写操作：一律要求 `Authorization: Bearer` 会话令牌，否则 401
- 评论：XSS 全转义 · SQL 注入参数化 · 每 IP 每分钟限 5 条 · Origin 校验 · 控制字符清洗 · 长度上限
- 文章加密：正文只存密文，列表接口屏蔽密文，加密文章不进 RSS
- 敏感配置：全部走 GitHub Secrets，不落仓库

---

## 📄 许可证

[MIT](LICENSE)

---

*如果 Qingyu'Blog 对你有帮助，欢迎 ⭐ Star / Fork，或到 [Issues](https://github.com/kejiland/blog/issues) 提建议。*
