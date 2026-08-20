/* ============================================================
 * 轻语博客 · 云端 API 核心（Cloudflare KV 存储）
 * ------------------------------------------------------------
 * 被两处复用：
 *   · Cloudflare Pages Functions（functions/api/posts*.js）
 *   · Cloudflare Workers（worker.js）
 * 数据以单个 KV key（posts:v1）保存 JSON 数组，简单够用。
 * 注意：单 key 读写为「读-改-写」模式，个人轻量博客足够；
 *      若多写者并发，可升级为逐篇 key 或 Durable Objects。
 * ============================================================ */

const KV_KEY = 'posts:v1';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Setup-Key'
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}

export function normalizePost(p) {
  const out = p || {};
  const protectedPost = !!out.protected && out.enc && typeof out.enc === 'object';
  return {
    id: String(out.id || ''),
    title: String(out.title || '').trim(),
    date: String(out.date || ''),
    excerpt: String(out.excerpt || '').trim(),
    // 加密文章：正文存于 enc（AES-GCM 密文），content 恒为空，避免明文外泄
    content: protectedPost ? '' : String(out.content || ''),
    pinned: !!out.pinned,
    protected: !!out.protected,
    enc: protectedPost ? out.enc : null,
    tags: Array.isArray(out.tags)
      ? out.tags.map((t) => String(t).trim()).filter(Boolean)
      : String(out.tags || '').split(/[,，]/).map((t) => t.trim()).filter(Boolean)
  };
}

export async function readPosts(env) {
  try {
    const raw = await env.BLOG.get(KV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(normalizePost) : [];
  } catch (e) {
    return [];
  }
}

async function writePosts(env, posts) {
  await env.BLOG.put(KV_KEY, JSON.stringify(posts));
}

function sortByDateDesc(posts) {
  return posts.slice().sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;   // 置顶靠前
    return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);   // 再按日期倒序
  });
}

/* ---------- RSS（feed.xml） ---------- */

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/** RFC 822 日期（YYYY-MM-DD → Wed, 06 Jan 2025 00:00:00 GMT） */
function rfc822(dateStr) {
  try {
    const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00Z');
    return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
  } catch (e) { return new Date().toUTCString(); }
}

/** 由文章数组生成 RSS 2.0 XML（加密文章不进订阅源，避免密文/链接外泄） */
export function buildFeedXml(posts, siteUrl, opts) {
  const o = opts || {};
  const base = String(siteUrl || '').replace(/\/+$/, '');
  const title = o.title || '轻语博客';
  const desc = o.description || '一个零依赖的轻量博客';
  const list = sortByDateDesc(posts).filter((p) => !p.protected).slice(0, o.maxItems || 20);
  const items = list.map((p) => {
    const link = base + '/posts/' + encodeURIComponent(p.id) + '/';
    const content = p.content || '';
    return [
      '<item>',
      `<title>${xmlEscape(p.title)}</title>`,
      `<link>${xmlEscape(link)}</link>`,
      `<guid isPermaLink="false">${xmlEscape(p.id)}</guid>`,
      `<pubDate>${rfc822(p.date)}</pubDate>`,
      `<description><![CDATA[${content.replace(/\]\]>/g, ']]&gt;')}]]></description>`,
      '</item>'
    ].join('');
  }).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(base || 'https://blog.example')}</link>
    <description>${xmlEscape(desc)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>
`;
}

/** GET /api/feed.xml（RSS） */
export async function handleFeed(request, env) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const xml = buildFeedXml(await readPosts(env), siteUrl);
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', ...CORS }
  });
}

/** 写入鉴权：见下方「管理员认证」模块的 isWriteAuthed（会话 token / BLOG_WRITE_TOKEN） */
function unauthorized() {
  return json({ error: '未授权：需要有效的写入凭证（登录后使用会话 token，或配置 BLOG_WRITE_TOKEN）' }, 401);
}

/** GET /api/posts（列表） · POST /api/posts（新建） */
export async function handlePosts(request, env) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method === 'POST' && !(await isWriteAuthed(request, env))) return unauthorized();

  if (request.method === 'GET') {
    // 列表只返回摘要（不含 content/enc），正文按需通过 /api/posts/:id 加载，
    // 避免文章多了之后整个 KV 列表每次都全量下发（臃肿）。
    const summary = sortByDateDesc(await readPosts(env)).map((p) => {
      delete p.content;
      delete p.enc;
      return p;
    });
    return json({ ok: true, posts: summary });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const p = normalizePost(body);
    if (!p.id || !p.title) return json({ error: '缺少 id 或 title' }, 400);
    const posts = await readPosts(env);
    if (posts.some((x) => x.id === p.id)) return json({ error: '已存在相同 id（' + p.id + '），请用 PUT 更新' }, 409);
    posts.push(p);
    await writePosts(env, sortByDateDesc(posts));
    return json({ ok: true, post: p }, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
}

/** GET/PUT/DELETE /api/posts/:id */
export async function handlePostId(request, env, id) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if ((request.method === 'PUT' || request.method === 'DELETE') && !(await isWriteAuthed(request, env))) return unauthorized();

  const posts = await readPosts(env);
  const idx = posts.findIndex((x) => x.id === id);

  if (request.method === 'GET') {
    return idx >= 0 ? json({ ok: true, post: posts[idx] }) : json({ error: '未找到该内容' }, 404);
  }

  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null);
    const p = normalizePost(body);
    p.id = id;
    if (!p.title) return json({ error: '缺少 title' }, 400);
    if (idx >= 0) posts[idx] = p;
    else posts.push(p);
    await writePosts(env, sortByDateDesc(posts));
    return json({ ok: true, post: p });
  }

  if (request.method === 'DELETE') {
    if (idx < 0) return json({ error: '未找到该内容' }, 404);
    posts.splice(idx, 1);
    await writePosts(env, sortByDateDesc(posts));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

/* ============================================================
 * 评论（KV key: comments:<postId>，JSON 数组）
 * GET 列表 / POST 发表（公开，无需令牌） / DELETE 单条（需令牌，用于管理）
 * ============================================================ */

const COMMENT_KEY = (postId) => 'comments:' + postId;
const COMMENT_CAPS = { author: 30, content: 1000, perPost: 300 };

async function readComments(env, postId) {
  try {
    const raw = await env.BLOG.get(COMMENT_KEY(postId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/** GET /api/posts/:id/comments · POST /api/posts/:id/comments（公开发表） */
export async function handleComments(request, env, postId) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    const comments = await readComments(env, postId);
    return json({ ok: true, postId, comments });
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    const author = String((body && body.author) || '').trim().slice(0, COMMENT_CAPS.author);
    const content = String((body && body.content) || '').trim().slice(0, COMMENT_CAPS.content);
    if (!author) return json({ error: '请填写昵称' }, 400);
    if (!content) return json({ error: '评论内容不能为空' }, 400);
    const list = await readComments(env, postId);
    if (list.length >= COMMENT_CAPS.perPost) return json({ error: '评论数已达上限' }, 400);
    const comment = {
      id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      author,
      content,
      date: new Date().toISOString().slice(0, 10)
    };
    list.push(comment);
    if (list.length > COMMENT_CAPS.perPost) list.shift();   // 兜底：超限丢最旧
    await env.BLOG.put(COMMENT_KEY(postId), JSON.stringify(list));
    return json({ ok: true, comment }, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
}

/** DELETE /api/posts/:id/comments/:cid（需写入令牌，用于管理/删除不当评论） */
export async function handleCommentId(request, env, postId, cid) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405);
  if (!(await isWriteAuthed(request, env))) return unauthorized();

  const list = await readComments(env, postId);
  const next = list.filter((c) => c.id !== cid);
  if (next.length === list.length) return json({ error: '评论不存在' }, 404);
  await env.BLOG.put(COMMENT_KEY(postId), JSON.stringify(next));
  return json({ ok: true });
}

/* ============================================================
 * Sitemap（/api/sitemap.xml）
 * ============================================================ */

/** 由文章数组生成 Sitemap XML（首页 / 关于 / 归档 / 全部文章） */
export function buildSitemapXml(posts, siteUrl) {
  const base = String(siteUrl || '').replace(/\/+$/, '');
  const row = (loc, lastmod) =>
    '  <url>' +
      `<loc>${xmlEscape(loc)}</loc>` +
      (lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : '') +
    '</url>';
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    row(base + '/'),
    row(base + '/about'),
    row(base + '/archive')
  ];
  sortByDateDesc(posts).forEach((p) => {
    lines.push(row(base + '/posts/' + encodeURIComponent(p.id) + '/', p.date || ''));
  });
  lines.push('</urlset>');
  lines.push('');
  return lines.join('\n');
}

/** GET /api/sitemap.xml */
export async function handleSitemap(request, env) {
  const siteUrl = env.SITE_URL || (request ? new URL(request.url).origin : '');
  const posts = env && env.BLOG ? await readPosts(env) : [];
  const xml = buildSitemapXml(posts, siteUrl);
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', ...CORS }
  });
}

/* ============================================================
 * 阅读数 / 点赞（KV key: stats:<postId> = { likes, views }）
 * GET 读取 · POST { action: 'views' | 'like' } 累计（公开）
 * ============================================================ */

const STAT_KEY = (postId) => 'stats:' + postId;

async function readStats(env, postId) {
  try {
    const raw = await env.BLOG.get(STAT_KEY(postId));
    const s = raw ? JSON.parse(raw) : {};
    return { likes: Number(s.likes) || 0, views: Number(s.views) || 0 };
  } catch (e) { return { likes: 0, views: 0 }; }
}

/** GET /api/posts/:id/stats · POST /api/posts/:id/stats { action: views|like } */
export async function handleStats(request, env, postId) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    return json({ ok: true, postId, stats: await readStats(env, postId) });
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    const action = body && body.action;
    if (action !== 'views' && action !== 'like') {
      return json({ error: 'action 只能是 views 或 like' }, 400);
    }
    const s = await readStats(env, postId);
    if (action === 'views') s.views = Math.min(s.views + 1, 9999999);
    else s.likes = Math.min(s.likes + 1, 9999999);
    await env.BLOG.put(STAT_KEY(postId), JSON.stringify(s));
    return json({ ok: true, postId, stats: s });
  }

  return json({ error: 'Method not allowed' }, 405);
}

/* ============================================================
 * 管理员认证（安全版：密码只存 Cloudflare KV，前端不持有明文）
 * ------------------------------------------------------------
 * 密码：PBKDF2-SHA256 加盐哈希后存 KV（admin:auth），绝不明文。
 * 登录：POST /api/admin/login { password } → 服务端校验哈希 →
 *       签发随机会话 token（KV admin:session:<token>，7 天 TTL）。
 * 鉴权：写操作请求头 Authorization: Bearer <session-token>，
 *       isWriteAuthed() 校验会话；旧的 BLOG_WRITE_TOKEN 仍兼容。
 * 限流：同一 IP 连续失败 5 次锁 15 分钟（KV admin:fail:<ip>）。
 * 防抢注：首次设置密码需 X-Setup-Key 匹配环境变量 BLOG_ADMIN_SETUP_KEY。
 * ============================================================ */

const ADMIN_AUTH_KEY = 'admin:auth';                 // { salt, hash, iter }
const ADMIN_SESSION_PREFIX = 'admin:session:';       // <token> -> { exp }
const ADMIN_FAIL_PREFIX = 'admin:fail:';             // <ip> -> { n, until }
const ADMIN_SESSION_TTL = 7 * 24 * 3600;             // 会话 7 天
const ADMIN_MAX_FAILS = 5;                           // 连续失败次数上限
const ADMIN_LOCK_MS = 15 * 60 * 1000;                // 锁定 15 分钟
const PBKDF2_ITER = 100000;                           // PBKDF2 迭代次数
                                                       // ⚠️ Cloudflare Workers WebCrypto 硬限制：PBKDF2 迭代数 ≤ 100000
                                                       //（曾设 120000 导致 "Pbkdf2 failed: iteration counts above 100000"）

/* ---------- 加密工具（WebCrypto，Worker/Node 均可用） ---------- */

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}
/** PBKDF2-SHA256 派生密钥（返回 hex）；salt 为 hex 字符串 */
async function deriveKey(password, saltHex, iter) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: iter },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}
/** 恒定时间字符串比较（防时序侧信道） */
function safeEqual(a, b) {
  const ba = new Uint8Array(String(a || '').split('').map((c) => c.charCodeAt(0)));
  const bb = new Uint8Array(String(b || '').split('').map((c) => c.charCodeAt(0)));
  if (ba.length !== bb.length) {
    // 仍走一遍循环，避免长度差异泄露
    for (let i = 0; i < bb.length; i++) { if (bb[i] !== 0) return false; }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}
function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}
function nowMs() { return Date.now(); }

/* ---------- 认证状态 ---------- */

async function getAdminAuth(env) {
  try {
    const raw = await env.BLOG.get(ADMIN_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
async function setAdminAuth(env, auth) {
  await env.BLOG.put(ADMIN_AUTH_KEY, JSON.stringify(auth));
}
/** 校验会话 token 是否有效（存在且未过期） */
async function validSession(env, token) {
  if (!token) return false;
  try {
    const raw = await env.BLOG.get(ADMIN_SESSION_PREFIX + token);
    if (!raw) return false;
    const s = JSON.parse(raw);
    return s && s.exp && s.exp > nowMs();
  } catch (e) { return false; }
}

/* ---------- 鉴权入口（写操作复用） ---------- */

/**
 * 写鉴权：优先会话 token（Authorization: Bearer <token>），
 * 兼容旧的 BLOG_WRITE_TOKEN 环境变量（静态长令牌）。
 * 未配置任何认证（无 auth、无 token）→ 拒绝（安全默认）。
 */
export async function isWriteAuthed(request, env) {
  if (!env || !env.BLOG) return false;
  const auth = String(request.headers.get('Authorization') || '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const token = m ? m[1].trim() : '';
  if (token && await validSession(env, token)) return true;
  // 兼容旧配置：BLOG_WRITE_TOKEN 环境变量
  const legacy = env.BLOG_WRITE_TOKEN;
  if (legacy && safeEqual(auth, 'Bearer ' + legacy)) return true;
  return false;
}

/* ---------- 接口实现 ---------- */

/** POST /api/admin/setup — 首次设置管理员密码（需 X-Setup-Key 匹配 BLOG_ADMIN_SETUP_KEY） */
export async function handleAdminSetup(request, env) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 防抢注：必须提供设置密钥（环境变量 BLOG_ADMIN_SETUP_KEY）
  const setupKey = env.BLOG_ADMIN_SETUP_KEY;
  if (!setupKey) return json({ error: '未配置 BLOG_ADMIN_SETUP_KEY 环境变量，无法设置管理员密码' }, 500);
  const given = String(request.headers.get('X-Setup-Key') || '').trim();
  if (!safeEqual(given, setupKey)) return json({ error: '设置密钥无效' }, 403);

  if (await getAdminAuth(env)) return json({ error: '管理员密码已设置；如需重置，请先删除 KV 键 admin:auth 或联系部署者' }, 409);

  let body = null;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: '请求体不是有效 JSON（检查是否含 BOM/引号被转义）' }, 400);
  }
  const password = String((body && body.password) || '');
  if (password.length < 8) return json({ error: '密码至少 8 位' }, 400);

  const salt = randomToken(16);
  const iter = PBKDF2_ITER;
  let hash;
  try {
    hash = await deriveKey(password, salt, iter);
  } catch (e) {
    console.error('[admin:setup] deriveKey failed:', e && e.message, e);
    return json({ error: '密码哈希计算失败（服务端）: ' + (e && e.message) }, 500);
  }
  try {
    await setAdminAuth(env, { salt, hash, iter });
  } catch (e) {
    console.error('[admin:setup] KV write failed:', e && e.message, e);
    return json({ error: 'KV 写入失败（服务端）: ' + (e && e.message) }, 500);
  }
  return json({ ok: true, message: '管理员密码已设置' }, 201);
}

/** POST /api/admin/login — 密码登录，成功返回会话 token */
export async function handleAdminLogin(request, env) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = clientIp(request);
  // 限流：检查是否被锁定
  try {
    const failRaw = await env.BLOG.get(ADMIN_FAIL_PREFIX + ip);
    const fail = failRaw ? JSON.parse(failRaw) : null;
    if (fail && fail.until && fail.until > nowMs()) {
      const mins = Math.ceil((fail.until - nowMs()) / 60000);
      return json({ error: '尝试次数过多，请 ' + mins + ' 分钟后再试' }, 429);
    }
  } catch (e) { /* 忽略读取失败 */ }

  const body = await request.json().catch(() => null);
  const password = String((body && body.password) || '');
  const auth = await getAdminAuth(env);
  if (!auth || !auth.hash || !auth.salt) {
    return json({ error: '尚未设置管理员密码（请先调用 /api/admin/setup）' }, 401);
  }

  const hash = await deriveKey(password, auth.salt, auth.iter || PBKDF2_ITER);
  if (!safeEqual(hash, auth.hash)) {
    // 记录失败并可能锁定
    let n = 1;
    try {
      const failRaw = await env.BLOG.get(ADMIN_FAIL_PREFIX + ip);
      const fail = failRaw ? JSON.parse(failRaw) : null;
      n = (fail && fail.n ? fail.n : 0) + 1;
    } catch (e) { /* ignore */ }
    const lock = n >= ADMIN_MAX_FAILS ? { n, until: nowMs() + ADMIN_LOCK_MS } : { n };
    await env.BLOG.put(ADMIN_FAIL_PREFIX + ip, JSON.stringify(lock), { expirationTtl: ADMIN_MAX_FAILS * 60 * 60 });
    return json({ error: '密码错误' }, 401);
  }

  // 成功：清除失败计数，签发会话 token
  try { await env.BLOG.delete(ADMIN_FAIL_PREFIX + ip); } catch (e) { /* ignore */ }
  const token = randomToken(32);
  await env.BLOG.put(ADMIN_SESSION_PREFIX + token, JSON.stringify({ exp: nowMs() + ADMIN_SESSION_TTL * 1000 }), { expirationTtl: ADMIN_SESSION_TTL });
  return json({ ok: true, token, expiresIn: ADMIN_SESSION_TTL });
}

/** POST /api/admin/logout — 撤销当前会话 token */
export async function handleAdminLogout(request, env) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const auth = String(request.headers.get('Authorization') || '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (m) { try { await env.BLOG.delete(ADMIN_SESSION_PREFIX + m[1].trim()); } catch (e) { /* ignore */ } }
  return json({ ok: true });
}