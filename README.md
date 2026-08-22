# 轻语博客 Light Blog

> [English README](README_EN.md) | 中文

一个 **零依赖、开箱即用** 的个人轻量博客。没有框架、没有构建步骤、不需要 `npm install`，**双击即可打开**；想存数据到云端，部署到 Cloudflare 即可。

```
✅ 零依赖     纯 HTML/CSS/JS + 原生 Web API，一个文件夹就是整个站点
✅ 双重模式   本地静态（file:// 双击即开）/ 云端存储（Cloudflare KV），自动切换
✅ 自带写作后台   Markdown 实时预览、一键发布、草稿自动保存
✅ 安全设计   管理员密码只存云端哈希、会话令牌、防暴力破解、文章可加密
```

---

## 目录

- [✨ 特色功能](#-特色功能)
- [🚀 快速开始（30 秒体验）](#-快速开始30-秒体验)
- [☁️ 部署到云端（推荐，小白向教程）](#️-部署到云端推荐小白向教程)
- [⚙️ 配置文件说明](#️-配置文件说明)
- [📖 日常使用](#-日常使用)
- [🔒 文章加密](#-文章加密)
- [🛡️ 安全设计](#️-安全设计)
- [🗂️ 项目结构](#️-项目结构)
- [🧪 测试与开发](#-测试与开发)
- [❓ 常见问题](#-常见问题)
- [📄 许可证](#-许可证)

---

## ✨ 特色功能

- 📝 **Markdown 写作**：标题 / 列表 / 引用 / 表格 / 代码块 / 链接 / 图片全支持，实时预览
- 🖍️ **代码高亮**：零依赖正则实现，支持 js / ts / python / bash / css / html / json，深浅色双配色
- 📑 **正文目录**：自动生成目录抽屉，点击平滑滚动到章节
- 📱 **响应式布局**：手机电脑都能看，深色 / 浅色主题一键切换（记忆选择）
- 🔍 **站内搜索**：导航栏随时展开，实时匹配标题 / 日期 / 标签 / 摘要
- 🏷️ **标签系统**：独立标签云页、卡片标签点击筛选
- 🗂️ **归档页**：按年月分组，关于页实时统计（篇数 / 标签 / 字数）
- ⏱️ **阅读体验**：阅读时长估算、上一篇 / 下一篇导航、一键复制链接
- 💬 **评论系统**：云端 KV 全局评论 + 管理删除；静态模式本机保存
- 📡 **RSS + Sitemap**：自动生成，利于订阅与搜索引擎收录
- 👁️ **阅读数与点赞**：云端全局统计 / 静态本机统计
- 📌 **文章置顶**：置顶优先排序 + 徽章
- 🔒 **文章加密**：密码保护，正文 AES-GCM 加密，锁屏阅读（见[下文](#-文章加密)）
- 🧭 **自定义导航 / 页脚 / 广告位**：全部 `config.js` 驱动，改配置不碰代码
- ⌨️ **快捷键**：`Ctrl+S` 存草稿 · `Ctrl+Enter` 保存/发布
- 📂 **导入 .md**：支持 frontmatter（title / date / tags / excerpt / password）

---

## 🚀 快速开始（30 秒体验）

**方式一：本地静态（零部署）**

1. 下载 / 克隆本项目，双击 `public/index.html`
2. 右上角「✏️ 写文章」→ 首次进入会要求设置一个管理密码（≥4 位，存在本浏览器）
3. 开始写作：Markdown 实时预览 + 工具栏一键插入，草稿自动保存（关页面不丢）
4. 发布：点「📥 保存文章」→ 浏览器弹出系统保存对话框 → **选中原来的 `posts.js` 原地覆盖**，即发布完成（在你自己电脑上看）；`RSS` / `Sitemap` 同理

> 静态模式没有后端，浏览器无法直接写你的服务器，所以"生成数据文件 → 放回目录"是最轻的发布方式。想让**任何设备都能访问、数据存云端**，用下面的方式二。

**方式二：部署到云端（推荐）**

部署到 Cloudflare 后，写作页变成「🚀 发布到云端」一键发布，全站即时可见。详细小白向步骤见下一节。

---

## ☁️ 部署到云端（推荐，小白向教程）

> 目标：把博客部署到 **Cloudflare Workers**，数据存 **Cloudflare KV**。全程无需命令行（配好 GitHub Secrets 后每次推送自动部署）。
>
> 需要准备：一个 GitHub 账号 + 一个 Cloudflare 账号（免费版即可）。

### 第 0 步：Fork / 克隆项目到你的 GitHub

- 有 GitHub 账号：**Fork** 本仓库到你的名下（或 `Use this template` 建新仓库）。
- 隐私考虑：仓库建议设为 **Private**（敏感配置全走 Secrets，不落仓库也行）。

### 第 1 步：创建存储 —— KV（备用）+ D1（主存储）

数据现在主存 **D1**（SQLite），原 KV 命名空间保留作备用/回滚，两者都建：

**① KV 命名空间（备用）**

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → 左侧 **Workers & Pages**
2. 右上角 **Create application** → 切到 **KV** 标签页
3. **Namespace name** 填 **`BLOG`**（代码里写死了这个变量名）→ **Create**
4. 记下列表里的 **namespace ID**（一串 32 位十六进制，如 `a1b2c3d4...`）

> 也可以用命令行创建：`npx wrangler kv namespace create BLOG`

**② D1 数据库（主存储）**

1. Dashboard → **Workers & Pages → D1 SQL Database → Create**，名字填 **`blog`**（与配置文件一致）
2. 点进刚建的数据库，详情页有 **Database ID**——**UUID 格式**（如 `0fa366ac-f04a-4be2-8e11-5adc6ee6d686`），复制整串含连字符
3. 建表不用手动做——CI 部署时会自动执行 `migrations/0001_init.sql`（幂等，可重复跑）

> 命令行方式：`npx wrangler d1 create blog`（输出里的 database_id 即所需）；
> 忘了可随时用 `npx wrangler d1 info blog` 查看。
> ⚠️ 注意：要的是 **database_id（UUID）**，不是数据库名 `blog`，也不是 KV 的 namespace ID。

### 第 2 步：配置 GitHub Secrets（敏感数据不进仓库）

GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名称 | 值 | 必填 |
| --- | --- | --- |
| `BLOG_KV_ID` | 第 1 步①记下的 KV 命名空间 ID（备用绑定） | ✅ |
| `BLOG_D1_ID` | 第 1 步②记下的 D1 database ID（UUID 格式，主存储） | ✅ |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（权限：Workers / KV / D1 编辑） | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare 账户 ID（Dashboard 右上角 URL 里那串） | ✅ |
| `PAGES_PROJECT_NAME` | （可选）自定义 worker 名；**不设置 = 用配置文件里的名字** | 可选 |
| `BLOG_ADMIN_SETUP_KEY` | （建议）一次性管理员密码设置密钥，防抢注 | 建议 |
| `BLOG_WRITE_TOKEN` | （可选）旧式写入令牌，脚本自动化用 | 可选 |

生成 API Token：Cloudflare Dashboard → **My Profile → API Tokens → Create Token**，选模板 **Edit Cloudflare Workers**，账户权限按需放宽到 KV。

### 第 3 步：推送，自动部署

推送到 `main` 分支 → GitHub Actions 自动运行「Deploy to Cloudflare Workers」：检查 Secrets 齐全 → 替换 KV / D1 ID → 应用 D1 表结构（幂等）→ `wrangler deploy` → 把可选密钥写入运行时 Secret。

> 部署进度看：仓库 **Actions** 标签页（每次约 1–3 分钟，绿色 ✓ 即成功）。
>
> 也可以用命令行手动部署（需先本地替换 KV 占位符）：
> ```bash
> npx wrangler deploy -c wrangler.workers.toml
> ```

### 第 4 步：验证部署

浏览器访问（把域名换成你的，worker 名默认取自 `wrangler.workers.toml` 的 `name`，域名格式 `<worker名>.<账户子域>.workers.dev`）：

```
https://<你的域名>/api/posts
```

- 返回 `{"ok":true,"posts":[...]}` → ✅ 成功，继续下一步
- 返回 `{"error":"数据库未配置…"}` → ❌ D1 绑定没生效，检查第 1 步② 的 database ID 是否正确填进 `BLOG_D1_ID`

### 第 4.5 步：把旧 KV 数据迁到 D1（仅从旧版本升级时需要）

首次切到 D1 后，线上旧文章/评论/统计还在 KV 里。用仓库自带脚本一次性搬过来（幂等，可重复执行）：

```bash
# 先 dry-run 预览生成的 SQL（不写库）
CLOUDFLARE_ACCOUNT_ID=你的账户ID \
CLOUDFLARE_API_TOKEN=你的Token \
BLOG_KV_ID=旧KV命名空间ID \
node scripts/migrate-kv-to-d1.mjs --dry-run

# 确认无误后正式迁移（需再加 BLOG_D1_ID）
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... BLOG_KV_ID=... BLOG_D1_ID=... \
node scripts/migrate-kv-to-d1.mjs
```

迁完刷新首页即可看到旧文章。管理员密码也会一并迁移；KV 原数据保留不动，随时可回滚。

### 第 5 步：首次设置管理员密码（一次性）

部署后**任何人都可能抢先设置管理密码**，所以必须用一次性密钥初始化。在你**自己的电脑**上执行（把 URL 换成你的站点，`SETUP_KEY` 换成第 2 步的 `BLOG_ADMIN_SETUP_KEY`）：

```bash
SETUP_KEY=你的BLOG_ADMIN_SETUP_KEY
curl -X POST https://<你的域名>/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: $SETUP_KEY" \
  -d '{"password":"你的强密码（至少8位，建议12位以上）"}'
```

返回 `201 {"ok":true,...}` 即成功。**设置成功后，建议从 GitHub Secrets 删除 `BLOG_ADMIN_SETUP_KEY`**（防止被再次调用）。

> 忘记密码？在 KV 控制台删除 `admin:auth` 键 → 重新配置 `BLOG_ADMIN_SETUP_KEY` → 重新执行本步。

### 第 6 步：开始写作

打开 `https://<你的域名>/admin` → 输入第 5 步设置的密码登录 → 写作页点「🚀 发布到云端」→ 文章全站可见 ✓

> 可选：导入示例文章 `node seed.js https://<你的域名>`（已存在的 ID 自动跳过）。

---

## ⚙️ 配置文件说明

所有站点配置都在 `public/config.js` 的 `window.BLOG_CONFIG` 里，改配置不用碰代码：

| 配置项 | 说明 | 示例 |
| --- | --- | --- |
| `mode` | `'auto'` 自动检测（推荐）/ `'static'` 强制静态 / `'api'` 强制云端 | `'auto'` |
| `pageSize` | 首页每页显示文章数；`0` = 不分页、全部显示（列表底部出现「上一页 / 下一页」） | `8` |
| `apiBase` | 后端 API 基础地址；留空 = 同源（Cloudflare 部署默认） | `''` |
| `siteUrl` | 站点对外地址，用于 RSS / Sitemap 链接 | `'https://blog.example.com'` |
| `adminPwd` | **仅静态模式**的本地门禁密码；云端模式请留空（密码在 Cloudflare 后端） | `''` |
| `writeToken` | （可选）旧式静态写入令牌 | `''` |
| `nav` | 自定义导航菜单，支持二级下拉、外链自动新窗口 | `[{text:'首页',url:'/'}]` |
| `footer` | 页脚：说明文字 / 友情链接（links）/ 备案号（icp）/ 站点声明（decl）/ 联系邮箱（email）/ 版权起始年与署名（startYear、copyrightName）。电脑端显示全部，移动端仅导航 + 版权 | `{links:[], decl:'', email:''}` |
| `ads` | 广告位（默认关闭）：首页上方 / 列表间隔 / 详情底部 | `{enabled:false}` |

> 换主题色：`public/style.css` 顶部 `:root` 里的 `--accent`。改博客名：`public/app.js` 的 `brand` 与 `public/index.html` 的 `<title>`。

---

## 📖 日常使用

### 路由（真实路径，无 hash）

| 页面 | 地址 |
| --- | --- |
| 首页 | `/` |
| 归档 | `/archive` |
| 关于 | `/about` |
| 标签 | `/tags` |
| 写作后台 | `/admin`（或 `/write`） |
| 文章详情 | `/posts/<文章别名>/` |
| 编辑文章 | `/posts/<文章别名>/edit` |
| RSS | `/api/feed.xml`（云端）或 `/feed.xml`（静态） |

- 文章 URL 统一为 `/posts/<别名>/`，别名即文章 ID，对 SEO 友好
- 本地 `file://` 双击时自动退化为 `#/` 内部路由，不影响使用

### 写作后台

- **日期**：支持精确到「日期 + 时分」的选择器
- **加密**：编辑页「置顶」一行最右侧的「🔒 加密」开关 + 访问密码输入框（见下节）
- **官方编辑器辅助**：工具栏「📝 官方编辑器」按钮可在新标签页打开 [markdown.com.cn/editor/](https://markdown.com.cn/editor/) 并带入当前内容，写完复制回来即可
- **发布**：云端点「🚀 发布到云端」；静态点「📥 保存文章」选中原 `posts.js` 覆盖
- **导入 .md**：支持带 `---` frontmatter 的 Markdown 文件

---

## 🔒 文章加密

- 写作页勾选「🔒 加密」并输入**文章访问密码** → 正文用 **PBKDF2 + AES-GCM（浏览器原生 Web Crypto）** 加密
- `posts.js` / KV / 导出文件里只有**密文**，没有明文（列表接口也屏蔽密文，防止泄密）
- 读者打开加密文章看到锁屏，输入密码解锁阅读；解锁只在本会话内有效（刷新需重新输入）
- 编辑加密文章：先在详情页解锁，再进入编辑即可看到明文修改；发布时会用当前密码重新加密
- 前端加密适合"防君子"场景；如需更强保护，配合私有部署不公开源码

---

## 🛡️ 安全设计

- **密码不明文存储**：管理员密码在云端只存 PBKDF2-SHA256 加盐哈希（100,000 次迭代）；即使 KV 泄露也无法直接还原
- **会话令牌**：前端只持有 32 字节随机 token（7 天有效），密码永不进 localStorage、永不返回前端
- **防暴力破解**：同一 IP 连续失败 5 次锁定 15 分钟
- **防抢注**：首次设置管理员密码必须用一次性密钥 `BLOG_ADMIN_SETUP_KEY`
- **安全默认**：所有写请求（新建 / 更新 / 删除）必须携带 `Authorization: Bearer` 会话令牌，否则一律 401
- **敏感数据不进仓库**：KV ID、API Token、密钥全部走 GitHub Secrets，部署时注入

> 备注：Cloudflare Workers 的 WebCrypto 对 PBKDF2 有 **100,000 次迭代上限**，本项目已按此设置。

---

## 🗂️ 项目结构

```
├── public/                     # 站点本体（静态资源目录）
│   ├── index.html              # 页面骨架（本地双击 / 部署入口）
│   ├── config.js               # 所有站点配置（见上方配置说明）
│   ├── style.css               # 样式（深色模式 + 响应式 + 全部组件）
│   ├── app.js                  # 全部逻辑（路由/列表/详情/写作/发布/评论/加密/搜索…）
│   ├── posts.js                # 静态模式的文章数据
│   ├── feed.xml                # 静态模式 RSS（可由写作页导出覆盖）
│   └── sitemap.xml             # 静态模式站点地图（可由写作页导出覆盖）
├── functions/                  # Cloudflare API（两种部署共用）
│   ├── api/                    # Pages Functions 路由
│   │   ├── posts.js            # GET 列表 / POST 新建
│   │   ├── posts/[id].js       # GET / PUT / DELETE 单篇
│   │   ├── posts/[id]/comments*.js   # 评论（公开发表 + 管理删除）
│   │   ├── posts/[id]/stats.js        # 阅读数 / 点赞
│   │   ├── admin/setup|login|logout.js  # 管理员认证
│   │   ├── feed.xml.js         # RSS 自动生成
│   │   └── sitemap.xml.js      # Sitemap 自动生成
│   └── _lib/api-core.js        # API 核心逻辑（KV 存储 + 鉴权 + 安全），两平台共用
├── worker.js                   # Cloudflare Workers 入口（API + 静态资源）
├── wrangler.toml               # Cloudflare Pages 配置（备选部署）
├── wrangler.workers.toml       # Cloudflare Workers 配置（主部署）
├── .github/workflows/deploy.yml# GitHub Actions 自动部署
├── seed.js                     # 把示例文章导入云端（node seed.js <站点>）
├── smoke-test.js               # 冒烟测试（node smoke-test.js）
└── README.md / README_EN.md    # 本说明（中 / 英）
```

---

## 🧪 测试与开发

```bash
node smoke-test.js    # 54 项回归测试：Markdown / TOC / 高亮 / 导入导出 / 门禁 /
                      # 归档 / 标签 / 评论 / 加密 / 统计 / 搜索 / RSS / Sitemap / 云端 API
```

无需任何依赖，Node.js 即可运行。前端为纯原生 JS（ES5 风格），无构建步骤。

---

## ❓ 常见问题

**Q：部署后 `/api/posts` 返回"KV 未配置"？**
A：KV 命名空间 ID 没写对 / 没部署成功。检查 `BLOG_KV_ID` Secret 是否为第 1 步的 32 位十六进制 ID，且部署日志正常。

**Q：为什么列表接口的文章没有正文？**
A：设计如此——列表只返回轻量摘要（不含正文/密文），打开文章时才**按需加载**全文，文章再多首页也不臃肿。

**Q：刷新文章详情页 404 / 卡加载？**
A：请硬刷新（`Ctrl+Shift+R`）清掉旧缓存；项目已内置动态 `<base>` 保证子路径页面资源正确加载。

**Q：静态模式发布后别人看不到？**
A：静态模式是"本机演示"模式（双击即开、数据在 `posts.js`）。要让互联网访问，请用**云端部署**（方式二）。

**Q：文章多了会变卡吗？**
A：不会。云端模式列表不带正文；静态模式 `posts.js` 整文件加载，适合百篇以内，更大规模建议切云端。

**Q：如何把云端数据备份到本地？**
A：写作页「⬇️ 备份 posts.js」可导出为带日期的本地备份文件。

**Q：其他设备怎么登录写作？**
A：打开 `https://<你的域名>/admin` 输入管理密码即可，会话 7 天有效（可手动退出）。

---

## 📄 许可证

[MIT](LICENSE)