# 轻语博客（Light Blog）

一个**零依赖、开箱即用**的轻量版博客。没有框架、不需要 `npm install`。

两种数据方案：

- **💾 静态模式**：双击 `public/index.html` 即开，数据来自 `posts.js`，发布靠「导出 posts.js」。
- **📡 云端模式**：部署到 Cloudflare（Pages 或 Workers），数据存 **Cloudflare KV**，写文章点「发布到云端」即全站可见。

前端**自动检测**：能连上 `/api/posts` 就用云端模式，否则退回静态模式，无需改代码（详见 `public/config.js`）。

## 文件结构

```
论坛/
├── public/                  # 站点本体（Cloudflare 静态资源目录）
│   ├── index.html           # 页面骨架（本地双击这个文件）
│   ├── config.js            # 部署配置（mode/apiBase/writeToken/siteUrl/adminPwd/nav/footer/ads）
│   ├── style.css            # 样式（深色模式 + 响应式 + 导航 + 归档 + 评论 + 加密锁屏 + TOC + 高亮）
│   ├── app.js               # 全部逻辑（列表/详情/搜索/标签/归档/写作/发布/评论/加密/TOC/高亮/统计）
│   ├── posts.js             # 静态模式的文章数据
│   ├── feed.xml             # 静态模式的 RSS 订阅源（可由写作页导出覆盖）
│   └── sitemap.xml          # 静态模式的站点地图（可由写作页导出覆盖）
├── functions/api/           # Cloudflare Pages Functions（云端 API）
│   ├── posts.js             # GET 列表 / POST 新建
│   ├── posts/[id].js        # GET / PUT / DELETE 单篇
│   ├── posts/[id]/comments.js        # GET / POST 评论（公开）
│   ├── posts/[id]/comments/[cid].js  # DELETE 评论（需写入令牌）
│   ├── posts/[id]/stats.js           # GET / POST 阅读数·点赞（公开）
│   ├── feed.xml.js          # RSS 订阅源（自动生成）
│   ├── sitemap.xml.js       # 站点地图（自动生成）
│   └── _lib/api-core.js     # API 核心逻辑（KV 存储 + 写入令牌 + 评论 + RSS/Sitemap；下划线目录不被当作路由，Pages 与 Workers 共用）
├── worker.js                # Cloudflare Workers 入口（API + 静态资源）
├── wrangler.toml            # Cloudflare Pages 配置（pages_build_output_dir 等）
├── wrangler.workers.toml    # Cloudflare Workers 配置（部署用 -c 指定）
├── seed.js                  # 把示例文章导入云端（node seed.js <站点地址>）
├── smoke-test.js            # 冒烟测试（node smoke-test.js，44 项）
├── index.html               # 本地入口（自动跳转到 public/index.html）
└── README.md                # 本说明
```

## 快速开始（本地静态）

1. **浏览**：双击 `index.html`（或 `public/index.html`）。
2. **写作**：点右上角「✏️ 写文章」——**首次进入会强制要求设置一个管理密码（≥4 位，存本浏览器）**——然后即可写作：Markdown 实时预览 + 工具栏一键插入，草稿自动保存（localStorage，关页面不丢）。
3. **发布**：点「📥 保存文章」→ 浏览器弹出**系统保存对话框**，**选中原来的 `posts.js` 即原地覆盖**（一步完成，无需下载-替换）；`📡 RSS`、`🗺 Sitemap` 同理，选中原 `feed.xml` / `sitemap.xml` 即覆盖（仅本机可见）。

> 静态模式没有后端，浏览器无法直接写你的服务器，所以"生成数据文件 → 放回目录"是最轻的发布方式；想要**一键即发布、数据存云端**，用 Cloudflare 部署（下述方式 A/B），写作页会变成「🚀 发布到云端」。

## 部署到 Cloudflare（支持存数据）

> 需要 Node.js 18+ 与 wrangler：`npm i -g wrangler` 或 `npx wrangler`。

### 第 0 步：创建 KV 命名空间（云端写文章存储）

```bash
npx wrangler kv namespace create BLOG
```

把输出的 `id` 填进 `wrangler.workers.toml` 的 `[[kv_namespaces]]`（Workers 部署用）；
Pages 部署时可在控制台 Settings → Bindings 添加同名 KV（变量名 `BLOG`），
或用下面第 62 行的方式绑定。

### 方式 A：Cloudflare Pages（推荐）

**Git 连接（推荐，支持自动部署与 Functions）：**
控制台 → Workers & Pages → 创建 → Pages → 连接到 Git → 选 `kejiland/blog`。
构建配置：**构建输出目录（Build output directory）= `public`**，构建命令留空（零依赖）。

> 仓库根目录的 `wrangler.toml` 已与 Pages 兼容（BETA 读取），`main`/`[assets]`
> 等 Workers 专属配置已拆到 `wrangler.workers.toml`，避免 Pages 构建报错
> （`ASSETS` 是 Pages 保留名）。
> 若未创建真实 KV 命名空间，请保持 `wrangler.toml` 中 `[[kv_namespaces]]` 整段注释；
> 云端写文章功能随后在控制台 Bindings 添加 KV（变量名 `BLOG`）即可开启。

**命令行方式（备选）：**

```bash
npx wrangler pages deploy        # 静态资源 public/，functions/ 自动打包
```

首次运行按提示创建项目并确认。完成后：

```bash
node seed.js https://<你的项目名>.pages.dev   # （可选）导入示例文章
```

打开站点 → 右上角页脚出现「📡 在线」即云端模式成功。写文章页点「🚀 发布到云端」即可存数据。

> `wrangler pages deploy` 也会读取 `wrangler.toml`（已兼容），不会再报 `ASSETS` 保留名错误。

### 方式 B：Cloudflare Workers

```bash
npx wrangler deploy -c wrangler.workers.toml   # 部署 worker.js + 静态资源绑定
node seed.js https://<你的子域>.workers.dev
```

### 说明

- 数据存在 KV 的单个 key（`posts:v1`）里，个人博客量级足够；若需多人并发写，可升级为逐篇 key 或 Durable Objects（见 `functions/_lib/api-core.js` 注释）。
- 想强制某种模式？改 `public/config.js`：`mode: 'static' | 'api' | 'auto'`；跨域部署可填 `apiBase`。
- 云端模式里点「⬇️ 备份 posts.js」可把云端数据导出为带日期的本地备份文件。

#### （可选）启用写入令牌，防止公网被乱写

默认部署后，任何人知道网址都能增删内容。需要保护时：

1. 后端设置令牌（二选一）：
   - Workers：`npx wrangler secret put BLOG_WRITE_TOKEN`
   - Pages：Cloudflare 控制台 → 项目 → Settings → Environment variables 添加 `BLOG_WRITE_TOKEN`
2. 前端填写同一个令牌（二选一）：
   - 改 `public/config.js` 的 `writeToken`
   - 或在浏览器控制台执行 `localStorage.setItem('qingyu.token', '你的令牌')`

配置后，未携带令牌的写操作（发布/更新/删除）返回 401；读操作不受影响。

### 🗺 路由（真实路径，无 hash）

本博客使用干净的路径路由（部署后），不再有 `#/`：

| 页面 | 地址 |
| --- | --- |
| 首页 | `https://blog.example.com/` |
| 归档 | `https://blog.example.com/archive` |
| 关于 | `https://blog.example.com/about` |
| 标签 | `https://blog.example.com/tags` |
| 写作后台 | `https://blog.example.com/admin`（或 `/write`） |
| 文章详情 | `https://blog.example.com/posts/文章别名/` |
| 编辑文章 | `https://blog.example.com/posts/文章别名/edit` |
| RSS | `https://blog.example.com/feed.xml`（静态）或 `/api/feed.xml`（云端） |

- 文章 URL 统一为 `https://域名/posts/<别名>/`，对 SEO 友好；别名即文章 id（slug）。
- 本地双击 `public/index.html`（`file://`）时自动退化为 `#/` 内部路由，不影响使用。
- 服务器已配置 SPA 回退：`worker.js` 与 `public/_redirects` 会把 `/posts/*/`、`/archive` 等干净路径回退到 `index.html`，并在 Cloudflare Pages 上把老 `/public/*` 链接 301 到根。

### 🔐 管理员门禁（写文章页）

两种模式，任选其一：

1. **固定密码**：在 `public/config.js` 填 `adminPwd`（如 `'my-secret'`），所有浏览器都用它验证。
2. **首次强制设置**（默认，`adminPwd` 留空）：第一次进入「写文章」页**必须**设置一个管理密码（≥4 位，不可跳过），之后进入写作页都需要验证；密码保存在该浏览器本地，换浏览器需重新设置（或改用模式 1）。

- 验证通过后本次会话内有效；点「退出管理」可重新验证（写作页工具栏）。
- 这是**前端门禁**（防君子）：公网环境的真实写权限由后端的 `BLOG_WRITE_TOKEN` 保证（见上文）。

### 📦 文章多了会不会臃肿？不会

- **云端模式**：`GET /api/posts` 列表只返回摘要（不含正文/密文），正文在打开文章时**按需加载**（`GET /api/posts/:id`）——文章再多，首页/归档也只拉轻量摘要；云端「备份 posts.js」时才会逐个拉取全文。
- **静态模式**：`posts.js` 是唯一数据源，整文件随页面加载（无可避免）；适合百篇以内规模，更大规模建议切云端模式。导出文件保持人类可读格式，方便手工维护。

## RSS / 置顶 / 广告 / 评论 / 加密 / Sitemap

### 📡 RSS 订阅

- **云端模式**：RSS 自动生成，订阅地址就是 `https://你的站点/api/feed.xml`（页脚有链接）。
- **静态模式**：写文章页点「📡 RSS」，用系统保存对话框**选中原 `feed.xml` 即原地覆盖**（或下载后手动放回博客目录），订阅地址为 `https://你的站点/feed.xml`。
- RSS 用站点地址拼接链接：在 `public/config.js` 填 `siteUrl`（如 `https://blog.example.com`），不填则后端取请求来源、前端取页面来源。
- **加密文章不会出现在订阅源里**（防泄露）。

### 📌 文章置顶

- 写作页勾选「置顶这篇文章」，列表排序为 **置顶在前，其余按日期倒序**，卡片带 📌 徽章。
- 静态模式导出 `posts.js`、云端模式发布都会保留置顶标记（`pinned: true`）。

### 🪧 广告位（按需启用）

在 `public/config.js` 的 `ads` 里配置（未启用时页面完全不输出广告位）：

```js
ads: {
  enabled: true,        // 总开关
  belowSearch: '<ins class="adsbygoogle" ...></ins>',   // 首页列表上方
  between:     '<ins class="adsbygoogle" ...></ins>',   // 列表每隔 N 篇插一条
  betweenEvery: 3,      // 间隔篇数
  content:     '<ins class="adsbygoogle" ...></ins>'    // 详情页底部
}
```

代码为原始 HTML/脚本（如 Google AdSense 的 `<ins>` 片段），自行保证安全；未填的位置自动不渲染。

### 🧭 自定义导航与页脚（都在 `public/config.js`）

```js
nav: [
  { text: '首页', url: '#/' },
  { text: '关于', url: '#/about', children: [      // children = 二级下拉菜单
    { text: '写作', url: '#/write' },
    { text: '开源', url: 'https://github.com' },   // 外链自动新窗口打开
  ]}
  // 留空数组 = 默认（首页 / 归档 / 关于）
],
footer: {
  text: 'Made with ♥',                             // 底部说明文字（可放备案号/签名）
  links: [ { text: '友情链接', url: 'https://example.com' } ]  // 页脚链接行（RSS 自动附上）
}
```

- 页脚通过 flex 布局**固定贴底**：内容不足一屏时也在浏览器最底部。
- 页脚不再显示「本地 / 在线」标识；运行模式信息在关于页可见。

### 💬 评论

- **云端模式**：评论存于 KV（key `comments:<文章id>`），任何访客可发表，管理时点评论旁的 ✕ 删除（需 `BLOG_WRITE_TOKEN`）。
- **静态模式**：评论只保存在本浏览器（localStorage），页面会提示这一点。
- 昵称 ≤ 30 字符、内容 ≤ 1000 字符、每篇上限 300 条，空内容/空昵称会被拒绝。

### 🔒 文章加密（密码保护）

- 写作页「🔑 访问密码」填入密码后，正文用 **PBKDF2 + AES-GCM（Web Crypto）** 加密存储——`posts.js` / KV / 导出文件里只有密文，没有明文。
- 读者打开加密文章会看到锁屏，输入密码解锁阅读；解锁只在本次会话内有效（刷新需重新输入）。
- 编辑加密文章：先输入原密码「🔓 解锁编辑」，发布时将用密码重新加密（换新密码即以新密码加密）。
- 前端 `config.js` / 本地草稿中会短暂保留明文（方便作者自己编辑），属预期行为。
- 注意：前端加密适合「防君子」场景；真正的强保护应配合不公开部署文件。

### 🗺 Sitemap（SEO）

- 云端：`https://你的站点/api/sitemap.xml` 自动生成（含首页 / 关于 / 归档 / 全部文章）。
- 静态：写文章页点「🗺 Sitemap」，用系统保存对话框**选中原 `sitemap.xml` 即原地覆盖**（或下载后手动放回博客目录）；再到搜索引擎站长工具提交。

## 功能一览

- 📝 列表 + 详情（Markdown：标题/列表/引用/表格/代码块/链接/图片）
- 🖍 代码高亮（零依赖正则分词：js/ts/python/bash/css/html/json，深浅色双配色）
- 📑 正文自动目录（📑 目录抽屉，点击平滑滚动到章节）
- 🧰 编辑器工具栏（加粗/斜体/行内代码/标题/链接/图片/引用/列表/代码块一键插入）
- 👁 阅读数 + ❤ 点赞（云端 KV 全局统计 / 静态模式本机统计，每会话计一次阅读、每浏览器一赞）
- ✏️ 本地写作 / 编辑，草稿自动保存；云端模式一键发布/更新/删除
- 🔐 写作页管理员门禁：首次进入**强制设置**管理密码（存本浏览器），或配置 `adminPwd` 固定密码；可随时退出管理
- 📥 人性化保存：保存文章 / RSS / Sitemap 走系统保存对话框，**选中原文件即原地覆盖**（一步发布）
- 🚶 详情页脚「上一篇 / 下一篇」按日期相邻导航
- 📡 云端正文按需加载：列表只返回摘要，打开文章才取全文（文章再多也不臃肿）
- 📌 文章置顶（排序优先 + 徽章）；📡 RSS 订阅（静态 feed.xml 导出 / 云端 /api/feed.xml）
- 🔒 文章加密（PBKDF2+AES-GCM 密码保护，锁屏阅读，加密文不入 RSS）
- 💬 评论系统（云端 KV 公开评论 + 管理删除 / 静态模式本机保存）
- 🗺 Sitemap（静态导出 / 云端 /api/sitemap.xml，利于搜索引擎收录）
- ⏱ 编辑页实时字数统计、「正在保存… / 已保存」状态、离开页面未保存提醒
- ⌨️ 快捷键：`Ctrl+S` 存草稿 · `Ctrl+Enter` 发布（云端）/ 保存（静态）
- 📂 导入 `.md` 文件（支持 `---` frontmatter：title / date / tags / excerpt / password）
- 🏷️ 独立标签页（`#/tags`，标签云按文章数排序 + 计数徽章，点击进入筛选）；卡片标签也可点选筛选，首页只会显示当前标签 + 一键清除
- 🔍 导航栏搜索：平时只是一个图表，点击展开输入框，实时出结果（标题/日期/标签/命中关键词摘要）
- 🧭 导航可自定义：`config.nav` 增删菜单、支持二级下拉（children）、外链新窗口；默认 首页/标签/归档/关于
- ☕ 详情页阅读时长估算 + 🔗 一键复制链接
- 🗂 归档页按月分组（年份分块、月份计数）；关于页实时统计（篇数/标签/总字数/最新更新 + 版本信息）
- 🪧 广告位（config 驱动：首页上方 / 列表间隔 / 详情底部）
- 🧭 导航可自定义：`config.nav` 增删菜单、支持二级下拉（children）、外链新窗口；默认 首页/归档/关于
- 🦶 页脚**贴底**固定（内容不足一屏也在最底部），可配置友链与说明文字（`config.footer`），不再显示「本地/在线」字样；回到顶部浮动按钮
- 🌙 深色/浅色主题切换（跟随系统偏好，记忆选择），与整体配色一致的圆角图标按钮
- 📱 响应式，手机电脑都能看；键盘焦点可见、细滚动条、视图切换动画

## 手动添加文章（静态模式）

直接编辑 `public/posts.js`，按格式加一条：

```js
{
  id: "my-post",          // 唯一标识（不要和已有重复）
  title: "我的文章",
  date: "2025-01-01",     // YYYY-MM-DD
  tags: ["随笔"],          // 标签数组
  excerpt: "摘要（可选）",
  content: "正文，Markdown 格式……"
}
```

## 小贴士

- 改博客名：`public/app.js` 的 `brand` 与 `public/index.html` 的 `<title>`。
- 换主题色：`public/style.css` 顶部 `:root` 的 `--accent`。
- 改完自检：`node smoke-test.js`（44 项回归测试，覆盖 Markdown/TOC/代码高亮/导入/导出/门禁/归档/标签页/评论/加密/统计/导航与页脚配置/搜索/令牌鉴权/RSS/Sitemap/云端 API）。