<p align="center">
  <img src="screenshots/home.png" alt="Qingyu'Blog" width="100%">
</p>

<h1 align="center">Qingyu'Blog</h1>

<p align="center">
  <b>Zero framework · Zero build · Zero dependency — a personal blog you can open by double-clicking</b>
</p>

<p align="center">
  <a href="https://kejiland.azhz.workers.dev">
    <img src="https://img.shields.io/badge/Live%20Demo-kejiland.azhz.workers.dev-blue?style=flat-square" alt="Demo">
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
  <img src="https://img.shields.io/badge/Stack-Vanilla%20JS-orange?style=flat-square" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Deploy-Cloudflare%20Workers-purple?style=flat-square" alt="Cloudflare Workers">
</p>

---

## 📖 About

Qingyu'Blog is a personal blog system built with **pure vanilla JavaScript** — no frameworks (React / Vue / Svelte), no build tools (Webpack / Vite), no third-party dependencies.

It runs in two modes:

| Mode | Description | Use Case |
| --- | --- | --- |
| **Static** | Double-click `index.html`, data in browser localStorage | Local writing, quick preview |
| **Cloud** | Deploy to Cloudflare Workers + D1, data in cloud database | Production, public access |

The entire blog = **4 core files** (`index.html` + `style.css` + `app.js` + `posts.js`), plus admin panel (`admin.js` + `admin.css`).

---

## ✅ Why Choose This

| Advantage | Description |
| --- | --- |
| **Zero barrier** | No Node.js, no npm, no build steps — just double-click to run |
| **Zero cost** | Cloudflare Workers + D1 free tier is more than enough for a personal blog |
| **Zero dependency** | No third-party libraries, fully controllable codebase, blazing fast |
| **Zero lock-in** | Posts are Markdown files, portable to any platform anytime |
| **Dual channel** | Static export + Cloud API, same codebase two deployment options |
| **Responsive** | Frontend + admin panel, fully adapted for phone / tablet / desktop |
| **Secure** | PBKDF2 + AES-GCM encryption, hashed passwords, session token auth |

---

## 📁 Directory Structure

```
├── public/                          # Site assets (static)
│   ├── index.html                   # Entry point (double-click / deploy)
│   ├── config.js                    # Site config (nav / footer / ads / mode)
│   ├── style.css                    # Frontend styles (dark mode + responsive)
│   ├── app.js                       # Frontend logic (routing / comments / encryption / search)
│   ├── admin.js                     # Admin panel SPA (dashboard / posts / comments / settings)
│   ├── admin.css                    # Admin styles (responsive layout)
│   └── posts.js                     # Static mode post data
├── functions/                       # Cloudflare API (shared by Pages Functions / Workers)
│   ├── api/
│   │   ├── posts.js                 # Posts CRUD
│   │   ├── posts/[id]/
│   │   │   ├── index.js             # Single post (GET / PUT / DELETE)
│   │   │   ├── comments.js          # Post comments (GET / POST)
│   │   │   └── stats.js             # View / like stats
│   │   ├── comments.js              # Global comment list (admin)
│   │   ├── comments/[id].js         # Comment approve / delete
│   │   ├── media.js                 # Media library
│   │   ├── media/[id].js            # Media delete
│   │   ├── settings.js              # Site settings
│   │   ├── admin/
│   │   │   ├── setup.js             # First-time password setup
│   │   │   ├── login.js             # Password login
│   │   │   ├── logout.js            # Logout
│   │   │   └── password.js          # Change password
│   │   ├── stats/trend.js           # 30-day trend data
│   │   ├── feed.xml.js              # RSS generation
│   │   └── sitemap.xml.js           # Sitemap generation
│   └── _lib/
│       └── api-core.js              # API core logic (D1 + auth + security)
├── worker.js                        # Cloudflare Workers entry (route dispatch)
├── migrations/                      # D1 database migrations (auto-applied by CI)
│   ├── 0001_init.sql                # Base tables
│   ├── 0002_site_files.sql          # Site file storage
│   ├── 0003_cover_column.sql        # Cover image field
│   ├── 0004_post_meta.sql           # Category / status fields
│   ├── 0005_comment_status.sql      # Comment moderation status
│   ├── 0006_media.sql               # Media library table
│   ├── 0007_settings.sql            # Site settings table
│   ├── 0008_stats_daily.sql         # Daily stats table
│   ├── 0009_comment_status_index.sql # Comment status index
│   └── 0010_admin_must_change.sql   # Forced password change flag
├── .github/workflows/deploy.yml     # GitHub Actions auto-deploy
├── wrangler.toml                    # Cloudflare Pages config
├── wrangler.workers.toml            # Cloudflare Workers config
├── smoke-test.js                    # Smoke tests
├── README.md                        # 中文说明
└── README_EN.md                     # English docs
```

---

## ✨ Features

### Frontend

| Feature | Description |
| --- | --- |
| Markdown Editor | Live preview, one-click toolbar, word count, autosaved drafts |
| Article Encryption | PBKDF2 + AES-GCM end-to-end, only ciphertext stored |
| Comments | Cloud D1 global comments + moderation; static mode localStorage |
| Site Search | Real-time matching of title / tags / excerpt |
| TOC | Auto-generated with anchor jumps; syntax highlighting |
| Read Stats | Views / likes (cloud-global / local) |
| Featured Articles | Auto-recommended below comments (likes×3 + views + comments×5) |
| RSS / Sitemap | Auto-generated, encrypted posts excluded |
| Prev/Next | Hides empty slot when only one direction exists |
| Card List | Cover thumbnails, pin badge, tags pinned to bottom |
| Dark / Light Theme | One-click toggle, responsive multi-breakpoint |

### Admin Panel

| Feature | Description |
| --- | --- |
| Dashboard | 7 stat cards + 30-day trend charts |
| Post Management | Search / category filter / pagination / pin toggle / encrypt toggle |
| Editor | Markdown live preview + category / tags / cover / pin / encrypt |
| Comment Management | Global comment list, approve / delete |
| Category / Tag Management | Rename / delete (bulk update all related articles) |
| Media Library | Image upload (base64 to D1) |
| Blog Settings | Site info / profile / navigation menu (visual + JSON) |
| Responsive | Fixed sidebar on desktop, drawer navigation on mobile |

---

## 🚀 Deployment

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
# Save the database_id from output

# Create KV namespace (backup binding)
npx wrangler kv namespace create BLOG
# Save the id from output
```

#### 3. Configure GitHub Secrets

Add in repo Settings → Secrets and variables → Actions:

| Secret | Required | Description |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API Token (Workers + D1 + KV permissions) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare Account ID (visible on Dashboard sidebar) |
| `BLOG_D1_ID` | ✅ | D1 Database ID (from step 2) |
| `BLOG_KV_ID` | ✅ | KV Namespace ID (from step 2) |
| `SITE_URL` | Recommended | Public domain, e.g. `https://blog.example.com` (for RSS/Sitemap) |
| `CF_ZONE_ID` | Optional | Custom domain Zone ID (enables cache purge on publish) |

#### 4. Deploy

Push to `main` branch, GitHub Actions will automatically:

1. ✅ Run D1 migrations (create tables + add columns)
2. ✅ Deploy Worker to Cloudflare
3. ✅ Auto-initialize random default password on first login

After deployment, visit `https://<worker-name>.<subdomain>.workers.dev/admin` to start writing.

---

## ☁️ Cloudflare Services

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
| Like dedup | `liked:{ip}:{postId}` — prevents like spam |
| File cache | feed.xml / sitemap.xml / posts.js caching |
| Cache purge | `purge:{tag}` — version control |

> ⚠️ KV is **eventually consistent** (global propagation has delay). Not suitable for strong consistency needs. D1 is SQLite with strong consistency.

### D1 (SQLite Database)

D1 is Cloudflare's edge SQLite database — the **primary storage** for this project:

| Table | Description | Key Fields |
| --- | --- | --- |
| `posts` | Articles | id, title, content, cover, pinned, protected, enc, tags, category, status |
| `comments` | Comments | id, post_id, author, content, date, status (approved/pending) |
| `stats` | Views/likes | post_id, views, likes |
| `admin_auth` | Admin password | k, salt, hash, iter, must_change |
| `admin_sessions` | Login sessions | token, exp |
| `admin_fails` | Rate limiting | ip, n, until |
| `media` | Media library | id, name, url, type, size |
| `site_settings` | Site config | k, v (key-value) |
| `stats_daily` | Daily stats | post_id, date, views, likes |

---

## ⚙️ Configuration

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

  // ====== Navigation ======
  nav: [
    { text: 'Home', url: '/' },
    { text: 'Archive', url: '/archive' },
    { text: 'Tags', url: '/tags' },
    { text: 'About', url: '/about' },
    // Nested menu supported:
    // { text: 'More', children: [
    //   { text: 'Example', url: '/about' },
    //   { text: 'External', url: 'https://example.com' }
    // ]}
  ],

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
| `'auto'` | **Recommended**. Auto-detect: `/api/posts` succeeds → cloud; fails → static |
| `'static'` | Force static mode, posts.js only |
| `'api'` | Force cloud mode, requires backend API |

---

## 🛡️ Security

| Layer | Mechanism |
| --- | --- |
| Password storage | PBKDF2-SHA256 salted hash (100,000 iterations), never plaintext |
| First deploy | Auto-generated random default password, forced change on first login |
| Static mode | Passwords stored as SHA-256 hashes (backward-compatible with old plaintext, auto-upgraded) |
| Session management | Random Token (32-byte hex), 7-day expiry, destroyed on logout |
| Rate limiting | 5 consecutive failures from same IP = 15-minute lockout |
| Article encryption | PBKDF2 + AES-GCM end-to-end, ciphertext only on server |
| Comment security | XSS escaping + parameterized queries + per-IP rate limit + Origin validation |

---

## 🧪 Tests

```bash
node smoke-test.js
```

Covers: Markdown rendering, TOC, syntax highlighting, import/export, admin gate, pinning, archive, tags, comment security, encryption, stats, search, RSS, Sitemap, cloud APIs, caching.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  If Qingyu'Blog helps you, feel free to ⭐ Star / Fork, or open an <a href="https://github.com/kejiland/blog/issues">Issue</a>.
</p>
