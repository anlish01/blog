/* ============================================================
 * 轻语博客 · 云端 API 核心（Cloudflare D1 存储）
 * ------------------------------------------------------------
 * 被两处复用：
 *   · Cloudflare Pages Functions（functions/api/posts*.js）
 *   · Cloudflare Workers（worker.js）
 * 数据持久化到 D1（SQLite）：每篇文章一行；评论 / 统计 / 管理员认证各为其表。
 * 所有接口的请求/响应结构与 KV 版本保持一致，前端与 seed.js 无需改动。
 * ============================================================ */

const DB_ERR = '数据库未配置：请创建并绑定名为 DB 的 D1 数据库';

/* ---------- 缓存策略（边缘缓存，降低 D1 压力与首字节延迟） ----------
 * 只读接口内容更新极少，可放心缓存；写接口一律 no-store，避免缓存到突变响应。 */
const READ_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';
const FEED_CACHE = 'public, s-maxage=300, stale-while-revalidate=600';
const NO_CACHE = 'no-store';

/* 点赞频控：每 IP 每分钟上限（防接口被刷量） */
const LIKE_CAP = 10;

/* Cloudflare 边缘缓存标签（写操作后主动清缓存，保证发布即生效）
 * 仅当配置了 CF_API_TOKEN + CF_ZONE_ID 才真正清缓存，否则依赖 s-maxage 自然过期。 */
const TAG_POSTS = 'posts';
const TAG_FEED = 'feed';
const TAG_SITEMAP = 'sitemap';
async function purgeTags(env, tags) {
  const token = env && env.CF_API_TOKEN;
  const zone = env && env.CF_ZONE_ID;
  if (!token || !zone || !tags || !tags.length) return;
  try {
    await fetch('https://api.cloudflare.com/client/v4/zones/' + zone + '/cache/purge', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tags })
    });
  } catch (e) { console.warn('[cache] purge failed:', e && e.message); }
}

/* ---------- 通用 DB 辅助 ---------- */
async function dbAll(db, sql, ...params) {
  const r = await db.prepare(sql).bind(...params).all();
  return (r && r.results) || [];
}
async function dbFirst(db, sql, ...params) {
  return await db.prepare(sql).bind(...params).first();
}
async function dbRun(db, sql, ...params) {
  await db.prepare(sql).bind(...params).run();
}

/* ---------- CORS：仅回显本站自身来源，杜绝任意跨站读取 ----------
 * 同源请求（无 Origin 头）不加 ACAO；跨站请求：
 *   · 若配置了 SITE_URL（推荐），仅当来源命中外站域名白名单才回写 ACAO，其余一律拦截；
 *   · 若未配置 SITE_URL（如未设置的跨域部署），回退为「回显请求源」（等价于 *，但更精确），
 *     避免自定义域名 + workers.dev 这类合法跨域被误拦截。
 * 配合 Bearer Token（非凭据请求），即便回显源也不会泄露凭据。 */
export function getCorsHeaders(request, env) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Setup-Key',
    'Vary': 'Origin'   // 跨域缓存按 Origin 区分副本，避免命中错误/缺失的 ACAO 响应
  };
  const origin = request && request.headers && request.headers.get ? request.headers.get('Origin') : null;
  if (!origin) return h; // 同源，无需 CORS 头
  const allowed = [];
  if (env && env.SITE_URL) allowed.push(String(env.SITE_URL).replace(/\/+$/, ''));
  try { const self = new URL(request.url).origin; if (allowed.indexOf(self) < 0) allowed.push(self); } catch (e) {}
  if (allowed.indexOf(origin) >= 0) {
    h['Access-Control-Allow-Origin'] = origin;
  } else if (!env || !env.SITE_URL) {
    // 未配置 SITE_URL 时回退回显，保证合法跨域部署不被误拦
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

export function json(data, status = 200, request, env, extra) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json; charset=utf-8' },
    getCorsHeaders(request, env),
    { 'Cache-Control': NO_CACHE },
    extra || {}
  );
  return new Response(JSON.stringify(data), { status, headers });
}

export function corsPreflight(request, env) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
}

/** 401 统一响应（缺少/无效凭证） */
function unauthorized(request, env) {
  return json({ error: '未授权：请先登录获取会话 token，并在请求头携带 Authorization: Bearer <token>' }, 401, request, env);
}

export function normalizePost(p) {
  const out = p || {};
  const protectedPost = !!out.protected && out.enc && typeof out.enc === 'object';
  return {
    id: String(out.id || ''),
    title: String(out.title || '').trim(),
    date: String(out.date || ''),
    excerpt: String(out.excerpt || '').trim(),
    cover: String(out.cover || '').trim(),
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

/** D1 行 → 文章对象（与 normalizePost 输出结构一致，便于上层共用） */
function postFromRow(r) {
  if (!r) return null;
  let tags = [];
  try { tags = r.tags ? JSON.parse(r.tags) : []; } catch (e) { tags = []; }
  let enc = null;
  if (r.enc) { try { enc = JSON.parse(r.enc); } catch (e) { enc = null; } }
  return {
    id: String(r.id || ''),
    title: String(r.title || ''),
    date: String(r.date || ''),
    excerpt: String(r.excerpt || ''),
    cover: String(r.cover || ''),
    content: String(r.content || ''),
    pinned: !!r.pinned,
    protected: !!r.protected,
    enc: enc,
    tags: tags
  };
}

/** 文章对象 → D1 插入参数（顺序与 posts 表列一致） */
function postToParams(p) {
  return [
    p.id, p.title, p.date, p.excerpt, p.content,
    p.cover || '',
    p.pinned ? 1 : 0, p.protected ? 1 : 0,
    p.enc ? JSON.stringify(p.enc) : null,
    JSON.stringify(p.tags || [])
  ];
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
/** RFC 822 日期（兼容 "YYYY-MM-DD" 与 "YYYY-MM-DD HH:mm"）
 *  纯日期按 UTC 解析，避免 +8 时区把 pubDate 显示成前一天 */
function rfc822(dateStr) {
  try {
    const s = String(dateStr || '').trim();
    let d;
    if (s.length <= 10) {
      d = new Date(s.slice(0, 10) + 'T00:00:00Z');
    } else {
      d = new Date(s.slice(0, 10) + 'T' + (s.slice(11, 16) || '00:00') + ':00');
    }
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
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const xml = buildFeedXml(await readPosts(env), siteUrl);
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': FEED_CACHE, 'Cache-Tag': TAG_FEED, ...getCorsHeaders(request, env) }
  });
}

/* ---------- 文章读写 ---------- */

async function readPosts(env) {
  let rows = [];
  try { rows = await dbAll(env.DB, 'SELECT * FROM posts'); } catch (e) { rows = []; }
  if (rows.length) return rows.map(postFromRow);
  // D1 空表（未迁移 / 尚未发布文章）时，回退到静态 public/posts.js 的默认文章，
  // 保证 RSS / Sitemap 始终有内容、首页等列表不至于完全空白。
  const staticPosts = await readStaticPosts(env);
  if (staticPosts.length) return staticPosts;
  return rows.map(postFromRow);
}

/** 从静态资源目录读取 posts.js 并解析出文章数组（D1 空表时的兜底数据源） */
async function readStaticPosts(env) {
  if (!env || !env.ASSETS) return [];
  try {
    // ASSETS.fetch 按 pathname 取静态文件，host 无关（Pages/Workers 均注入 env.ASSETS）
    const res = await env.ASSETS.fetch(new Request('https://assets.local/posts.js'));
    if (!res.ok) return [];
    const src = await res.text();
    // posts.js 由 JSON.stringify 生成，是标准 JSON 数组：window.BLOG_POSTS = [ ... ];
    // 贪婪匹配到最后（避免嵌套数组 ["a","b"] 的首个 ] 提前截断）
    const m = /window\.BLOG_POSTS\s*=\s*(\[[\s\S]*\])\s*;?/.exec(src);
    if (!m) return [];
    const arr = JSON.parse(m[1]);
    return Array.isArray(arr) ? arr.map(normalizePost) : [];
  } catch (e) { return []; }
}

/** GET /api/posts（列表） · POST /api/posts（新建） */
export async function handlePosts(request, env) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method === 'POST' && !(await isWriteAuthed(request, env))) return unauthorized(request, env);

  if (request.method === 'GET') {
    // 列表只返回摘要（不含 content/enc），正文按需通过 /api/posts/:id 加载。
    // 非加密文章附带 search 字段（正文前若干字符），供云端模式前端全文搜索使用；
    // 加密文章绝不外泄任何正文线索。
    const all = sortByDateDesc(await readPosts(env));
    const summary = all.map((p) => {
      if (!p.protected) {
        const s = String(p.content || '');
        if (s) p.search = s.slice(0, 800);
      }
      delete p.content;
      delete p.enc;
      return p;
    });
    return json({ ok: true, posts: summary }, 200, request, env, { 'Cache-Control': READ_CACHE, 'Cache-Tag': TAG_POSTS });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const p = normalizePost(body);
    if (!p.id || !p.title) return json({ error: '缺少 id 或 title' }, 400, request, env);
    const exist = await dbFirst(env.DB, 'SELECT 1 FROM posts WHERE id = ?', p.id);
    if (exist) return json({ error: '已存在相同 id（' + p.id + '），请用 PUT 更新' }, 409, request, env);
    await dbRun(env.DB,
      'INSERT INTO posts (id,title,date,excerpt,content,cover,pinned,protected,enc,tags) VALUES (?,?,?,?,?,?,?,?,?,?)',
      ...postToParams(p));
    await purgeTags(env, [TAG_POSTS, TAG_FEED, TAG_SITEMAP, 'post:' + p.id]);
    return json({ ok: true, post: p }, 201, request, env);
  }

  return json({ error: 'Method not allowed' }, 405, request, env);
}

/** GET/PUT/DELETE /api/posts/:id */
export async function handlePostId(request, env, id) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if ((request.method === 'PUT' || request.method === 'DELETE') && !(await isWriteAuthed(request, env))) return unauthorized(request, env);

  const exist = await dbFirst(env.DB, 'SELECT * FROM posts WHERE id = ?', id);

  if (request.method === 'GET') {
    const p = exist ? postFromRow(exist) : null;
    if (!p) return json({ error: '未找到该内容' }, 404, request, env);
    // 单篇详情可稍长缓存（含正文/密文），写操作会使缓存自然过期
    return json({ ok: true, post: p }, 200, request, env, { 'Cache-Control': READ_CACHE, 'Cache-Tag': TAG_POSTS + ',post:' + id });
  }

  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null);
    const p = normalizePost(body);
    p.id = id;
    if (!p.title) return json({ error: '缺少 title' }, 400, request, env);
    await dbRun(env.DB,
      'INSERT OR REPLACE INTO posts (id,title,date,excerpt,content,cover,pinned,protected,enc,tags) VALUES (?,?,?,?,?,?,?,?,?,?)',
      ...postToParams(p));
    await purgeTags(env, [TAG_POSTS, TAG_FEED, TAG_SITEMAP, 'post:' + id]);
    return json({ ok: true, post: p }, 200, request, env);
  }

  if (request.method === 'DELETE') {
    if (!exist) return json({ error: '未找到该内容' }, 404, request, env);
    await dbRun(env.DB, 'DELETE FROM posts WHERE id = ?', id);
    await purgeTags(env, [TAG_POSTS, TAG_FEED, TAG_SITEMAP, 'post:' + id]);
    return json({ ok: true }, 200, request, env);
  }

  return json({ error: 'Method not allowed' }, 405, request, env);
}

/* ============================================================
 * 评论（D1 表 comments；GET 列表 / POST 发表 / DELETE 单条）
 * ============================================================ */

const COMMENT_CAPS = { author: 30, content: 1000, perPost: 300, perMin: 5 };

/** 清除字符串中的 ASCII 控制字符（保留 \n \t）：防注入 / 干扰渲染的隐形字符 */
function sanitizeText(s) {
  return String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** GET /api/posts/:id/comments · POST /api/posts/:id/comments（公开发表） */
export async function handleComments(request, env, postId) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    // 按写入顺序返回（rowid 单调递增），与旧版 KV 行为一致
    const list = await dbAll(env.DB, 'SELECT * FROM comments WHERE post_id = ? ORDER BY rowid ASC', postId);
    return json({ ok: true, postId, comments: list }, 200, request, env, { 'Cache-Control': READ_CACHE, 'Cache-Tag': 'comments:' + postId });
  }

  if (method === 'POST') {
    // 来源校验：浏览器跨站脚本/垃圾站外提交会带异源 Origin → 拒绝
    const origin = request.headers.get('Origin');
    if (origin) {
      let self = '', site = '';
      try { self = new URL(request.url).origin; } catch (e) {}
      if (env.SITE_URL) site = String(env.SITE_URL).replace(/\/+$/, '');
      if (origin !== self && origin !== site) return json({ error: '来源校验失败' }, 403, request, env);
    }
    // 频率限制：同一 IP 每分钟最多 perMin 条（KV 计数，60s 窗口）。
    // 注意：若 KV（env.BLOG）未绑定，频控会静默失效 —— 显式告警，避免无声降级。
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const win = Math.floor(Date.now() / 60000);
    const rk = 'rate:cmt:' + ip + ':' + win;
    let cnt = 0;
    if (env.BLOG) {
      try { cnt = Number((await env.BLOG.get(rk)) || 0); } catch (e) {}
      if (cnt >= COMMENT_CAPS.perMin) return json({ error: '评论太频繁，请稍后再试' }, 429, request, env);
    } else {
      console.warn('[comments] env.BLOG(KV) 未绑定，评论频率限制已禁用');
    }
    const body = await request.json().catch(() => null);
    const author = sanitizeText(String((body && body.author) || '').trim()).slice(0, COMMENT_CAPS.author);
    const content = sanitizeText(String((body && body.content) || '').trim()).slice(0, COMMENT_CAPS.content);
    if (!author) return json({ error: '请填写昵称' }, 400, request, env);
    if (!content) return json({ error: '评论内容不能为空' }, 400, request, env);
    const count = await dbFirst(env.DB, 'SELECT COUNT(*) AS c FROM comments WHERE post_id = ?', postId);
    if ((count && count.c || 0) >= COMMENT_CAPS.perPost) return json({ error: '评论数已达上限' }, 400, request, env);
    const comment = {
      id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      author,
      content,
      date: new Date().toISOString().slice(0, 10)
    };
    await dbRun(env.DB,
      'INSERT INTO comments (id,post_id,author,content,date) VALUES (?,?,?,?,?)',
      comment.id, postId, comment.author, comment.content, comment.date);
    // 入库成功才计数（防刷屏）
    if (env.BLOG) {
      try { await env.BLOG.put(rk, String(cnt + 1), { expirationTtl: 120 }); } catch (e) {}
    }
    // 清评论列表缓存，保证新评论立即可见（与 DELETE 评论行为一致）
    await purgeTags(env, ['comments:' + postId]);
    return json({ ok: true, comment }, 201, request, env);
  }

  return json({ error: 'Method not allowed' }, 405, request, env);
}

/** DELETE /api/posts/:id/comments/:cid（需写入令牌，用于管理/删除不当评论） */
export async function handleCommentId(request, env, postId, cid) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405, request, env);
  if (!(await isWriteAuthed(request, env))) return unauthorized(request, env);

  const exist = await dbFirst(env.DB, 'SELECT 1 FROM comments WHERE post_id = ? AND id = ?', postId, cid);
  if (!exist) return json({ error: '评论不存在' }, 404, request, env);
  await dbRun(env.DB, 'DELETE FROM comments WHERE post_id = ? AND id = ?', postId, cid);
  await purgeTags(env, ['comments:' + postId]);
  return json({ ok: true }, 200, request, env);
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
  const siteUrl = (env && env.SITE_URL) || (request ? new URL(request.url).origin : '');
  const posts = env && env.DB ? await readPosts(env) : [];
  const xml = buildSitemapXml(posts, siteUrl);
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': FEED_CACHE, 'Cache-Tag': TAG_SITEMAP, ...getCorsHeaders(request, env) }
  });
}

/* ---------- 站点生成产物（RSS / Sitemap 云端副本） ---------- */

/** POST /api/site-files — 保存站点产物（feed.xml / sitemap.xml 等），需写鉴权
 *  GET  /api/site-files       — 列出全部产物名
 *  GET  /api/site-files/:name — 下载指定产物内容 */
export async function handleSiteFiles(request, env, name) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);

  if (request.method === 'GET') {
    if (name) {
      const row = await dbFirst(env.DB, 'SELECT content FROM site_files WHERE name = ?', name).catch(() => null);
      if (!row) return json({ error: '未找到该产物' }, 404, request, env);
      const isXml = /\.xml$/i.test(name);
      return new Response(row.content, {
        status: 200,
        headers: { 'Content-Type': (isXml ? 'application/xml' : 'text/plain') + '; charset=utf-8', 'Cache-Control': READ_CACHE, ...getCorsHeaders(request, env) }
      });
    }
    const rows = await dbAll(env.DB, 'SELECT name, updated_at FROM site_files').catch(() => []);
    return json({ ok: true, files: rows }, 200, request, env, { 'Cache-Control': READ_CACHE });
  }

  if (request.method === 'POST') {
    if (!(await isWriteAuthed(request, env))) return unauthorized(request, env);
    const body = await request.json().catch(() => null);
    const files = Array.isArray(body) ? body : (body && body.files ? body.files : null);
    if (!Array.isArray(files) || !files.length) return json({ error: '缺少 files 数组' }, 400, request, env);
    const now = new Date().toISOString();
    for (const f of files) {
      if (!f || typeof f.name !== 'string' || typeof f.content !== 'string') continue;
      if (!/^[a-z0-9._-]+$/i.test(f.name)) continue;
      await dbRun(env.DB,
        'INSERT INTO site_files (name, content, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at',
        f.name, f.content, now
      ).catch(() => {});
    }
    return json({ ok: true }, 200, request, env);
  }

  return json({ error: '方法不允许' }, 405, request, env);
}

/* ============================================================
 * 阅读数 / 点赞（D1 表 stats）
 * ============================================================ */

/** GET /api/posts/:id/stats · POST /api/posts/:id/stats { action: views|like } */
export async function handleStats(request, env, postId) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    const s = await dbFirst(env.DB, 'SELECT * FROM stats WHERE post_id = ?', postId);
    return json({ ok: true, postId, stats: { likes: Number(s && s.likes) || 0, views: Number(s && s.views) || 0 } }, 200, request, env, { 'Cache-Control': READ_CACHE, 'Cache-Tag': 'stats:' + postId });
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    const action = body && body.action;
    if (action !== 'views' && action !== 'like') {
      return json({ error: 'action 只能是 views 或 like' }, 400, request, env);
    }

    if (action === 'like') {
      // 点赞去重（每 IP 每文章仅计一次）：与前端 per-browser 去重呼应，
      // 服务端再兜底一层，防止绕过前端直接调 API 把同一篇赞数刷高。
      const ip = clientIp(request);
      const dk = 'liked:' + ip + ':' + postId;
      if (env.BLOG) {
        try {
          if (await env.BLOG.get(dk)) {
            // 已赞过：返回当前计数，不重复 +1（保持幂等）
            const cur = await dbFirst(env.DB, 'SELECT * FROM stats WHERE post_id = ?', postId) || {};
            const s = { likes: Number(cur.likes) || 0, views: Number(cur.views) || 0 };
            return json({ ok: true, postId, stats: s, duplicated: true }, 200, request, env);
          }
        } catch (e) {}
      }
      // 全局频控（防整体刷量：短时间内对大量不同文章连赞）
      const win = Math.floor(Date.now() / 60000);
      const rk = 'rate:like:' + ip + ':' + win;
      let cnt = 0;
      if (env.BLOG) {
        try { cnt = Number(await env.BLOG.get(rk)) || 0; } catch (e) {}
        if (cnt >= LIKE_CAP) return json({ error: '操作太频繁，请稍后再试' }, 429, request, env);
      } else {
        console.warn('[stats] env.BLOG(KV) 未绑定，点赞频率限制已禁用');
      }
      const cur = await dbFirst(env.DB, 'SELECT * FROM stats WHERE post_id = ?', postId) || {};
      const s = { likes: Number(cur.likes) || 0, views: Number(cur.views) || 0 };
      s.likes = Math.min(s.likes + 1, 9999999);
      await dbRun(env.DB,
        'INSERT INTO stats (post_id,likes,views) VALUES (?,?,?) '
        + 'ON CONFLICT(post_id) DO UPDATE SET likes=excluded.likes, views=excluded.views',
        postId, s.likes, s.views);
      if (env.BLOG) {
        try {
          await env.BLOG.put(rk, String(cnt + 1), { expirationTtl: 120 });
          await env.BLOG.put(dk, '1');   // 永久去重标记（无过期）
        } catch (e) {}
      }
      await purgeTags(env, ['stats:' + postId]);   // 清 stats 缓存，保证点赞数立即生效
      return json({ ok: true, postId, stats: s }, 200, request, env);
    }

    // views：计数即可（同会话去重由前端 sessionStorage 负责；此处仅累加）
    const cur = await dbFirst(env.DB, 'SELECT * FROM stats WHERE post_id = ?', postId) || {};
    const s = { likes: Number(cur.likes) || 0, views: Number(cur.views) || 0 };
    s.views = Math.min(s.views + 1, 9999999);
    await dbRun(env.DB,
      'INSERT INTO stats (post_id,likes,views) VALUES (?,?,?) '
      + 'ON CONFLICT(post_id) DO UPDATE SET likes=excluded.likes, views=excluded.views',
      postId, s.likes, s.views);
    await purgeTags(env, ['stats:' + postId]);   // 清 stats 缓存，保证阅读数立即生效
    return json({ ok: true, postId, stats: s }, 200, request, env);
  }

  return json({ error: 'Method not allowed' }, 405, request, env);
}

/* ============================================================
 * 管理员认证（安全版：密码只存 D1，前端不持有明文）
 * ------------------------------------------------------------
 * 密码：PBKDF2-SHA256 加盐哈希后存 admin_auth，绝不明文。
 * 登录：POST /api/admin/login { password } → 校验哈希 →
 *       签发随机会话 token（admin_sessions，7 天）。
 * 鉴权：写操作请求头 Authorization: Bearer <session-token>，
 *       isWriteAuthed() 校验会话；旧的 BLOG_WRITE_TOKEN 仍兼容。
 * 限流：同一 IP 连续失败 5 次锁 15 分钟（admin_fails）。
 * 防抢注：首次设置密码需 X-Setup-Key 匹配环境变量 BLOG_ADMIN_SETUP_KEY。
 * ============================================================ */

const ADMIN_AUTH_KEY = 'auth';
const ADMIN_SESSION_PREFIX = 'admin:session:';   // 复用字符便于阅读（实际存 admin_sessions.token）
const ADMIN_FAIL_PREFIX = 'admin:fail:';
const ADMIN_SESSION_TTL = 7 * 24 * 3600;          // 会话 7 天
const ADMIN_MAX_FAILS = 5;                        // 连续失败次数上限
const ADMIN_LOCK_MS = 15 * 60 * 1000;             // 锁定 15 分钟
const PBKDF2_ITER = 100000;                       // PBKDF2 迭代次数（CF WebCrypto 硬上限 100000）

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

/* ---------- 认证状态（D1） ---------- */

async function getAdminAuth(env) {
  const r = await dbFirst(env.DB, "SELECT * FROM admin_auth WHERE k = ?", ADMIN_AUTH_KEY);
  return r ? { salt: r.salt, hash: r.hash, iter: r.iter || PBKDF2_ITER } : null;
}
async function setAdminAuth(env, auth) {
  await dbRun(env.DB,
    'INSERT INTO admin_auth (k,salt,hash,iter) VALUES (?,?,?,?) '
    + 'ON CONFLICT(k) DO UPDATE SET salt=excluded.salt, hash=excluded.hash, iter=excluded.iter',
    ADMIN_AUTH_KEY, auth.salt, auth.hash, auth.iter);
}
/** 校验会话 token 是否有效（存在且未过期） */
async function validSession(env, token) {
  if (!token) return false;
  const s = await dbFirst(env.DB, 'SELECT * FROM admin_sessions WHERE token = ?', token);
  // 顺手清理过期会话，避免 admin_sessions 无限增长
  if (s && s.exp && s.exp <= nowMs()) {
    try { await dbRun(env.DB, 'DELETE FROM admin_sessions WHERE token = ?', token); } catch (e) {}
    return false;
  }
  return !!(s && s.exp && s.exp > nowMs());
}

/* ---------- 鉴权入口（写操作复用） ---------- */

/**
 * 写鉴权：优先会话 token（Authorization: Bearer <token>），
 * 兼容旧的 BLOG_WRITE_TOKEN 环境变量（静态长令牌）。
 * 未配置任何认证（无 auth、无 token）→ 拒绝（安全默认）。
 */
export async function isWriteAuthed(request, env) {
  if (!env || !env.DB) return false;
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
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, request, env);

  const setupKey = env.BLOG_ADMIN_SETUP_KEY;
  if (!setupKey) return json({ error: '未配置 BLOG_ADMIN_SETUP_KEY 环境变量，无法设置管理员密码' }, 500, request, env);
  const given = String(request.headers.get('X-Setup-Key') || '').trim();
  if (!safeEqual(given, setupKey)) return json({ error: '设置密钥无效' }, 403, request, env);

  if (await getAdminAuth(env)) return json({ error: '管理员密码已设置；如需重置，请先删除 D1 表 admin_auth 的 auth 行' }, 409, request, env);

  let body = null;
  try { body = await request.json(); } catch (e) {
    return json({ error: '请求体不是有效 JSON（检查是否含 BOM/引号被转义）' }, 400, request, env);
  }
  const password = String((body && body.password) || '');
  if (password.length < 8) return json({ error: '密码至少 8 位' }, 400, request, env);

  const salt = randomToken(16);
  const iter = PBKDF2_ITER;
  let hash;
  try { hash = await deriveKey(password, salt, iter); }
  catch (e) {
    console.error('[admin:setup] deriveKey failed:', e && e.message, e);
    return json({ error: '密码哈希计算失败（服务端）: ' + (e && e.message) }, 500, request, env);
  }
  try { await setAdminAuth(env, { salt, hash, iter }); }
  catch (e) {
    console.error('[admin:setup] D1 write failed:', e && e.message, e);
    return json({ error: '数据库写入失败（服务端）: ' + (e && e.message) }, 500, request, env);
  }
  return json({ ok: true, message: '管理员密码已设置' }, 201, request, env);
}

/** POST /api/admin/login — 密码登录，成功返回会话 token */
export async function handleAdminLogin(request, env) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, request, env);

  const ip = clientIp(request);
  // 限流：检查是否被锁定
  try {
    const fail = await dbFirst(env.DB, "SELECT * FROM admin_fails WHERE ip = ?", ip);
    if (fail && fail.until && fail.until > nowMs()) {
      const mins = Math.ceil((fail.until - nowMs()) / 60000);
      return json({ error: '尝试次数过多，请 ' + mins + ' 分钟后再试' }, 429, request, env);
    }
    // 清理已过期的失败记录，避免 admin_fails 表无限增长
    if (fail && fail.until && fail.until <= nowMs()) {
      try { await dbRun(env.DB, 'DELETE FROM admin_fails WHERE ip = ?', ip); } catch (e) {}
    }
  } catch (e) { /* 忽略读取失败 */ }

  const body = await request.json().catch(() => null);
  const password = String((body && body.password) || '');
  const auth = await getAdminAuth(env);
  if (!auth || !auth.hash || !auth.salt) {
    return json({ error: '尚未设置管理员密码（请先调用 /api/admin/setup）' }, 401, request, env);
  }

  const hash = await deriveKey(password, auth.salt, auth.iter || PBKDF2_ITER);
  if (!safeEqual(hash, auth.hash)) {
    let n = 1;
    try {
      const fail = await dbFirst(env.DB, "SELECT * FROM admin_fails WHERE ip = ?", ip);
      n = (fail && fail.n ? fail.n : 0) + 1;
    } catch (e) { /* ignore */ }
    const lock = n >= ADMIN_MAX_FAILS ? { n, until: nowMs() + ADMIN_LOCK_MS } : { n };
    await dbRun(env.DB, 'INSERT INTO admin_fails (ip,n,until) VALUES (?,?,?) '
      + 'ON CONFLICT(ip) DO UPDATE SET n=excluded.n, until=excluded.until', ip, lock.n, lock.until || 0);
    return json({ error: '密码错误' }, 401, request, env);
  }

  // 成功：清除失败计数，签发会话 token
  try { await dbRun(env.DB, 'DELETE FROM admin_fails WHERE ip = ?', ip); } catch (e) { /* ignore */ }
  const token = randomToken(32);
  await dbRun(env.DB, 'INSERT INTO admin_sessions (token,exp) VALUES (?,?)', token, nowMs() + ADMIN_SESSION_TTL * 1000);
  return json({ ok: true, token, expiresIn: ADMIN_SESSION_TTL }, 200, request, env);
}

/** POST /api/admin/logout — 撤销当前会话 token */
export async function handleAdminLogout(request, env) {
  if (!env || !env.DB) return json({ error: DB_ERR }, 500, request, env);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, request, env);
  const auth = String(request.headers.get('Authorization') || '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (m) { try { await dbRun(env.DB, 'DELETE FROM admin_sessions WHERE token = ?', m[1].trim()); } catch (e) { /* ignore */ } }
  return json({ ok: true }, 200, request, env);
}
