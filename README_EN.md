# Qingyu'Blog · A native-JS blog you can open by double-clicking

> Zero framework · Zero build step · Zero dependency — a personal blog that **works by double-clicking `index.html`**, or deploy to Cloudflare for free cloud hosting.
>
> 🚀 Live demo: **[kejiland.azhz.workers.dev](https://kejiland.azhz.workers.dev)**

---

## Why you should try it

Most blogging tools require Node + build steps (Hexo / Hugo) or a server + database (WordPress / CMS). **Qingyu'Blog is different**:

```
📂 The entire blog = one folder = 4 files
   index.html + style.css + app.js + posts.js
```

- ✅ **Double-click to open**: download, double-click `index.html`, start reading & writing — fully offline, no `npm install`
- ✅ **Free cloud hosting**: deploy to Cloudflare Workers + D1 (free tier), auto-deployed on every `git push`
- ✅ **Feature-complete**: editor / comments / encryption / search / tags / archive / RSS / read stats — all built in
- ✅ **Vanilla tech**: pure HTML/CSS/JS + native Web APIs (Web Crypto, localStorage) — no framework at all
- ✅ **Your data, your rules**: posts are plain Markdown files, portable forever, never locked into a platform

---

## ✨ Features

### 📝 Writing & Publishing

- **Markdown editor**: live preview, one-click toolbar inserts, word count, autosaved drafts (survive closing the tab)
- **Dual publishing**: static mode exports `posts.js` and overwrite-in-place; cloud mode one-click "Publish to Cloud", instantly visible everywhere
- **Import .md**: supports `---` frontmatter (title / date / tags / excerpt / password)
- **List management**: toggle **pin / encrypt / delete** directly from the post list, no editor needed

### 🔒 Privacy & Security

- **Article encryption**: PBKDF2 + AES-GCM end-to-end; only ciphertext is stored (hidden from list APIs too); lock-screen reading with a password
- **Admin security**: passwords stored as PBKDF2-SHA256 salted hashes; 7-day session tokens; 5 failed attempts = 15-min IP lockout; one-time setup key prevents account squatting
- **Comment security**: full HTML escaping (anti-XSS), parameterized queries (anti-SQLi), per-IP rate limiting, Origin validation, control-character scrubbing, length caps, token-protected admin deletion

### 💬 Comments

- Cloud **D1 global comments** (shared across all visitors), admins can delete abusive ones
- Static mode stores comments in browser localStorage
- Consistent mobile & desktop experience

### 🧭 Reading Experience

- **Card list**: cover thumbnails (custom image / first image in body / themed placeholder), pin badge, tags pinned to the bottom
- **Responsive**: dark/light theme toggle, multi-breakpoint mobile adaptation (OPPO / Xiaomi / vivo / Huawei / iPhone)
- **Instant detail pages**: local cache + SWR background refresh — second visits open instantly
- **Site search**: expandable in the top bar, live matching of title / tags / excerpt
- **TOC**: auto-generated table of contents with anchor jumps; syntax highlighting for js / ts / python / bash / css / html / json
- **Read stats**: views / likes (cloud-global or local)
- **Archive / tag cloud / prev-next / copy-link**: all there

### 📡 Distribution

- **RSS + Sitemap** auto-generated (encrypted posts excluded), great for subscribers & search engines
- **Custom nav / footer / ad slots**: all driven by `config.js` — change config, not code
- Footer nav adapts to login state: regular users see RSS, admins see the editor link

---

## 🖼️ Screenshots

| Home (desktop) | Article (desktop) |
| --- | --- |
| ![Home](screenshots/home.png) | ![Article](screenshots/detail.png) |

| Home (mobile) | Admin (login gate) |
| --- | --- |
| ![Mobile](screenshots/mobile.png) | ![Admin](screenshots/admin.png) |

> Real screenshots of the live site. Try it now: <https://kejiland.azhz.workers.dev>

---

## 🚀 Quick Start

### Option 1: Local static (30-second demo, zero deployment)

```bash
git clone https://github.com/kejiland/blog.git
# or download the ZIP
```

Double-click `public/index.html` → click "✏️ Write" → set a password → start writing.

> In static mode there is no backend: "publish" = save the generated `posts.js` back into `public/` (overwrite the old one).

### Option 2: Deploy to Cloudflare (recommended, free)

1. Fork this repo to your GitHub
2. On Cloudflare, create a **D1 database** `blog` (primary storage) + a **KV namespace** `BLOG` (backup binding)
3. Add repo Secrets: `BLOG_D1_ID`, `BLOG_KV_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main` → GitHub Actions auto-runs: create tables → deploy → write secrets
5. Initialize the admin password with a one-time key → open `https://<your-domain>/admin` and start writing

**Secrets overview**:

| Secret | Purpose |
| --- | --- |
| `BLOG_D1_ID` | D1 database ID (UUID, primary storage) |
| `BLOG_KV_ID` | KV namespace ID (backup binding) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Workers / KV / D1 access) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `BLOG_ADMIN_SETUP_KEY` | (recommended) one-time admin password setup key, prevents squatting |

---

## 🧰 Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | Vanilla JavaScript (ES5-style, zero framework, zero dependency) |
| Cloud | Cloudflare Workers + D1 (SQLite) + KV (backup) |
| Deploy | GitHub Actions auto-deploy (push to go live) |
| Encryption | PBKDF2 + AES-GCM (browser-native Web Crypto) |
| Data | Markdown files (local) / D1 (cloud), dual channel |

---

## 🗂️ Project Structure

```
├── public/                      # The site itself (static assets)
│   ├── index.html               # Page shell (double-click / deploy entry)
│   ├── config.js                # All site config (nav / footer / ads …)
│   ├── style.css                # Styles (dark mode + responsive breakpoints)
│   ├── app.js                   # All logic (routing / editor / comments / encryption / search …)
│   └── posts.js                 # Static-mode post data (Markdown)
├── functions/                   # Cloudflare API (shared by Pages Functions / Workers)
│   ├── api/                     # Routes: posts / comments / stats / admin / feed / sitemap
│   └── _lib/api-core.js         # API core (D1 storage + auth + security)
├── worker.js                    # Cloudflare Workers entry
├── migrations/                  # D1 schema (applied automatically by CI)
├── .github/workflows/deploy.yml # Auto-deploy
├── smoke-test.js                # Smoke tests (node smoke-test.js)
└── README.md / README_EN.md     # Docs (CN / EN)
```

---

## 🧪 Tests

```bash
node smoke-test.js   # 68 regression tests, zero dependencies
```

Covers: Markdown rendering / TOC / syntax highlighting / import-export / admin gate / pinning / archive / tags / comments (incl. security hardening) / encryption / stats / search / RSS / Sitemap / cloud APIs / caching.

---

## 🛡️ Security at a Glance

- Admin passwords: PBKDF2-SHA256 salted hashes (100,000 iterations), never stored in plaintext
- Write operations: all require `Authorization: Bearer` session tokens, otherwise 401
- Comments: full XSS escaping · parameterized queries · per-IP rate limit (5/min) · Origin validation · control-character scrubbing · length caps
- Encryption: only ciphertext is stored, list APIs hide ciphertext, encrypted posts excluded from RSS
- Secrets: all via GitHub Secrets, never committed to the repo

---

## 📄 License

[MIT](LICENSE)

---

*If Qingyu'Blog helps you, feel free to ⭐ Star / Fork, or open an [Issue](https://github.com/kejiland/blog/issues).*
