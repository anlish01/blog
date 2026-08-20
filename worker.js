/* ============================================================
 * 轻语博客 · Cloudflare Workers 入口
 * ------------------------------------------------------------
 * 职责：
 *   · /api/posts 与 /api/posts/:id → Cloudflare KV 存储 API
 *   · 其余请求 → 静态资源（由 wrangler.toml [assets] 绑定提供）
 * 部署：npx wrangler deploy
 * ============================================================ */
import { handlePosts, handlePostId, handleFeed, handleComments, handleCommentId, handleSitemap, handleStats, handleAdminSetup, handleAdminLogin, handleAdminLogout } from './functions/_lib/api-core.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API 路由
    if (url.pathname === '/api/posts') {
      return handlePosts(request, env);
    }
    if (url.pathname === '/api/admin/setup') {
      return handleAdminSetup(request, env);
    }
    if (url.pathname === '/api/admin/login') {
      return handleAdminLogin(request, env);
    }
    if (url.pathname === '/api/admin/logout') {
      return handleAdminLogout(request, env);
    }
    if (url.pathname === '/api/feed.xml') {
      return handleFeed(request, env);
    }
    if (url.pathname === '/api/sitemap.xml') {
      return handleSitemap(request, env);
    }
    let match = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments\/([^/]+)$/);
    if (match) {
      return handleCommentId(request, env, decodeURIComponent(match[1]), decodeURIComponent(match[2]));
    }
    match = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
    if (match) {
      return handleComments(request, env, decodeURIComponent(match[1]));
    }
    match = url.pathname.match(/^\/api\/posts\/([^/]+)\/stats$/);
    if (match) {
      return handleStats(request, env, decodeURIComponent(match[1]));
    }
    match = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
    if (match) {
      return handlePostId(request, env, decodeURIComponent(match[1]));
    }

    // 静态资源（index.html / style.css / app.js / …）
    if (env.ASSETS) {
      const res = await env.ASSETS.fetch(request);
      // SPA 回退：干净路径 / 首页 / 归档 / 关于 / 标签 / /posts/<别名>/ /admin / /write，
      // 以及 /api 以外的任何无扩展名路径，都返回 index.html（由前端 app.js 依据 pathname 渲染）。
      if (res.status === 404 && !/\.[a-zA-Z0-9]+$/.test(url.pathname)) {
        const idx = await env.ASSETS.fetch(new Request(url.origin + '/', request));
        if (idx.status === 200) return idx;
        return res;
      }
      return res;
    }
    return new Response('Not Found', { status: 404 });
  }
};