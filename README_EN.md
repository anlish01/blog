# Light Blog 轻语博客

> English | [中文 README](README.md)

A **zero-dependency, out-of-the-box** lightweight personal blog. No framework, no build step, no `npm install` — **double-click to open**. Want cloud storage? Deploy to Cloudflare in minutes.

```
✅ Zero dependencies    Pure HTML/CSS/JS + native Web APIs — one folder is the whole site
✅ Dual modes           Local static (file:// double-click) / Cloud storage (Cloudflare KV), auto-detected
✅ Built-in editor      Markdown live preview, one-click publish, autosave drafts
✅ Security by design   Password hashes only in cloud, session tokens, rate limiting, article encryption
```

---

## Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start (30 seconds)](#-quick-start-30-seconds)
- [☁️ Deploy to Cloud (recommended, beginner tutorial)](#️-deploy-to-cloud-recommended-beginner-tutorial)
- [⚙️ Configuration](#️-configuration)
- [📖 Daily Usage](#-daily-usage)
- [🔒 Article Encryption](#-article-encryption)
- [🛡️ Security Design](#️-security-design)
- [🗂️ Project Structure](#️-project-structure)
- [🧪 Tests & Development](#-tests--development)
- [❓ FAQ](#-faq)
- [📄 License](#-license)

---

## ✨ Features

- 📝 **Markdown writing**: headings / lists / quotes / tables / code blocks / links / images, with live preview
- 🖍️ **Syntax highlighting**: zero-dependency implementation for js / ts / python / bash / css / html / json, light & dark themes
- 📑 **Table of contents**: auto-generated drawer with smooth scroll to sections
- 📱 **Responsive layout**: works on phones and desktops, dark / light theme toggle (remembers your choice)
- 🔍 **Site search**: expandable search box in the navbar, instant match on title / date / tags / excerpt
- 🏷️ **Tag system**: dedicated tag cloud page, click tags on cards to filter
- 🗂️ **Archive page**: grouped by year & month; About page shows live stats (posts / tags / words)
- ⏱️ **Reading experience**: reading-time estimate, prev / next post navigation, one-click copy link
- 💬 **Comments**: global comments in cloud KV with admin deletion; local browser storage in static mode
- 📡 **RSS + Sitemap**: auto-generated for subscriptions and search engines
- 👁️ **Views & likes**: global stats in cloud mode / local stats in static mode
- 📌 **Pinned posts**: pinned-first ordering with badge
- 🔒 **Article encryption**: password-protected posts, AES-GCM encrypted, lock-screen reading (see [below](#-article-encryption))
- 🧭 **Customizable nav / footer / ads**: all driven by `config.js`, no code changes needed
- ⌨️ **Keyboard shortcuts**: `Ctrl+S` save draft · `Ctrl+Enter` save/publish
- 📂 **Import .md**: supports frontmatter (title / date / tags / excerpt / password)

---

## 🚀 Quick Start (30 seconds)

**Option 1: Local static (zero deployment)**

1. Download / clone this repo and double-click `public/index.html`
2. Click "✏️ Write" in the top-right — on first use you'll be asked to set an admin password (≥ 4 chars, stored in this browser)
3. Start writing: live Markdown preview + toolbar insertions, drafts autosaved (survive page close)
4. Publish: click "📥 Save" → browser shows the system save dialog → **select your original `posts.js` to overwrite in place**; do the same for RSS / Sitemap

> Static mode has no backend, so the browser can't write to your server — "generate data file → put it back in the folder" is the lightest publishing flow. For **access from any device with cloud storage**, use Option 2.

**Option 2: Deploy to Cloud (recommended)**

After deploying to Cloudflare, the editor's button becomes "🚀 Publish to Cloud" — one click and the post is live everywhere. Full beginner-friendly steps in the next section.

---

## ☁️ Deploy to Cloud (recommended, beginner tutorial)

> Goal: deploy the blog to **Cloudflare Workers** with data in **Cloudflare KV**. No command line needed — once GitHub Secrets are configured, every push deploys automatically.
>
> You need: a GitHub account + a Cloudflare account (free tier is enough).

### Step 0: Fork / clone the project to GitHub

- With a GitHub account: **Fork** this repo (or use "Use this template").
- For privacy, set your repo to **Private** (sensitive values go through Secrets, never into the repo).

### Step 1: Create a KV namespace (the data store)

1. Log in at [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** in the left menu
2. Top-right **Create application** → switch to the **KV** tab
3. Set **Namespace name** to **`BLOG`** (the code expects this exact variable name) → **Create**
4. Copy the **namespace ID** (a 32-character hex string like `a1b2c3d4...`)

> CLI alternative: `npx wrangler kv namespace create BLOG`

### Step 2: Configure GitHub Secrets (sensitive data never lands in the repo)

In your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret name | Value | Required |
| --- | --- | --- |
| `BLOG_KV_ID` | The KV namespace ID from Step 1 | ✅ |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token (permissions: Workers / KV edit) | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID (the string in the Dashboard URL) | ✅ |
| `PAGES_PROJECT_NAME` | (optional) Custom worker name; **unset = the name in the config file** | optional |
| `BLOG_ADMIN_SETUP_KEY` | (recommended) One-time admin password setup key, prevents squatting | recommended |
| `BLOG_WRITE_TOKEN` | (optional) Legacy write token for scripts/automation | optional |

API Token: Cloudflare Dashboard → **My Profile → API Tokens → Create Token**, use the **Edit Cloudflare Workers** template and grant KV access for your account.

### Step 3: Push & auto-deploy

Push to the `main` branch → GitHub Actions runs "Deploy to Cloudflare Workers": validates the required Secrets → injects the KV ID → `wrangler deploy` → writes optional runtime secrets.

> Watch progress in the repo's **Actions** tab (about 1–3 minutes per run; green ✓ means success).
>
> Manual CLI deploy (requires replacing the KV placeholder locally first):
> ```bash
> npx wrangler deploy -c wrangler.workers.toml
> ```

### Step 4: Verify the deployment

Open in your browser (domain format: `<worker-name>.<account-subdomain>.workers.dev`; the default worker name comes from the `name` field in `wrangler.workers.toml`):

```
https://<your-domain>/api/posts
```

- Returns `{"ok":true,"posts":[...]}` → ✅ success, continue to Step 5
- Returns `{"error":"KV 未配置…"}` → ❌ KV binding failed; check the ID in `BLOG_KV_ID`

### Step 5: Set the admin password (one-time)

Right after deployment anyone could set the admin password first, so you must initialize it with the one-time key. Run this **on your own machine** (replace the URL with your site and `SETUP_KEY` with the `BLOG_ADMIN_SETUP_KEY` from Step 2):

```bash
SETUP_KEY=your_BLOG_ADMIN_SETUP_KEY
curl -X POST https://<your-domain>/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: $SETUP_KEY" \
  -d '{"password":"a-strong-password (8+ chars, 12+ recommended)"}'
```

A `201 {"ok":true,...}` response means success. **After that, delete `BLOG_ADMIN_SETUP_KEY` from GitHub Secrets** (so it can't be reused).

> Forgot the password? Delete the `admin:auth` key in the KV console → re-add `BLOG_ADMIN_SETUP_KEY` → re-run this step.

### Step 6: Start writing

Open `https://<your-domain>/admin` → log in with the password from Step 5 → click "🚀 Publish to Cloud" in the editor — the post is live everywhere ✓

> Optional: seed sample posts with `node seed.js https://<your-domain>` (existing IDs are skipped automatically).

---

## ⚙️ Configuration

All site configuration lives in `window.BLOG_CONFIG` in `public/config.js` — no code changes needed:

| Key | Description | Example |
| --- | --- | --- |
| `mode` | `'auto'` auto-detect (recommended) / `'static'` force static / `'api'` force cloud | `'auto'` |
| `pageSize` | Posts per home page; `0` = no pagination, show all (a "Prev / Next" pager appears at the bottom) | `8` |
| `apiBase` | API base URL; empty = same origin (Cloudflare default) | `''` |
| `siteUrl` | Site URL used for RSS / Sitemap links | `'https://blog.example.com'` |
| `adminPwd` | **Static mode only** local gate password; leave empty in cloud mode (password lives in Cloudflare) | `''` |
| `writeToken` | (optional) legacy static write token | `''` |
| `nav` | Custom navbar with optional dropdown children and external links | `[{text:'Home',url:'/'}]` |
| `footer` | Footer: text / friend links (`links`) / ICP (`icp`) / site notice (`decl`) / contact email (`email`) / copyright start year & name (`startYear`, `copyrightName`). Desktop shows all; mobile keeps nav + copyright only | `{links:[], decl:'', email:''}` |
| `ads` | Ad slots (off by default): above the feed / between items / post bottom | `{enabled:false}` |

> Change the accent color: the `--accent` variable at the top of `public/style.css`. Change the blog name: the `brand` value in `public/app.js` and the `<title>` in `public/index.html`.

---

## 📖 Daily Usage

### Routes (clean URLs, no hash)

| Page | URL |
| --- | --- |
| Home | `/` |
| Archive | `/archive` |
| About | `/about` |
| Tags | `/tags` |
| Admin / Editor | `/admin` (or `/write`) |
| Post detail | `/posts/<slug>/` |
| Edit post | `/posts/<slug>/edit` |
| RSS | `/api/feed.xml` (cloud) or `/feed.xml` (static) |

- Post URLs are always `/posts/<slug>/`, where the slug is the post ID — SEO friendly
- Opening `public/index.html` from `file://` falls back to `#/` hash routing automatically

### Editor

- **Date**: picker supports **date + hour/minute**
- **Encryption**: the "🔒 Encrypt" toggle + access-password field at the far right of the same row as "Pinned" (see below)
- **Official editor helper**: the "📝 Official Editor" toolbar button opens [markdown.com.cn/editor/](https://markdown.com.cn/editor/) in a new tab with your current content, then paste it back
- **Publish**: "🚀 Publish to Cloud" (cloud) or "📥 Save" and overwrite `posts.js` (static)
- **Import .md**: supports files with `---` frontmatter

---

## 🔒 Article Encryption

- In the editor, check "🔒 Encrypt" and enter an **access password** → the body is encrypted with **PBKDF2 + AES-GCM (native browser Web Crypto)**
- `posts.js` / KV / exported files contain only **ciphertext**, never plaintext (the list API masks ciphertext too)
- Readers see a lock screen and must enter the password; unlocking lasts for the current session only (refresh requires re-entry)
- To edit an encrypted post: unlock it on the detail page first, then edit; publishing re-encrypts with the current password
- Client-side encryption suits a "keep honest people honest" level; for stronger protection, keep your deployment private

---

## 🛡️ Security Design

- **Passwords never stored in plaintext**: the admin password exists in the cloud only as a PBKDF2-SHA256 salted hash (100,000 iterations); even a KV leak can't reveal it directly
- **Session tokens**: the frontend holds only a 32-byte random token (7-day TTL); the password never touches `localStorage` and is never sent back to the frontend
- **Brute-force protection**: 5 failed logins from the same IP lock it out for 15 minutes
- **Squatting protection**: the first admin password requires the one-time `BLOG_ADMIN_SETUP_KEY`
- **Secure by default**: every write request (create / update / delete) requires an `Authorization: Bearer` session token, otherwise 401
- **No secrets in the repo**: KV ID, API tokens, and keys all go through GitHub Secrets and are injected at deploy time

> Note: Cloudflare Workers' WebCrypto caps PBKDF2 at **100,000 iterations**, which is what this project uses.

---

## 🗂️ Project Structure

```
├── public/                     # The site itself (static asset directory)
│   ├── index.html              # Page shell (double-click / deploy entry)
│   ├── config.js               # All site configuration (see above)
│   ├── style.css               # Styles (dark mode + responsive + components)
│   ├── app.js                  # All logic (routing/list/detail/editor/publish/comments/encryption/search…)
│   ├── posts.js                # Static-mode post data
│   ├── feed.xml                # Static-mode RSS (export-overwrite from the editor)
│   └── sitemap.xml             # Static-mode sitemap (export-overwrite from the editor)
├── functions/                  # Cloudflare API (shared by both deployments)
│   ├── api/                    # Pages Functions routes
│   │   ├── posts.js            # GET list / POST create
│   │   ├── posts/[id].js       # GET / PUT / DELETE single post
│   │   ├── posts/[id]/comments*.js   # Comments (public post + admin delete)
│   │   ├── posts/[id]/stats.js        # Views / likes
│   │   ├── admin/setup|login|logout.js  # Admin authentication
│   │   ├── feed.xml.js         # RSS auto-generation
│   │   └── sitemap.xml.js      # Sitemap auto-generation
│   └── _lib/api-core.js        # API core (KV storage + auth + security), shared
├── worker.js                   # Cloudflare Workers entry (API + static assets)
├── wrangler.toml               # Cloudflare Pages config (alternate deployment)
├── wrangler.workers.toml       # Cloudflare Workers config (primary deployment)
├── .github/workflows/deploy.yml# GitHub Actions auto-deploy
├── seed.js                     # Import sample posts into the cloud (node seed.js <site>)
├── smoke-test.js               # Smoke tests (node smoke-test.js)
└── README.md / README_EN.md    # This documentation (Chinese / English)
```

---

## 🧪 Tests & Development

```bash
node smoke-test.js    # 54 regression tests: Markdown / TOC / highlighting / import-export /
                      # gate / archive / tags / comments / encryption / stats / search / RSS / Sitemap / cloud API
```

No dependencies required — Node.js only. The frontend is plain vanilla JS (ES5 style), no build step.

---

## ❓ FAQ

**Q: `/api/posts` returns "KV not configured" after deploy?**
A: The KV namespace ID is wrong or the deploy didn't finish. Check that `BLOG_KV_ID` is the 32-char hex ID from Step 1 and that the deployment log is green.

**Q: Why do list API posts have no content?**
A: By design — the list returns lightweight summaries only (no body/ciphertext); the full content is **loaded on demand** when you open a post, so the homepage stays fast no matter how many posts you have.

**Q: Refreshing a post page returns 404 / hangs?**
A: Hard-refresh (`Ctrl+Shift+R`) to clear stale cache; the project includes a dynamic `<base>` tag so sub-path pages load assets correctly.

**Q: I published in static mode but nobody else can see it?**
A: Static mode is the "local demo" mode (double-click to open, data in `posts.js`). To make the site public, use **cloud deployment** (Option 2).

**Q: Will the site slow down with many posts?**
A: No. Cloud mode lists don't include post bodies; static mode loads the whole `posts.js` and is fine up to ~100 posts — beyond that, switch to cloud mode.

**Q: How do I back up cloud data locally?**
A: Use "⬇️ Backup posts.js" in the editor to export a timestamped local backup file.

**Q: How do I write from another device?**
A: Open `https://<your-domain>/admin` and log in with the admin password; the session lasts 7 days (you can sign out manually).

---

## 📄 License

[MIT](LICENSE)