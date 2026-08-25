/* Cloudflare Pages Functions · /api/media
 * GET → 媒体列表   POST → 新增媒体（url 为 data URL 或外链） */
import { handleMedia } from '../_lib/api-core.js';

export async function onRequest(context) {
  return handleMedia(context.request, context.env);
}
