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
  'Access-Control-Allow-Headers': 'Content-Type'
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

/** 写入鉴权：配置了 BLOG_WRITE_TOKEN 时，写操作需携带 Authorization: Bearer <token> */
function isWriteAuthed(request, env) {
  const token = env.BLOG_WRITE_TOKEN;
  if (!token) return true;   // 未配置令牌 = 不启用鉴权（本地/私有部署）
  const auth = (request.headers.get('Authorization') || '').trim();
  return auth === 'Bearer ' + token;
}
function unauthorized() {
  return json({ error: '未授权：需要有效的写入令牌（Bearer token，通过 BLOG_WRITE_TOKEN 配置）' }, 401);
}

/** GET /api/posts（列表） · POST /api/posts（新建） */
export async function handlePosts(request, env) {
  if (!env || !env.BLOG) return json({ error: 'KV 未配置：请创建并绑定名为 BLOG 的 KV 命名空间' }, 500);
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method === 'POST' && !isWriteAuthed(request, env)) return unauthorized();

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
  if ((request.method === 'PUT' || request.method === 'DELETE') && !isWriteAuthed(request, env)) return unauthorized();

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
  if (!isWriteAuthed(request, env)) return unauthorized();

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