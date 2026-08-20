/* ============================================================
 * 轻语博客 · 导入示例数据到云端 API
 * ------------------------------------------------------------
 * 用法：
 *   node seed.js https://your-blog.pages.dev
 *   node seed.js https://your-blog.workers.dev
 * 会把 public/posts.js 里的示例文章逐篇 POST 到 /api/posts，
 * 已存在的 id 自动跳过（幂等，可重复执行）。
 * ============================================================ */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

async function main() {
  const base = process.argv[2];
  if (!base) {
    console.error('用法：node seed.js <站点地址>\n示例：node seed.js https://qingyu-blog.pages.dev');
    process.exit(1);
  }

  // 解析 posts.js（JS 字面量，非 JSON）
  const src = fs.readFileSync(path.join(__dirname, 'public', 'posts.js'), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const posts = sandbox.window.BLOG_POSTS || [];

  const api = base.replace(/\/+$/, '') + '/api/posts';
  console.log('目标 API：' + api);

  let created = 0, skipped = 0, failed = 0;
  for (const p of posts) {
    try {
      const r = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (r.status === 201) { created++; console.log('  ✅ 已创建：' + p.title); }
      else if (r.status === 409) { skipped++; console.log('  ⏭ 已存在：' + p.title); }
      else { failed++; console.log('  ❌ 失败(' + r.status + ')：' + p.title + ' — ' + ((await r.json().catch(() => ({}))).error || '')); }
    } catch (e) {
      failed++;
      console.log('  ❌ 请求异常：' + p.title + ' — ' + e.message);
    }
  }

  console.log(`\n完成：新建 ${created} / 跳过 ${skipped} / 失败 ${failed}`);
  console.log('打开站点后应在右上角看到「📡 在线」标识（云端模式）。');
  process.exit(failed ? 1 : 0);
}

main();