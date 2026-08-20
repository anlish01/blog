/* Cloudflare Pages Functions · /api/posts
 * GET  → 文章列表    POST → 新建文章
 * 数据存储于 KV 命名空间 BLOG（见 wrangler.toml）
 */
import { handlePosts } from '../../shared/api-core.js';

export async function onRequestGet(context) {
  return handlePosts(context.request, context.env);
}

export async function onRequestPost(context) {
  return handlePosts(context.request, context.env);
}

export async function onRequestOptions(context) {
  return handlePosts(context.request, context.env);
}