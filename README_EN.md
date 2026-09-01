<p align="center">
  <img src="screenshots/home.png" alt="Qingyu'Blog" width="100%" />
</p>

<h1 align="center">Qingyu'Blog</h1>

<p align="center">
  <b>Zero framework 路 Zero build 路 Zero dependency 鈥?a personal blog you can open by double-clicking</b>
</p>

<p align="center">
  <a href="https://kejiland.azhz.workers.dev">
    <img src="https://img.shields.io/badge/Live%20Demo-kejiland.azhz.workers.dev-blue?style=flat-square" alt="Demo" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/Stack-Vanilla%20JS-orange?style=flat-square" alt="Vanilla JS" />
  <img src="https://img.shields.io/badge/Deploy-Cloudflare%20Workers-purple?style=flat-square" alt="Cloudflare Workers" />
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

## 馃搼 Table of Contents

- [馃摉 About](#-about)
- [鉁?Why Choose This](#-why-choose-this)
- [鉁?Features](#-features)
- [馃殌 Deployment](#-deployment)
- [鈽侊笍 Cloudflare Services](#锔?cloudflare-services)
- [鈿欙笍 Configuration](#锔?configuration)
- [馃洝锔?Security](#锔?security)
- [馃И Tests](#-tests)
- [馃柤锔?Screenshots](#锔?screenshots)
- [馃搫 License](#-license)

## 馃摉 About

Qingyu'Blog is a personal blog system built with **pure vanilla JavaScript** 鈥?no frameworks (React / Vue / Svelte), no build tools (Webpack / Vite), no third-party dependencies.

It runs in two modes:

| Mode | Description | Use Case |
| --- | --- | --- |
| **Static** | Double-click `index.html`, data in browser localStorage | Local writing, quick preview |
| **Cloud** | Deploy to Cloudflare Workers + D1, data in cloud database | Production, public access |

The entire site lives in `public/`: frontend `index.html` + `style.css` + `app.js` + `posts.js`, admin `admin.js` + `admin.css`, i18n `i18n.js` + `locales/`. No third-party runtime is required.

> 馃挕 The root `index.html` is just a redirect that opens `public/index.html` (the Cloudflare Pages / Workers deploy directory). Double-clicking `public/index.html` locally works the same.

---

## 鉁?Why Choose This

| Advantage | Description |
| --- | --- |
| **Zero barrier** | No Node.js, no npm, no build steps 鈥?just double-click to run |
| **Zero cost** | Cloudflare Workers + D1 free tier is more than enough for a personal blog |
| **Zero dependency** | No third-party libraries, fully controllable codebase, blazing fast |
| **Zero lock-in** | Posts are Markdown files, portable to any platform anytime |
| **Dual channel** | Static export + Cloud API, same codebase two deployment options |
| **Responsive** | Frontend + admin panel, fully adapted for phone / tablet / desktop |
| **Multilingual** | Built-in Chinese / English / 鏃ユ湰瑾?/ 頃滉淡鞏?/ 啶灌た啶ㄠ啶︵ UI, auto-detects browser language |
| **Serif aesthetics** | Four-tier serif font stack (Source Han Serif / GenYo Mincho / Dream Han Serif / Zhuque Fangsong) |
| **Secure** | PBKDF2 + AES-GCM encryption, hashed passwords, session token auth, Origin / CORS validation |

---

## 馃搧 Directory Structure

```
鈹溾攢鈹€ public/                          # Site assets (static, deploy directory)
鈹?  鈹溾攢鈹€ index.html                   # Entry point (double-click / deploy)
鈹?  鈹溾攢鈹€ config.js                    # Site config (footer / ads / mode / language)
鈹?  鈹溾攢鈹€ style.css                    # Frontend styles (dark mode + responsive + 4-tier serif)
鈹?  鈹溾攢鈹€ app.js                       # Frontend logic (routing / comments / encryption / search / i18n / theme)
鈹?  鈹溾攢鈹€ admin.js                     # Admin panel SPA (dashboard / posts / comments / settings)
鈹?  鈹溾攢鈹€ admin.css                    # Admin styles (responsive layout)
鈹?  鈹溾攢鈹€ i18n.js                      # i18n module (zh/en/ja/ko/hi, with Chinese fallback)
鈹?  鈹溾攢鈹€ posts.js                     # Static mode post data (generated by "Export posts.js")
鈹?  鈹溾攢鈹€ locales/                     # Language packs (zh-CN / en / ja / ko / hi)
鈹?  鈹溾攢鈹€ fonts/dreamserif/            # Local split serif font (Dream Han Serif CN / QY-Display)
鈹?  鈹溾攢鈹€ feed.xml                     # Static RSS (optional; generated by API in cloud)
鈹?  鈹溾攢鈹€ sitemap.xml                  # Static Sitemap (optional)
鈹?  鈹溾攢鈹€ robots.txt                   # Crawler rules (blocks admin, declares Sitemap)
鈹?  鈹斺攢鈹€ _redirects                   # Cloudflare Pages routes (SPA fallback + /public redirect)
鈹溾攢鈹€ functions/                       # Cloudflare API (shared by Pages Functions / Workers)
鈹?  鈹溾攢鈹€ api/
鈹?  鈹?  鈹溾攢鈹€ posts.js                 # Posts CRUD
鈹?  鈹?  鈹溾攢鈹€ posts/[id]/
鈹?  鈹?  鈹?  鈹溾攢鈹€ index.js             # Single post (GET / PUT / DELETE)
鈹?  鈹?  鈹?  鈹溾攢鈹€ comments.js          # Post comments (GET / POST, nested replies)
鈹?  鈹?  鈹?  鈹溾攢鈹€ comments/[cid].js    # Single comment delete (admin)
鈹?  鈹?  鈹?  鈹斺攢鈹€ stats.js             # View / like stats
鈹?  鈹?  鈹溾攢鈹€ comments.js              # Global comment list (admin)
鈹?  鈹?  鈹溾攢鈹€ comments/[id].js         # Comment approve / delete
鈹?  鈹?  鈹溾攢鈹€ media.js                 # Media library
鈹?  鈹?  鈹溾攢鈹€ media/[id].js            # Media delete
鈹?  鈹?  鈹溾攢鈹€ settings.js              # Site settings
鈹?  鈹?  鈹溾攢鈹€ site-files/              # Site artifacts (feed.xml / sitemap.xml / posts.js)
鈹?  鈹?  鈹?  鈹溾攢鈹€ index.js             # List / save artifacts
鈹?  鈹?  鈹?  鈹斺攢鈹€ [name].js            # Download artifact content
鈹?  鈹?  鈹溾攢鈹€ admin/
鈹?  鈹?  鈹?  鈹溾攢鈹€ setup.js             # First-time password setup
鈹?  鈹?  鈹?  鈹溾攢鈹€ login.js             # Password login
鈹?  鈹?  鈹?  鈹溾攢鈹€ logout.js            # Logout
鈹?  鈹?  鈹?  鈹斺攢鈹€ password.js          # Change password
鈹?  鈹?  鈹溾攢鈹€ stats/trend.js           # 30-day trend data
鈹?  鈹?  鈹溾攢鈹€ feed.xml.js              # RSS generation
鈹?  鈹?  鈹斺攢鈹€ sitemap.xml.js           # Sitemap generation
鈹?  鈹斺攢鈹€ _lib/
鈹?      鈹斺攢鈹€ api-core.js              # API core logic (D1 + auth + security)
鈹溾攢鈹€ worker.js                        # Cloudflare Workers entry (route dispatch)
鈹溾攢鈹€ migrations/                      # D1 database migrations (auto-applied by CI, idempotent)
鈹?  鈹溾攢鈹€ 0001_init.sql                # Base tables
鈹?  鈹溾攢鈹€ 0002_site_files.sql          # Site file storage
鈹?  鈹溾攢鈹€ 0003_cover_column.sql        # Cover image field
鈹?  鈹溾攢鈹€ 0004_post_meta.sql           # Category / status fields
鈹?  鈹溾攢鈹€ 0005_comment_status.sql      # Comment moderation status
鈹?  鈹溾攢鈹€ 0006_media.sql              # Media library table
鈹?  鈹溾攢鈹€ 0007_settings.sql            # Site settings table
鈹?  鈹溾攢鈹€ 0008_stats_daily.sql         # Daily stats table
鈹?  鈹溾攢鈹€ 0009_comment_status_index.sql # Comment status index
鈹?  鈹溾攢鈹€ 0010_admin_must_change.sql   # Forced password change flag
鈹?  鈹溾攢鈹€ 0011_comment_reply.sql       # Comment reply parent_id field
鈹?  鈹斺攢鈹€ 0012_clear_orphaned_nav.sql  # Clean up legacy nav config
鈹溾攢鈹€ scripts/
鈹?  鈹斺攢鈹€ migrate-kv-to-d1.mjs         # One-off migration: KV data 鈫?D1
鈹溾攢鈹€ .github/workflows/
鈹?  鈹溾攢鈹€ deploy.yml                   # GitHub Actions auto-deploy to Workers
鈹?  鈹斺攢鈹€ migrate-kv-to-d1.yml         # Manual KV 鈫?D1 migration
鈹溾攢鈹€ seed.js                          # Import sample posts into the cloud API
鈹溾攢鈹€ _addtheme.py                     # Historical script: inject theme toggle (already in source, no need to run)
鈹溾攢鈹€ wrangler.toml                    # Cloudflare Pages config
鈹溾攢鈹€ wrangler.workers.toml            # Cloudflare Workers config
鈹溾攢鈹€ smoke-test.js                    # Smoke tests
鈹溾攢鈹€ README.md                        # 涓枃璇存槑
鈹斺攢鈹€ README_EN.md                     # English docs
```

---

## 鉁?Features

### Frontend

| Feature | Description |
| --- | --- |
| Real-path routing | No hash: `/`, `/archive`, `/about`, `/tags`, `/posts/<alias>/`, `/admin`, `/write` 鈥?no 404 on refresh |
| Markdown Editor | Live preview, one-click toolbar, word count, autosaved drafts |
| Article Encryption | PBKDF2 + AES-GCM end-to-end, only ciphertext stored |
| Comments | Cloud D1 global comments + moderation; static mode localStorage; **nested replies** |
| Site Search | Real-time matching of title / tags / excerpt |
| TOC | Auto-generated with anchor jumps; syntax highlighting |
| Read Stats | Views / likes (cloud-global / local) |
| Featured Articles | Auto-recommended below comments (likes脳3 + views + comments脳5) |
| RSS / Sitemap | Auto-generated, encrypted posts excluded |
| Prev/Next | Hides empty slot when only one direction exists |
| Card List | Cover thumbnails, pin badge, tags pinned to bottom |
| Dark / Light Theme | One-click toggle, responsive multi-breakpoint |
| Multilingual UI | Chinese / English / 鏃ユ湰瑾?/ 頃滉淡鞏?/ 啶灌た啶ㄠ啶︵, auto-detect + manual switch |
| Four-tier serif | Body Source Han Serif 路 headings GenYo Mincho 路 display Dream Han Serif 路 quotes Zhuque Fangsong |

### Admin Panel

| Feature | Description |
| --- | --- |
| Dashboard | 7 stat cards + 30-day visits / comments trend charts |
| Post Management | Search / category filter / pagination / pin toggle / encrypt toggle |
| Editor | Markdown live preview + category / tags / cover / pin / encrypt |
| Comment Management | Global comment list, approve / delete, reply-chain tracing |
| Category / Tag Management | Rename / delete (bulk update all related articles) |
| Media Library | Image upload (base64 to D1) |
| Blog Settings | Site info / profile / navigation menu |
| One-click Export | Export posts.js / feed.xml / sitemap.xml together, overwrite to publish |
| Responsive | Fixed sidebar on desktop, drawer navigation on mobile |

---

## 馃殌 Deployment

### Option 1: Local Static

```bash
git clone https://github.com/kejiland/blog.git
cd blog
```

Double-click `public/index.html`, or start a local server:

```bash
# Python
python -m http.server 8080 -d public

# Node.js
npx serve public
```

Open `http://localhost:8080/admin`, set a password and start writing.

### Option 2: Cloudflare Workers (Recommended)

#### 1. Prerequisites



- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`

#### 2. Create Cloudflare Resources

```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database (primary storage: posts / comments / stats / passwords)
npx wrangler d1 create blog
# Save the database_id (a UUID 鈥?not the DB name, not the KV id)

# Create KV namespace (backup binding)
npx wrangler kv namespace create BLOG
# Save the id (32 hex chars)
```

#### 3. Configure GitHub Secrets

Add in repo Settings 鈫?Secrets and variables 鈫?Actions:

| Secret | Required | Description |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | 鉁?| Cloudflare API Token (Workers + D1 + KV permissions) |
| `CLOUDFLARE_ACCOUNT_ID` | 鉁?| Cloudflare Account ID (visible on Dashboard sidebar) |
| `BLOG_D1_ID` | 鉁?| D1 Database ID (from step 2, UUID format) |
| `BLOG_KV_ID` | 鉁?| KV Namespace ID (from step 2, 32 hex chars) |
| `BLOG_ADMIN_SETUP_KEY` | Recommended | One-time key for first admin password setup (anti-squatting) |
| `SITE_URL` | Recommended | Public domain, e.g. `https://blog.example.com` (tightens CORS / RSS / Sitemap) |
| `CF_ZONE_ID` | Optional | Custom domain Zone ID (enables cache purge on publish) |

#### 4. Deploy

Push to `main` branch, GitHub Actions will automatically:

1. 鉁?Validate required Secrets
2. 鉁?Run D1 migrations (create tables + add columns, ordered & idempotent)
3. 鉁?Deploy Worker to Cloudflare
4. 鉁?Write runtime Secrets (`BLOG_ADMIN_SETUP_KEY`, etc.)

After deployment, visit `https://<worker-name>.<subdomain>.workers.dev/admin`:
- If `BLOG_ADMIN_SETUP_KEY` is set, use it to set the admin password the first time;
- Otherwise a random default password is auto-generated and you must change it on first login.

#### 5. Migrate from KV to D1 (legacy data)

If you previously used KV single-key storage, run the migration workflow to move data into D1:

```bash
# Local (requires CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / BLOG_KV_ID / BLOG_D1_ID)
node scripts/migrate-kv-to-d1.mjs --dry-run   # preview SQL only
node scripts/migrate-kv-to-d1.mjs             # write to D1
```

Or manually trigger the `Migrate KV to D1` workflow in the repo Actions tab (repo Secrets auto-injected; supports `dry-run` / `migrate` modes).

---

## 鈽侊笍 Cloudflare Services

### Workers

Workers is Cloudflare's edge computing platform. This project uses it to run the backend API:

- **Entry**: `worker.js` (route dispatch) + `functions/` (Pages Functions)
- **Assets**: `public/` directory served via Workers `[assets]` binding
- **Compatibility date**: `2025-02-01`

**Key wrangler.workers.toml config**:

```toml
name = "kejiland"
main = "worker.js"

[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"  # SPA fallback
html_handling = "auto-trailing-slash"

[[kv_namespaces]]
binding = "BLOG"
id = "{env.BLOG_KV_ID}"

[[d1_databases]]
binding = "DB"
database_name = "blog"
database_id = "{env.BLOG_D1_ID}"
```

### KV (Key-Value Storage)

KV is used as a backup binding (largely replaced by D1). Current uses:

| Purpose | Description |
| --- | --- |
| Like dedup | `liked:{ip}:{postId}` 鈥?prevents like spam |
| File cache | feed.xml / sitemap.xml / posts.js caching |
| Cache purge | `purge:{tag}` 鈥?version control |

> 鈿狅笍 KV is **eventually consistent** (global propagation has delay). Not suitable for strong consistency needs. D1 is SQLite with strong consistency.

### D1 (SQLite Database)

D1 is Cloudflare's edge SQLite database 鈥?the **primary storage** for this project:

| Table | Description | Key Fields |
| --- | --- | --- |
| `posts` | Articles | id, title, content, cover, pinned, protected, enc, tags, category, status |
| `comments` | Comments | id, post_id, author, content, date, status (approved/pending), **parent_id** (reply) |
| `stats` | Views/likes | post_id, views, likes |
| `admin_auth` | Admin password | k, salt, hash, iter, must_change |
| `admin_sessions` | Login sessions | token, exp |
| `admin_fails` | Rate limiting | ip, n, until |
| `media` | Media library | id, name, url, type, size |
| `site_settings` | Site config | k, v (key-value) |
| `site_files` | Site artifacts | name, content, updated_at (feed/sitemap/posts.js) |
| `stats_daily` | Daily stats | post_id, date, views, likes |

---

## 鈿欙笍 Configuration

### config.js

```javascript
window.BLOG_CONFIG = {
  // ====== Basic ======
  mode: 'auto',           // 'auto' | 'static' | 'api'
  apiBase: '',            // API base URL, empty = same origin
  siteUrl: '',            // Public site URL (for RSS/Sitemap)
  writeToken: '',         // Legacy write token (use login instead)
  pageSize: 5,            // Posts per page (0 = no pagination)
  adminPwd: '',           // Static mode local password (leave empty for cloud)

  // Navigation items live in public/app.js (NAV array, single source of truth)

  // ====== Footer ======
  footer: {
    text: '',
    icp: '',               // ICP filing number
    contact: [],           // Contact links
    links: [],             // Friendly links
    decl: '',              // Site declaration
    email: '',             // Contact email
    startYear: 2019,       // Copyright start year
    copyrightName: "Qingyu'Blog"
  },

  // ====== Ads ======
  ads: {
    enabled: false,
    belowSearch: '',       // Above post list
    between: '',           // Between posts
    betweenEvery: 3,       // Every N posts
    content: ''            // Article detail bottom
  }
};
```

### mode Options

| Value | Behavior |
| --- | --- |
| `'auto'` | **Recommended**. Auto-detect: `/api/posts` succeeds 鈫?cloud; fails 鈫?static |
| `'static'` | Force static mode, posts.js only |
| `'api'` | Force cloud mode, requires backend API |

### Multilingual (i18n)

`i18n.js` ships 5 languages (Chinese / English / 鏃ユ湰瑾?/ 頃滉淡鞏?/ 啶灌た啶ㄠ啶︵). It auto-detects `navigator.language` by default with a manual switcher. Language packs live in `public/locales/<lang>.json` (Chinese is also embedded as a fallback so core text stays readable under `file://` local preview).

---

## 馃洝锔?Security

| Layer | Mechanism |
| --- | --- |
| Password storage | PBKDF2-SHA256 salted hash (100,000 iterations), never plaintext |
| First deploy | Auto-generated random default password (or `BLOG_ADMIN_SETUP_KEY`), forced change on first login |
| Static mode | Passwords stored as SHA-256 hashes (backward-compatible, auto-upgraded) |
| Session management | Random Token (32-byte hex), 7-day expiry, destroyed on logout |
| Rate limiting | 5 consecutive failures from same IP = 15-minute lockout |
| Article encryption | PBKDF2 + AES-GCM end-to-end, ciphertext only on server |
| Comment security | XSS escaping + parameterized queries + per-IP rate limit + Origin validation |
| API boundary | Unknown /api/* returns JSON 404, never falls back to index.html |
| CORS | With `SITE_URL` set, only same-origin allowed; else echoes request origin |

---

## 馃И Tests

```bash
node smoke-test.js
```

Covers: Markdown rendering, TOC, syntax highlighting, import/export, admin gate, pinning, archive, tags, comment security, encryption, stats, search, RSS, Sitemap, cloud APIs, caching.

Import sample posts into a deployed cloud instance:

```bash
node seed.js https://your-blog.workers.dev [--token <session or write token>]
```

---

## 馃柤锔?Screenshots

| Home (light) | Article | Editor |
| --- | --- | --- |
| ![Home](screenshots/home.png) | ![Article](screenshots/detail.png) | ![Editor](screenshots/write.png) |

| Admin 路 Dashboard | Comments | Mobile |
| --- | --- | --- |
| ![Dashboard](screenshots/admin.png) | ![Comments](screenshots/admin-list.png) | ![Mobile](screenshots/mobile.png) |

### Serif font preview

| Home (light) | Article (light) | Article (dark) |
| --- | --- | --- |
| ![Home light](screenshots/font-preview/home-light.png) | ![Article light](screenshots/font-preview/article-light.png) | ![Article dark](screenshots/font-preview/article-dark.png) |

---

## 馃搫 License

[MIT](LICENSE)

---

<p align="center">
  If Qingyu'Blog helps you, feel free to 猸?Star / Fork, or open an <a href="https://github.com/kejiland/blog/issues">Issue</a>.
</p>

<p align="center">
  <b>If you find this project useful, please give it a 猸?Star 鈥?it helps others discover it!</b>
</p>