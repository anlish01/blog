/* Cloudflare Pages Functions · /api/media/:id
 * DELETE → 删除媒体 */
import { handleMediaId } from '../../_lib/api-core.js';

export async function onRequest(context) {
  return handleMediaId(context.request, context.env, context.params.id);
}
