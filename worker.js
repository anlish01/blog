/* ============================================================
 * 轻语博客 · Cloudflare Workers 入口
 * ------------------------------------------------------------
 * 职责：
 *   · /api/posts 与 /api/posts/:id → Cloudflare D1 存储 API
 *   · 其余请求 → 静态资源（由 wrangler.workers.toml [assets] 绑定提供）
 * 部署：npx wrangler deploy
 * ============================================================ */
import { handlePosts, handlePostId, handleFeed, handleComments, handleCommentId, handleSitemap, handleSiteFiles, handleStats, handleAdminSetup, handleAdminLogin, handleAdminLogout } from './functions/_lib/api-core.js';

export default {
  async fetch(request, env) {
    try {
      return await this.handle(request, env);
    } catch (e) {
      // 全局兜底：任何未捕获异常都返回 JSON 错误（含消息），便于远程定位
      console.error('[worker] unhandled error:', e && e.message, e && e.stack);
      return new Response(JSON.stringify({
        ok: false,
        error: '服务端内部错误: ' + (e && e.message ? e.message : String(e))
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  },

  async handle(request, env) {
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
    match = url.pathname.match(/^\/api\/site-files\/([^/]+)$/);
    if (match) {
      return handleSiteFiles(request, env, decodeURIComponent(match[1]));
    }
    if (url.pathname === '/api/site-files') {
      return handleSiteFiles(request, env);
    }

    // 未知 /api/* 路径：返回 JSON 404，绝不回退到 index.html（避免 API 调用方收到 HTML）
    if (url.pathname === '/api' || url.pathname.indexOf('/api/') === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    // 静态资源（index.html / style.css / app.js / …）
    if (env.ASSETS) {
      const res = await env.ASSETS.fetch(request);
      // SPA 回退：干净路径 / 首页 / 归档 / 关于 / 标签 / /posts/<别名>/ /admin / /write，
      // 以及 /api 以外的任何无扩展名路径，都返回 index.html（由前端 app.js 依据 pathname 渲染）。
      // 仅对 GET/HEAD 回退：POST 等非幂等方法拿到 HTML 会误导调用方。
      if (res.status === 404 && (request.method === 'GET' || request.method === 'HEAD') && !/\.[a-zA-Z0-9]+$/.test(url.pathname)) {
        const idx = await env.ASSETS.fetch(new Request(url.origin + '/', request));
        if (idx.status === 200) return idx;
        return res;
      }
      return res;
    }
    return new Response('Not Found', { status: 404 });
  }
};