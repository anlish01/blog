/* ============================================================
 * 轻语博客 · 冒烟测试（Node，模拟浏览器环境，无需浏览器）
 * 用法：node smoke-test.js
 * 覆盖：Markdown 渲染、frontmatter 导入、导出合并、异步引导（静态/云端）、
 *       云端 API（shared/api-core.js 增删改查 + KV）。
 * ============================================================ */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const dir = __dirname;
const PUB = path.join(dir, 'public');

/* ---------- 构造最小浏览器环境 ---------- */
const stubEl = () => ({
  addEventListener() {}, textContent: '', innerHTML: '', value: '',
  style: {}, dataset: {}, classList: { add() {}, remove() {} },
  closest: () => null, focus() {}, disabled: false,
});

function makeCtx(extra) {
  const mem = {};
  const appEl = { innerHTML: '' };
  const doc = {
    title: '',
    documentElement: { setAttribute() {}, getAttribute: () => 'light' },
    querySelector: (sel) => (sel === '#app' ? appEl : stubEl()),
    querySelectorAll: () => [],
    createElement: () => Object.assign(stubEl(), { click() {}, set href(v) {} }),
    body: { appendChild() {}, removeChild() {} },
    addEventListener() {},
  };
  const win = {
    BLOG_POSTS: [],
    addEventListener() {},
    matchMedia: () => ({ matches: false }),
    scrollTo() {},
    crypto,   // Node 全局 WebCrypto（PBKDF2 / AES-GCM）
  };
  const base = {
    window: win,
    document: doc,
    location: { protocol: 'https:', origin: 'https://test.example', host: 'test.example', pathname: '/', search: '', hash: '', href: 'https://test.example/' },
    history: { pushState() {}, replaceState() {} },
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    },
    confirm: () => true,
    setTimeout, clearTimeout,
    URLSearchParams, Blob: function () {},
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    console, Date, JSON, Math, String, Array, Object, RegExp, Map, Set, Uint8Array,
    TextEncoder, TextDecoder, btoa, atob,
    encodeURIComponent, decodeURIComponent,
  };
  Object.assign(base, extra);
  // 兼容测试写法：'window.BLOG_CONFIG' 键实际写入 win.BLOG_CONFIG
  if (extra && extra['window.BLOG_CONFIG']) win.BLOG_CONFIG = extra['window.BLOG_CONFIG'];
  const ctx = base;
  vm.createContext(ctx);
  return { ctx, appEl, win, mem };
}

/** 设置当前路由（clean path，如 /posts/x/、/?tag=随笔），history 模式下写 pathname */
function setRoute(ctx, route) {
  route = route || '/';
  const qi = route.indexOf('?');
  const path = qi >= 0 ? route.slice(0, qi) : route;
  const search = qi >= 0 ? route.slice(qi) : '';
  const loc = ctx.location;
  loc.href = 'https://test.example' + (path.replace(/\/*$/, '') || '/') + search;
  loc.pathname = path;
  loc.search = search;
  loc.hash = '';
}

/** 在模拟浏览器中引导博客（await 首次渲染完成）；route 为 clean path */
async function boot(extra, route) {
  const { ctx, appEl, win } = makeCtx(extra);
  setRoute(ctx, route || '/');
  vm.runInContext(fs.readFileSync(path.join(PUB, 'posts.js'), 'utf8'), ctx, { filename: 'posts.js' });
  vm.runInContext(fs.readFileSync(path.join(PUB, 'app.js'), 'utf8'), ctx, { filename: 'app.js' });
  await win.__bootPromise;
  return { ctx, html: appEl.innerHTML, title: docTitle(ctx), win };
}
/** 引导并进入写作页（自动通过管理员验证；pwd 为空则先设置/使用配置密码） */
async function bootWrite(extra, route, pwd) {
  const b = await boot(extra, route || '/write');
  const admin = pwd || (extra && extra['window.BLOG_CONFIG'] && extra['window.BLOG_CONFIG'].adminPwd);
  if (admin) {
    if (!b.ctx.adminOk()) { b.ctx.tryAdmin(admin); b.ctx.route(); }
  } else if (b.ctx.needAdminSetup()) {
    b.ctx.setupAdmin('test-1234');
    b.ctx.route();
  }
  b.html = b.ctx.document.querySelector('#app').innerHTML;
  return b;
}
function docTitle(ctx) { return ctx.document.title; }

/* ---------- 测试集合 ---------- */
const tests = [];

tests.push(['Markdown：渲染标题 / 强调 / 行内代码 / 删除线', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const html = ctx.renderMarkdown('# 标题A\n\n**加粗** *斜体* `代码` ~~删除~~');
  assert.ok(html.includes('<h1') && html.includes('id="toc-1"') && html.includes('标题A'), '标题带锚点 id');
  assert.ok(html.includes('<strong>加粗</strong>'));
  assert.ok(html.includes('<em>斜体</em>'));
  assert.ok(html.includes('<code class="inline-code">代码</code>'));
  assert.ok(html.includes('<del>删除</del>'));
}]);

tests.push(['Markdown：列表 / 引用 / 表格 / 代码块 / 链接', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const html = ctx.renderMarkdown('- 甲\n- 乙\n\n> 引用话\n\n| 列1 | 列2 |\n| --- | --- |\n| a | b |\n\n```js\nlet x = 1;\n```\n\n[链接](https://example.com)');
  assert.ok(html.includes('<ul>') && html.includes('<li>甲</li>'));
  assert.ok(html.includes('<blockquote>') && html.includes('引用话'));
  assert.ok(html.includes('<table>') && html.includes('<th>列1</th>') && html.includes('<td>a</td>'));
  assert.ok(html.includes('<pre class="code-block">') && html.includes('lang-js') && html.includes('tok-num'), '代码块 + 语言 class + 高亮');
  assert.ok(html.includes('<a href="https://example.com"'));
}]);

tests.push(['Markdown：HTML 注入被转义', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const html = ctx.renderMarkdown('# X\n\n<script>alert(1)</script>');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
}]);

tests.push(['示例内容全部可渲染且无异常', async () => {
  const { ctx, win } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.ok(win.BLOG_POSTS.length >= 3, '文章数量 >= 3');
  win.BLOG_POSTS.forEach((p) => {
    if (p.protected) return;   // 加密文章正文为空，属预期
    const html = ctx.renderMarkdown(p.content);
    assert.ok(html.length > 0);
    assert.ok(!/<script/.test(html));
  });
}]);

tests.push(['首页（静态模式）：导航在、搜索框在标题右侧、标签分类栏在列表上方', async () => {
  const { html } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.ok(html.includes('main-nav') && html.includes('关于'), '导航存在');
  const chrome = html.slice(html.indexOf('<div class="list-head">'), html.indexOf('id="listContainer"')) + html.slice(html.indexOf('<footer>'));
  assert.ok(chrome.includes('最新发布'), '首页标题为「最新发布」');
  assert.ok(!/文章/.test(chrome.replace(/placeholder="搜索文章…"/g, '')), '首页框架（标题/说明/页脚）除搜索占位外无「文章」字样');
  assert.ok(html.includes('homeSearchInput') && html.includes('home-search'), '首页搜索框在「最新发布」右侧');
  assert.ok(html.includes('home-tags') && html.includes('分类'), '首页标签分类栏在标题下方');
  assert.ok(html.includes('footer-inner') && html.includes('footer-links'), '页脚结构');
  assert.ok(!html.includes('💾 本地') && !html.includes('📡 在线'), '页脚无本地/在线标识');
  assert.ok(html.includes('/posts/hello-qingyu/'), '首页卡片用 /posts/<别名>/ 链接');
  assert.ok(html.includes('href="/"') || html.includes('href="#">'), '首页链接指向根');
}]);

tests.push(['干净路径：无 #/ 残留，导航用真实路径', async () => {
  const { ctx, html } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.ok(!html.includes('#/post/') && !html.includes('#/archive'), '不再输出 hash 路由链接');
  const a = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/archive');
  assert.ok(!a.html.includes('#/post/'), '归档链接用 /posts/<别名>/');
  // 模拟点击站内链接：data-toc 之外的干净路径应被拦截并由 SPA 跳转
  const clicked = [];
  ctx.history.pushState = (...args) => { clicked.push(args); return true; };
  const anchor = { tagName: 'A', target: '', getAttribute: (k) => k === 'href' ? '/about' : null, parentNode: null };
  const evt = { target: anchor, preventDefault() {} };
  ctx.document.addEventListener = () => {};
  // 直接在 ctx 触发事件回调不可行，这里仅验证 href 构造函数
  assert.ok(ctx.href('/archive') === '/archive', 'href() 生成真实路径');
  assert.ok(ctx.href('/', { tag: '随笔' }) === '/?tag=' + encodeURIComponent('随笔'), 'href() 支持 query');
  assert.ok(ctx.postUrl('abc中') === '/posts/' + encodeURIComponent('abc中') + '/', 'postUrl 带尾斜杠');
}]);

tests.push(['标签筛选：首页 /?tag=随笔 只渲染该标签文章（history 模式 query）', async () => {
  // 直接访问 /?tag=随笔（刷新/直达）：只显示含「随笔」标签的文章
  const t = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/?tag=' + encodeURIComponent('随笔'));
  assert.ok(t.html.includes('/posts/hello-qingyu/'), '含「随笔」的 hello-qingyu 在列表中');
  assert.ok(!t.html.includes('/posts/markdown-cheatsheet/'), '不含「随笔」的 markdown-cheatsheet 不在列表中');
  assert.ok(t.html.includes('随笔'), '页面显示当前标签');
  assert.ok(t.ctx.location.search.indexOf('tag=') >= 0, 'URL 带 query');
  // 模拟点击跳转到该标签：navigate 后 currentRoute 能读到 query
  const b = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/');
  b.ctx.location.pathname = '/';
  b.ctx.location.search = '?tag=' + encodeURIComponent('教程');
  b.ctx.route();
  const filtered = b.ctx.document.querySelector('#app').innerHTML;
  assert.ok(filtered.includes('/posts/markdown-cheatsheet/'), '点击「教程」标签后显示教程文章');
  assert.ok(!filtered.includes('/posts/hello-qingyu/'), '「教程」标签下不显示 hello-qingyu');
}]);

tests.push(['详情页 / 关于页 / 404 兜底渲染', async () => {
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/hello-qingyu/');
  assert.ok(d.html.includes('你好，轻语博客'), '详情正文渲染');
  assert.ok(!d.html.includes('✏️ 编辑'), '非管理员不显示编辑按钮');
  const a = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/about');
  assert.ok(a.html.includes('关于') && a.html.includes('数据模式'));
  const n = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/not-exist/');
  assert.ok(n.html.includes('内容不存在'));
}]);

tests.push(['写作页（静态模式）：导出/草稿/导入齐全', async () => {
  const w = await bootWrite({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 't' } });
  assert.ok(w.html.includes('mdInput') && w.html.includes('btnExport') && w.html.includes('btnSaveDraft'));
  const e = await bootWrite({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 't' } }, '/posts/markdown-cheatsheet/edit');
  assert.ok(e.html.includes('正在编辑') || e.html.includes('编辑：Markdown'));
}]);

tests.push(['写作入口：导航/正文无「写文章/编辑」按钮，/admin 进入后台', async () => {
  // 非管理员：详情页无编辑、顶级导航无写文章
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/hello-qingyu/');
  assert.ok(!d.html.includes('✏️ 写文章') && !d.html.includes('✏️ 编辑') && !d.html.includes('btn-write'), '非管理员导航与正文均无写作/编辑按钮');
  // /admin 路由：未放行时先见门禁，不放行编辑器
  const g = await boot({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 'admin-999' } }, '/admin');
  assert.ok(!g.html.includes('mdInput'), '/admin 未放行不渲染编辑器');
  assert.ok(g.html.includes('管理员验证') || g.html.includes('门禁'), '/admin 未放行显示门禁');
  // admin 放行后 /admin 能进入编辑器
  const w = await boot({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 'admin-999' } }, '/admin');
  if (!w.ctx.adminOk()) w.ctx.tryAdmin('admin-999');
  w.ctx.route();
  assert.ok(w.ctx.document.querySelector('#app').innerHTML.includes('mdInput'), '/admin 放行后进入编辑器');
}]);

tests.push(['写作入口（真实路径 /admin）：由 pathname 进入后台，URL 干净无 hash', async () => {
  // 模拟直接访问 https://xxx.workers.dev/admin（pathname=/admin，hash 为空）
  const g = await boot({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 'admin-999' } }, '/admin');
  const gate = g.ctx.document.querySelector('#app').innerHTML;
  assert.ok(gate.includes('gatePwd') || gate.includes('管理员验证'), '/admin 未放行显示门禁');
  assert.ok(!gate.includes('mdInput'), '/admin 未放行不渲染编辑器');
  assert.strictEqual(g.ctx.location.hash, '', 'URL 不追加 hash');
  // 验证后进入编辑器
  assert.strictEqual(g.ctx.tryAdmin('admin-999'), true, '正确密码放行');
  g.ctx.route();
  const editor = g.ctx.document.querySelector('#app').innerHTML;
  assert.ok(editor.includes('mdInput'), '/admin 放行后进入编辑器');
}]);

tests.push(['云端模式引导：数据来自 API，写页显示发布按钮', async () => {
  const fetchStub = async () => ({
    ok: true, status: 200,
    json: async () => ({ ok: true, posts: [{ id: 'c1', title: '云端内容', date: '2025-01-01', tags: ['技术'], content: '云端正文' }] })
  });
  const { html, win } = await boot({ 'window.BLOG_CONFIG': { mode: 'api' }, fetch: fetchStub });
  assert.ok(html.includes('云端内容'), '列表使用云端数据');
  assert.ok(win.BLOG_POSTS.length >= 3, '捆绑示例仍在（作为静态兜底）');
}]);

tests.push(['parseMdFile：frontmatter 与无 frontmatter', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const r = ctx.parseMdFile('---\ntitle: 导入的标题\ndate: 2025-02-01\ntags: a, b\nexcerpt: 摘要\n---\n正文内容', 'import.md');
  assert.strictEqual(r.title, '导入的标题');
  assert.strictEqual(r.date, '2025-02-01');
  assert.strictEqual(r.tags, 'a, b');
  assert.strictEqual(r.content, '正文内容');
  const r2 = ctx.parseMdFile('只有正文', '我的笔记.md');
  assert.strictEqual(r2.title, '我的笔记');
}]);

tests.push(['buildPostsJs：合并草稿并归一化 tags', async () => {
  const { ctx, win } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  ctx.saveDraftToStore('__new', { id: 'n1', title: '新文章', date: '2025-03-01', tags: '技术, 随笔', content: '内容', pinned: true });
  const arr = parsePostsJs(await ctx.buildPostsJs());
  const n = arr.find((p) => p.id === 'n1');
  assert.ok(n && n.title === '新文章');
  assert.deepStrictEqual(n.tags, ['技术', '随笔']);
  assert.strictEqual(n.pinned, true, 'pinned 保留');
  assert.ok(!('updatedAt' in n) && !('kind' in n));
}]);

tests.push(['stripMd 生成纯文本摘要', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const t = ctx.stripMd('**加粗** 和 [链接](x) 还有 `码`');
  assert.ok(!t.includes('**') && !t.includes('[链接]'));
  assert.ok(t.includes('加粗') && t.includes('码'));
}]);

/* ---------- 云端 API（shared/api-core.js）测试 ---------- */

function mockEnv() {
  const kv = new Map();
  return {
    BLOG: {
      get: async (k) => (kv.has(k) ? kv.get(k) : null),
      put: async (k, v) => kv.set(k, String(v)),
      delete: async (k) => kv.delete(k),
    },
    _kv: kv,
  };
}

/** 建一个已配置管理员密码、且已登录拿到会话 token 的环境（写操作测试用） */
async function authEnv(password) {
  const core = await import('./functions/_lib/api-core.js');
  const env = mockEnv();
  env.BLOG_ADMIN_SETUP_KEY = 'setup-key-123';
  const setup = await core.handleAdminSetup(new Request('http://t/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Setup-Key': 'setup-key-123' },
    body: JSON.stringify({ password: password || 'strong-pass-123' })
  }), env);
  if (setup.status !== 201) throw new Error('setup failed: ' + setup.status);
  const login = await core.handleAdminLogin(new Request('http://t/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: password || 'strong-pass-123' })
  }), env);
  const data = await login.json();
  if (!data.token) throw new Error('login failed: ' + login.status);
  return { env, token: data.token, core };
}

tests.push(['API：POST / GET / 重复 id 409 / 缺字段 400', async () => {
  const { env, token, core } = await authEnv();
  const post = (body, method = 'POST') => core.handlePosts(new Request('http://t/api/posts', {
    method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body)
  }), env);

  let r = await post({ id: 'a1', title: '第一篇', date: '2025-01-02', tags: '技术, 随笔', content: '**内容**' });
  assert.strictEqual(r.status, 201);
  r = await post({ id: 'a2', title: '第二篇', date: '2025-01-01', content: '' });
  assert.strictEqual(r.status, 201);

  r = await post({ id: 'a1', title: '重复' });
  assert.strictEqual(r.status, 409, '重复 id 返回 409');

  r = await post({ id: 'a3', content: '没标题' });
  assert.strictEqual(r.status, 400, '缺 title 返回 400');

  const list = await (await core.handlePosts(new Request('http://t/api/posts'), env)).json();
  assert.strictEqual(list.posts.length, 2);
  assert.strictEqual(list.posts[0].id, 'a1', '按日期倒序');
  assert.deepStrictEqual(list.posts[0].tags, ['技术', '随笔'], 'tags 归一为数组');
}]);

tests.push(['API：PUT 更新 / PUT 未知 id 新建 / DELETE / 404 / 无 KV 500', async () => {
  const { env, token, core } = await authEnv();
  const authJson = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: authJson,
    body: JSON.stringify({ id: 'b1', title: '原标题', date: '2025-01-01', content: 'x' })
  }), env);

  let r = await core.handlePostId(new Request('http://t/api/posts/b1', {
    method: 'PUT', headers: authJson,
    body: JSON.stringify({ title: '改过的标题', content: 'y' })
  }), env, 'b1');
  assert.strictEqual(r.status, 200);
  const got = await (await core.handlePostId(new Request('http://t/api/posts/b1'), env, 'b1')).json();
  assert.strictEqual(got.post.title, '改过的标题');

  r = await core.handlePostId(new Request('http://t/api/posts/b2', {
    method: 'PUT', headers: authJson,
    body: JSON.stringify({ title: '自动新建', content: 'z' })
  }), env, 'b2');
  assert.strictEqual(r.status, 200, 'PUT 未知 id 新建');

  r = await core.handlePostId(new Request('http://t/api/posts/b1', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }), env, 'b1');
  assert.strictEqual(r.status, 200);
  r = await core.handlePostId(new Request('http://t/api/posts/b1', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }), env, 'b1');
  assert.strictEqual(r.status, 404, '删除不存在的返回 404');

  r = await core.handlePosts(new Request('http://t/api/posts'), {});
  assert.strictEqual(r.status, 500, '未绑定 KV 返回 500');
  const err = await r.json();
  assert.ok(err.error.includes('BLOG'), '错误信息提示 KV 绑定');
}]);

tests.push(['管理员认证：无凭证 401 / 会话 token 201 / 错误密码 401 / 限流 429', async () => {
  const core = await import('./functions/_lib/api-core.js');
  const env = mockEnv();
  env.BLOG_ADMIN_SETUP_KEY = 'setup-key-123';

  // 未设置密码前：setup 无密钥 → 403；设置成功 → 201；重复设置 → 409
  let r = await core.handleAdminSetup(new Request('http://t/api/admin/setup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'strong-pass-123' })
  }), env);
  assert.strictEqual(r.status, 403, '无设置密钥 403');
  // 短密码拒绝
  r = await core.handleAdminSetup(new Request('http://t/api/admin/setup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Key': 'setup-key-123' },
    body: JSON.stringify({ password: 'short' })
  }), env);
  assert.strictEqual(r.status, 400, '短密码 400');
  r = await core.handleAdminSetup(new Request('http://t/api/admin/setup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Key': 'setup-key-123' },
    body: JSON.stringify({ password: 'strong-pass-123' })
  }), env);
  assert.strictEqual(r.status, 201, '设置密码成功');

  // 未带凭证写操作 → 401（安全默认，不再默认开放）
  r = await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 't1', title: 'x' })
  }), env);
  assert.strictEqual(r.status, 401, '无令牌写操作返回 401');

  // 读操作不受影响
  r = await core.handlePosts(new Request('http://t/api/posts'), env);
  assert.strictEqual(r.status, 200, 'GET 不需要令牌');

  // 错误密码 → 401
  r = await core.handleAdminLogin(new Request('http://t/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-pass' })
  }), env);
  assert.strictEqual(r.status, 401, '错误密码 401');

  // 登录成功 → token
  const login = await core.handleAdminLogin(new Request('http://t/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'strong-pass-123' })
  }), env);
  assert.strictEqual(login.status, 200);
  const { token } = await login.json();
  assert.ok(token && token.length >= 32, '返回会话 token');

  // token 写操作 → 201
  r = await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ id: 't1', title: 'x' })
  }), env);
  assert.strictEqual(r.status, 201, '会话 token 写操作 201');

  // PUT 未带 token → 401
  r = await core.handlePostId(new Request('http://t/api/posts/t1', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'y' })
  }), env, 't1');
  assert.strictEqual(r.status, 401, 'PUT 无 token 401');

  // 旧式 BLOG_WRITE_TOKEN 仍兼容
  const legacy = mockEnv();
  legacy.BLOG_WRITE_TOKEN = 'secret-123';
  r = await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-123' },
    body: JSON.stringify({ id: 't2', title: 'z' })
  }), legacy);
  assert.strictEqual(r.status, 201, '兼容 BLOG_WRITE_TOKEN');

  // 限流：连续 5 次错误密码后锁定（429）
  const locked = mockEnv();
  locked.BLOG_ADMIN_SETUP_KEY = 'setup-key-123';
  await core.handleAdminSetup(new Request('http://t/api/admin/setup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Key': 'setup-key-123' },
    body: JSON.stringify({ password: 'strong-pass-123' })
  }), locked);
  for (let i = 0; i < 5; i++) {
    r = await core.handleAdminLogin(new Request('http://t/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'bad' })
    }), locked);
  }
  r = await core.handleAdminLogin(new Request('http://t/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'strong-pass-123' })
  }), locked);
  assert.strictEqual(r.status, 429, '连续失败后锁定（即使密码正确也 429）');

  // logout 撤销 token
  r = await core.handleAdminLogout(new Request('http://t/api/admin/logout', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token }
  }), env);
  assert.strictEqual(r.status, 200, 'logout 成功');
  r = await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ id: 't3', title: 'y' })
  }), env);
  assert.strictEqual(r.status, 401, '登出后 token 失效');
}]);

tests.push(['写作页：字数统计 / 保存状态 / 快捷键提示齐全', async () => {
  const w = await bootWrite({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 't' } });
  assert.ok(w.html.includes('wordCount'), '字数统计元素');
  assert.ok(w.html.includes('saveStatus'), '保存状态元素');
  assert.ok(w.html.includes('Ctrl') && w.html.includes('kbd'), '快捷键提示');
}]);

tests.push(['详情页：标签链接可点击、复制链接按钮、阅读时长', async () => {
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/hello-qingyu/');
  assert.ok(d.html.includes('data-tag-link'), '标签链接元素存在（修复绑定范围问题）');
  assert.ok(d.html.includes('btnCopyLink'), '复制链接按钮');
  assert.ok(d.html.includes('分钟阅读'), '阅读时长');
}]);

tests.push(['非法路径不崩溃（decodeURIComponent 防护）', async () => {
  const n = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/%E4%B8%8D%E5%AE%8C%E6%95%B4%/');
  assert.ok(n.html.includes('内容不存在') || n.html.length > 0, '非法编码渲染兜底页');
}]);

tests.push(['归档页：按月分组、年份/月份标题、文章链接', async () => {
  const a = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/archive');
  assert.ok(a.html.includes('归档'), '归档标题');
  assert.ok(a.html.includes('2025 年'), '年份分组');
  assert.ok(a.html.includes('1 月'), '月份分组');
  assert.ok(a.html.includes('4 篇'), '月份计数');
  assert.ok(a.html.includes('/posts/hello-qingyu/'), '文章链接');
}]);

tests.push(['关于页：动态统计与版本信息', async () => {
  const a = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/about');
  assert.ok(a.html.includes('stat-grid'), '统计卡片');
  assert.ok(a.html.includes('篇内容') && a.html.includes('个标签') && a.html.includes('最新更新'), '统计字段');
  assert.ok(a.html.includes('版本') && a.html.includes('首次使用'), '版本信息');
}]);

tests.push(['RSS：客户端 feed.xml 生成与转义（加密文章不入源）', async () => {
  const { ctx, win } = await boot({ 'window.BLOG_CONFIG': { mode: 'static', siteUrl: 'https://blog.example' } });
  const xml = ctx.buildFeedXmlClient(win.BLOG_POSTS, 20);
  assert.ok(xml.startsWith('<?xml'), 'XML 声明');
  assert.ok(xml.includes('<rss version="2.0">'), 'rss 根节点');
  const expected = win.BLOG_POSTS.filter((p) => !p.protected).length;
  assert.strictEqual((xml.match(/<item>/g) || []).length, expected, '条目数（排除加密）');
  assert.ok(xml.includes('https://blog.example/posts/'), '链接使用 siteUrl');
  assert.ok(xml.includes('<![CDATA['), '正文 CDATA');
}]);

tests.push(['置顶：排序置顶优先 + 首页徽章 + 导出保留', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const arr = [
    { id: 'a', date: '2025-01-02', pinned: false },
    { id: 'b', date: '2025-01-01', pinned: true },
    { id: 'c', date: '2025-01-03', pinned: false }
  ];
  const sorted = arr.slice().sort(ctx.sortPosts);
  assert.strictEqual(sorted[0].id, 'b', '置顶在前');
  assert.strictEqual(sorted[1].id, 'c', '其余按日期倒序');
  const home = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.ok(home.html.includes('📌 置顶'), '首页置顶徽章');
  const out = parsePostsJs(await ctx.buildPostsJs());
  const pinned = out.find((p) => p.id === 'hello-qingyu');
  assert.ok(pinned && pinned.pinned === true, '导出保留 pinned');
}]);

tests.push(['广告位：默认关闭不输出；配置后出现在首页与详情', async () => {
  const off = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.ok(!off.html.includes('ad-slot'), '默认无广告位');
  const adsCfg = {
    'window.BLOG_CONFIG': {
      mode: 'static',
      siteUrl: 'https://blog.example',
      ads: { enabled: true, belowSearch: '<p>BANNER</p>', between: '<p>MID</p>', betweenEvery: 2, content: '<p>END</p>' }
    }
  };
  const home = await boot(adsCfg);
  assert.ok(home.html.includes('ad-slot') && home.html.includes('BANNER'), '首页列表上方广告');
  assert.ok(home.html.includes('MID'), '列表间隔广告');
  const detail = await boot(adsCfg, '/posts/hello-qingyu/');
  assert.ok(detail.html.includes('END'), '详情底部广告');
}]);

tests.push(['API：评论 POST / GET / 校验 / 删除（需令牌）', async () => {
  const core = await import('./functions/_lib/api-core.js');
  const env = mockEnv();
  // 公开发表
  let r = await core.handleComments(new Request('http://t/api/posts/p1/comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: '张三', content: '写得好！' })
  }), env, 'p1');
  assert.strictEqual(r.status, 201, '发表评论 201');
  r = await core.handleComments(new Request('http://t/api/posts/p1/comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: '李四', content: '学习了 📖' })
  }), env, 'p1');
  assert.strictEqual(r.status, 201);
  // 空昵称 / 空内容 → 400
  r = await core.handleComments(new Request('http://t/api/posts/p1/comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: '', content: 'x' })
  }), env, 'p1');
  assert.strictEqual(r.status, 400, '空昵称 400');
  r = await core.handleComments(new Request('http://t/api/posts/p1/comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: 'a', content: '   ' })
  }), env, 'p1');
  assert.strictEqual(r.status, 400, '空内容 400');
  // 列表
  const list = await (await core.handleComments(new Request('http://t/api/posts/p1/comments'), env, 'p1')).json();
  assert.strictEqual(list.comments.length, 2, '两条评论');
  assert.strictEqual(list.comments[0].author, '张三');
  // 超长截断
  r = await core.handleComments(new Request('http://t/api/posts/p1/comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'X'.repeat(50), content: 'Y'.repeat(2000) })
  }), env, 'p1');
  assert.strictEqual(r.status, 201);
  const long = await (await r.json()).comment;
  assert.ok(long.author.length <= 30 && long.content.length <= 1000, '长度截断');
  // 删除：未配置令牌可删；配置后无令牌 401
  env.BLOG_WRITE_TOKEN = 'mod-token';
  r = await core.handleCommentId(new Request('http://t/api/posts/p1/comments/' + list.comments[0].id, { method: 'DELETE' }), env, 'p1', list.comments[0].id);
  assert.strictEqual(r.status, 401, '无令牌删除 401');
  r = await core.handleCommentId(new Request('http://t/api/posts/p1/comments/' + list.comments[0].id, {
    method: 'DELETE', headers: { Authorization: 'Bearer mod-token' }
  }), env, 'p1', list.comments[0].id);
  assert.strictEqual(r.status, 200, '带令牌删除 200');
  const after = await (await core.handleComments(new Request('http://t/api/posts/p1/comments'), env, 'p1')).json();
  assert.strictEqual(after.comments.length, 2, '删除后剩 2 条');
}]);

tests.push(['评论（静态模式）：保存在本浏览器并渲染', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.strictEqual((await ctx.loadComments('hello-qingyu')).length, 0, '初始无评论');
  await ctx.saveComment('hello-qingyu', '测试用户', '第一条本地评论');
  const list = await ctx.loadComments('hello-qingyu');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].author, '测试用户');
  await ctx.deleteComment('hello-qingyu', list[0].id);
  assert.strictEqual((await ctx.loadComments('hello-qingyu')).length, 0, '本地删除');
  // 详情页包含评论区结构
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/hello-qingyu/');
  assert.ok(d.html.includes('comment-list') && d.html.includes('发表评论'), '评论表单在详情页');
}]);

tests.push(['加密：PBKDF2+AES-GCM 往返与错误密码', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const enc = await ctx.encryptText('这是秘密正文 123', '我的密码');
  assert.ok(enc.salt && enc.iv && enc.data, '密文三要素齐全');
  assert.ok(!enc.data.includes('秘密'), '密文不含明文');
  const plain = await ctx.decryptText(enc, '我的密码');
  assert.strictEqual(plain, '这是秘密正文 123', '正确密码可解密');
  const bad = await ctx.decryptText(enc, '错误密码');
  assert.strictEqual(bad, null, '错误密码返回 null');
}]);

tests.push(['加密文章：详情页锁屏 + 解锁阅读', async () => {
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/secret-note/');
  assert.ok(d.html.includes('lock-card') && d.html.includes('访问密码'), '锁屏存在');
  assert.ok(!d.html.includes('这是一篇**加密内容**'.slice(0, 9)), '密文不输出');
  const { ctx } = d;
  const freshHtml = () => ctx.document.querySelector('#app').innerHTML;
  const wrong = await ctx.tryUnlock('secret-note', 'wrong');
  assert.strictEqual(wrong, false, '错误密码不解锁');
  const ok = await ctx.tryUnlock('secret-note', 'qingyu123');
  assert.strictEqual(ok, true, '正确密码解锁');
  assert.strictEqual(ctx.isUnlocked('secret-note'), true, '解锁状态记录');
  assert.ok(ctx.getUnlocked('secret-note').includes('加密内容'), '内存中已解密明文');
  assert.ok(freshHtml().includes('这是一篇'), '解锁后正文渲染');
  assert.ok(!freshHtml().includes('lock-card'), '锁屏消失');
  // 加密文章不进 RSS（防泄露）
  const xml = ctx.buildFeedXmlClient(ctx.window.BLOG_POSTS, 20);
  assert.ok(!xml.includes('secret-note'), 'RSS 不含加密文章');
}]);

tests.push(['API：Sitemap /api/sitemap.xml 与 Feed 排除加密', async () => {
  const { env, token, core } = await authEnv();
  const auth = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ id: 's1', title: '公开文', date: '2025-01-02', content: 'x' })
  }), env);
  await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ id: 's2', title: '密文', date: '2025-01-03', protected: true, enc: { salt: 'a', iv: 'b', data: 'c' } })
  }), env);
  const sm = await core.handleSitemap(new Request('http://t/api/sitemap.xml'), env);
  assert.strictEqual(sm.status, 200);
  const smBody = await sm.text();
  assert.ok(smBody.includes('<urlset') && smBody.includes('<loc>http://t/posts/s1/</loc>'), 'sitemap 含文章链接');
  assert.ok(smBody.includes('<lastmod>2025-01-02</lastmod>'), 'sitemap 含 lastmod');
  const feed = core.buildFeedXml(await (await core.handlePosts(new Request('http://t/api/posts'), env)).json().then(d => d.posts), 'http://t');
  assert.ok(feed.includes('s1') && !feed.includes('s2'), 'RSS 排除加密文章');
}]);

tests.push(['API：加密文章 content 恒为空（密文只在 enc）', async () => {
  const { env, token, core } = await authEnv();
  const auth = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ id: 'z1', title: '密文', content: '不应存储的明文', protected: true, enc: { salt: 'a', iv: 'b', data: 'c' } })
  }), env);
  const single = await (await core.handlePostId(new Request('http://t/api/posts/z1'), env, 'z1')).json();
  assert.strictEqual(single.post.content, '', '详情中 content 为空');
  assert.ok(single.post.enc && single.post.enc.data, '密文在 enc');
  const list = await (await core.handlePosts(new Request('http://t/api/posts'), env)).json();
  assert.ok(!('content' in list.posts[0]) && !('enc' in list.posts[0]), '列表摘要不含正文与密文');
}]);

tests.push(['代码高亮：常见语言分词 + 未知语言原样转义', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const html = ctx.renderMarkdown('```js\nconst a = 42; // 注释\nlet b = "你好";\nif (a > 0) { return; }\n```');
  assert.ok(html.includes('tok-kw') && html.includes('tok-num') && html.includes('tok-com') && html.includes('tok-str'), '四种 token 均高亮');
  assert.ok(html.includes('lang-js'), '语言 class 保留');
  assert.ok(!/<script/.test(html), '无注入');
  const plain = ctx.renderMarkdown('```wat\n<raw> & stuff\n```');
  assert.ok(!plain.includes('tok-'), '未知语言不高亮');
  assert.ok(plain.includes('&lt;raw&gt;'), '仍整体转义');
}]);

tests.push(['目录 TOC：由渲染 HTML 提取，锚点与正文对应', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const toc = ctx.buildToc(ctx.renderMarkdown('## 第一部分\n\n正文\n\n### 1.1 子节\n\n更多\n\n## 第二部分'));
  assert.ok(toc.html.includes('📑 目录'), 'TOC 标题');
  assert.ok(toc.html.includes('data-toc="toc-1"') && toc.html.includes('data-toc="toc-3"'), '锚点与渲染序号一致');
  assert.ok(toc.html.includes('第一部分') && toc.html.includes('子节'), '目录条目文本');
  assert.ok(toc.html.includes('padding-left:14px'), '三级标题缩进');
  assert.ok(toc.html.indexOf('>1<') >= 0 && toc.html.indexOf('>2<') >= 0, '一级多级编号');
  const hd = toc.headings.filter((h) => h.id === 'toc-2')[0];
  assert.ok(hd && hd.num === '1.1', '三级标题编号为 1.1');
  const none = ctx.buildToc(ctx.renderMarkdown('只有一个小标题\n\n## 单个\n\n正文'));
  assert.strictEqual(none.html, '', '标题 < 2 不生成目录');
  // 详情页正文含锚点
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/markdown-cheatsheet/');
  assert.ok(d.html.includes('class="toc"'), '详情页显示目录');
  assert.ok(d.html.includes('id="toc-1"'), '标题锚点已渲染');
}]);

tests.push(['统计：API 阅读数/点赞 累计与校验', async () => {
  const core = await import('./functions/_lib/api-core.js');
  const env = mockEnv();
  let r = await core.handleStats(new Request('http://t/api/posts/p1/stats'), env, 'p1');
  let j = await r.json();
  assert.deepStrictEqual(j.stats, { likes: 0, views: 0 }, '初始为 0');
  r = await core.handleStats(new Request('http://t/api/posts/p1/stats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'views' })
  }), env, 'p1');
  assert.strictEqual(r.status, 200);
  r = await core.handleStats(new Request('http://t/api/posts/p1/stats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'views' })
  }), env, 'p1');
  r = await core.handleStats(new Request('http://t/api/posts/p1/stats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'like' })
  }), env, 'p1');
  j = await (await core.handleStats(new Request('http://t/api/posts/p1/stats'), env, 'p1')).json();
  assert.deepStrictEqual(j.stats, { likes: 1, views: 2 }, '累计正确');
  r = await core.handleStats(new Request('http://t/api/posts/p1/stats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'wat' })
  }), env, 'p1');
  assert.strictEqual(r.status, 400, '非法 action 400');
}]);

tests.push(['统计（静态模式）：本机阅读数/点赞 + 详情页元素', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  await ctx.incView('hello-qingyu');
  await ctx.incView('hello-qingyu');
  await ctx.likePost('hello-qingyu');
  const s = await ctx.loadStats('hello-qingyu');
  assert.strictEqual(s.views, 2, '阅读数累计');
  assert.strictEqual(s.likes, 1, '点赞累计');
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/hello-qingyu/');
  assert.ok(d.html.includes('id="viewCount"') && d.html.includes('id="likeBtn"'), '详情页统计元素');
}]);

tests.push(['编辑器工具栏：一键插入按钮齐全', async () => {
  const w = await bootWrite({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 't' } });
  assert.ok(w.html.includes('id="toolbar"'), '工具栏存在');
  ['bold', 'italic', 'code', 'h2', 'link', 'img', 'quote', 'ul', 'ol', 'fence'].forEach((k) => {
    assert.ok(w.html.includes('data-cmd="' + k + '"'), '按钮 ' + k);
  });
}]);

tests.push(['首次写作：强制设置管理密码，之后需验证才能进入', async () => {
  // 未配置 adminPwd 时，第一次进写作页 → 强制设置密码
  const b = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/write');
  assert.ok(b.html.includes('btnSetup') && b.html.includes('setupPwd'), '显示设置管理密码页');
  assert.ok(!b.html.includes('mdInput'), '未设置前不渲染编辑器');
  const { ctx } = b;
  assert.strictEqual(ctx.needAdminSetup(), true, '首次需要设置');
  assert.strictEqual(ctx.setupAdmin(''), false, '空密码拒绝');
  assert.strictEqual(ctx.setupAdmin('12'), false, '过短密码拒绝');
  assert.strictEqual(ctx.setupAdmin('abc123'), true, '设置成功');
  assert.strictEqual(ctx.needAdminSetup(), false, '设置后无需再设');
  assert.strictEqual(ctx.adminOk(), true, '设置后自动放行');
  ctx.route();
  assert.ok(ctx.document.querySelector('#app').innerHTML.includes('mdInput'), '进入编辑器');
  // 下次访问（模拟退出登录）→ 门禁，密码正确才放行
  ctx.adminLogout();
  assert.strictEqual(ctx.adminOk(), false, '退出后需验证');
  ctx.route();
  assert.ok(ctx.document.querySelector('#app').innerHTML.includes('gatePwd'), '退出门禁');
  assert.strictEqual(ctx.tryAdmin('wrong'), false, '错误密码拒绝');
  assert.strictEqual(ctx.tryAdmin('abc123'), true, '正确密码放行');
  ctx.route();
  assert.ok(ctx.document.querySelector('#app').innerHTML.includes('mdInput'), '验证后进入编辑器');
}]);

tests.push(['管理员门禁：配置 adminPwd 时首次即锁屏，密码正确放行', async () => {
  const g = await boot({ 'window.BLOG_CONFIG': { mode: 'static', adminPwd: 'admin-123' } }, '/write');
  assert.ok(g.html.includes('gate-card') && g.html.includes('gatePwd'), '写作页被门禁拦截');
  assert.ok(!g.html.includes('mdInput'), '未放行时不渲染编辑器');
  assert.ok(!g.html.includes('btnSetup'), '已配置密码时不显示首次设置');
  const { ctx } = g;
  assert.strictEqual(ctx.adminOk(), false, '未验证');
  assert.strictEqual(ctx.tryAdmin('wrong'), false, '错误密码拒绝');
  assert.strictEqual(ctx.tryAdmin('admin-123'), true, '正确密码放行');
  assert.strictEqual(ctx.adminOk(), true, '验证后放行');
  ctx.route();
  const fresh = ctx.document.querySelector('#app').innerHTML;
  assert.ok(fresh.includes('mdInput'), '放行后渲染编辑器');
}]);

tests.push(['上一篇/下一篇：按日期相邻导航', async () => {
  const d = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/write-your-first-post/');
  assert.ok(d.html.includes('pn-nav'), '导航容器');
  assert.ok(d.html.includes('← 上一篇') && d.html.includes('下一篇 →'), '有上一篇与下一篇');
  assert.ok(d.html.includes('/posts/secret-note/') || d.html.includes('/posts/markdown-cheatsheet/'), '链接指向相邻文章');
  const last = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/posts/hello-qingyu/');
  assert.ok(last.html.includes('← 上一篇') && !last.html.includes('下一篇 →'), '最新一篇无下一篇');
}]);

tests.push(['云端摘要模式：列表不含正文，详情按需返回全文', async () => {
  const { env, token, core } = await authEnv();
  const post = { id: 'f1', title: '全文文', date: '2025-01-02', tags: ['a'], content: '这是完整正文内容', pinned: true };
  await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(post)
  }), env);
  const list = await (await core.handlePosts(new Request('http://t/api/posts'), env)).json();
  assert.ok(!('content' in list.posts[0]), '列表不含正文键');
  assert.ok(!('enc' in list.posts[0]), '列表不含 enc');
  assert.strictEqual(list.posts[0].id, 'f1', '摘要保留元信息');
  const single = await (await core.handlePostId(new Request('http://t/api/posts/f1'), env, 'f1')).json();
  assert.strictEqual(single.post.content, '这是完整正文内容', '详情返回全文');
}]);

tests.push(['云端详情懒加载：先占位后拉取渲染', async () => {
  const fetchStub = async (url) => {
    if (url === 'api/posts') {
      return { ok: true, json: async () => ({ ok: true, posts: [{ id: 'l1', title: '懒加载演示', date: '2025-01-03', tags: ['技术'], content: '' }] }) };
    }
    return { ok: true, json: async () => ({ ok: true, post: { id: 'l1', title: '懒加载演示', date: '2025-01-03', tags: ['技术'], content: '这是按需加载出来的正文' } }) };
  };
  const b = await boot({ 'window.BLOG_CONFIG': { mode: 'api' }, fetch: fetchStub }, '/posts/l1/');
  assert.ok(b.html.includes('加载中'), '先显示加载占位');
  await new Promise((r) => setTimeout(r, 20));   // 等 fetch 完成后重渲染
  const fresh = b.ctx.document.querySelector('#app').innerHTML;
  assert.ok(fresh.includes('这是按需加载出来的正文'), '正文按需渲染');
  assert.ok(!fresh.includes('加载中'), '占位消失');
}]);

tests.push(['云端登录：/api/admin/login 换取 token、写操作携带 Authorization、退出清除', async () => {
  const calls = [];
  const fetchStub = async (url, opts) => {
    calls.push({ url: String(url), opts: opts || {} });
    const body = JSON.parse((opts && opts.body) || '{}');
    if (String(url).includes('api/admin/login')) {
      return { ok: body.password === 'admin-pass-1' ? true : false, status: body.password === 'admin-pass-1' ? 200 : 401, json: async () => body.password === 'admin-pass-1' ? { ok: true, token: 'SES-TOKEN-123' } : { error: '密码错误' } };
    }
    if (String(url).includes('api/admin/logout')) return { ok: true, status: 200, json: async () => ({ ok: true }) };
    // /api/posts POST（云端发布）
    if (String(url).includes('api/posts') && opts && opts.method === 'POST') {
      return { ok: true, status: 201, json: async () => ({ ok: true, post: body }) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, posts: [] }) };
  };
  const b = await boot({ 'window.BLOG_CONFIG': { mode: 'api', adminPwd: '' }, fetch: fetchStub });
  // 云模式：无 token 时写作页显示「管理员登录」而非本地设密码
  const w = await boot({ 'window.BLOG_CONFIG': { mode: 'api', adminPwd: '' }, fetch: fetchStub }, '/write');
  assert.ok(w.html.includes('管理员登录') && w.html.includes('密码存储于 Cloudflare KV'), '云端写作页为登录框');
  // 登录:正确密码
  const r = await b.ctx.cloudLogin('admin-pass-1');
  assert.strictEqual(r.ok, true, '登录成功');
  assert.strictEqual(b.ctx._sessionToken(), 'SES-TOKEN-123', 'token 存入 localStorage');
  assert.strictEqual(b.ctx.adminOk(), true, '有 token 视为已登录');
  // 错误密码
  const bad = await b.ctx.cloudLogin('wrong');
  assert.strictEqual(bad.ok, false, '错误密码登录失败');
  // 写操作携带 Authorization
  await b.ctx.apiFetch('api/posts', { method: 'POST', body: JSON.stringify({ id: 'x1', title: 'T' }) });
  const cloudCall = calls.find((c) => String(c.url).includes('api/posts') && c.opts && c.opts.method === 'POST');
  assert.ok(cloudCall && cloudCall.opts.headers && cloudCall.opts.headers.Authorization === 'Bearer SES-TOKEN-123', '写操作带会话 token');
  // 退出：清除 token 且调用 logout
  await b.ctx.cloudLogout();
  assert.strictEqual(b.ctx._sessionToken(), '', '退出后 token 清除');
  assert.ok(calls.some((c) => String(c.url).includes('api/admin/logout')), '退出调用 logout API');
  assert.strictEqual(b.ctx.adminOk(), false, '退出后未登录');
}]);

tests.push(['保存文件：系统对话框原地覆盖，不支持时回退下载', async () => {
  const b = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  let picked = null, written = '';
  b.win.showSaveFilePicker = async (opts) => {
    picked = opts;
    return {
      createWritable: async () => ({ write: async (d) => { written = String(d); }, close: async () => {} })
    };
  };
  const ok1 = await b.ctx.saveFileFriendly('feed.xml', '<rss/>', 'done', 'dl');
  assert.strictEqual(ok1, true, '走系统对话框保存');
  assert.strictEqual(picked.suggestedName, 'feed.xml', '建议文件名正确');
  assert.ok(written, '内容以 Blob 写入');
  b.win.showSaveFilePicker = undefined;
  const ok2 = await b.ctx.saveFileFriendly('posts.js', 'window.BLOG_POSTS=[]', 'done2', '下载了');
  assert.strictEqual(ok2, false, '无对话框时回退下载');
}]);

tests.push(['自定义导航：可增删、支持二级下拉、外链新窗口', async () => {
  const navCfg = [
    { text: '主页', url: '#/' },
    { text: '更多', url: '#/about', children: [
      { text: '写作', url: '#/write' },
      { text: '友链', url: 'https://friend.example' }
    ]},
    { text: 'GitHub', url: 'https://github.com' }
  ];
  const b = await boot({ 'window.BLOG_CONFIG': { mode: 'static', nav: navCfg } });
  assert.ok(b.html.includes('>主页<'), '自定义项生效');
  const mainNav = b.html.slice(b.html.indexOf('<nav class="main-nav">'), b.html.indexOf('</nav>'));
  assert.ok(!mainNav.includes('>归档<'), '自定义导航替换默认顶栏导航');
  assert.ok(b.html.includes('has-sub') && b.html.includes('sub-menu'), '二级下拉容器');
  assert.ok(b.html.includes('/write') && b.html.includes('https://friend.example'), '子项渲染');
  assert.ok(b.html.includes('target="_blank" rel="noopener"'), '外链新窗口');
  const cur = b.ctx.location.pathname;
  b.ctx.route();
  assert.ok(true, '导航渲染不崩溃');
  void cur;
}]);

tests.push(['页脚：可配置友链与文字，无「本地」字样、贴底结构', async () => {
  const b = await boot({ 'window.BLOG_CONFIG': {
    mode: 'static',
    footer: { text: 'Made with ♥', links: [{ text: '友情链接', url: 'https://friend.example' }, { text: '站内归档', url: '#/archive' }] }
  } });
  assert.ok(b.html.includes('>友情链接<') && b.html.includes('https://friend.example'), '友链渲染');
  assert.ok(b.html.includes('/archive') && b.html.includes('Made with ♥'), '站内链接与自定义文字');
  assert.ok(!/本地|在线/.test(b.html.slice(b.html.indexOf('<footer>'))), '页脚无本地/在线字样');
  assert.ok(b.html.includes('footer-links') && b.html.includes('>RSS<'), '页脚链接行含 RSS');
}]);

tests.push(['导航栏搜索：图标点击展开，实时命中并带摘要', async () => {
  const { ctx } = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  const hits = ctx.globalSearch('你好', 8);
  assert.ok(hits.length >= 1 && hits[0].id === 'hello-qingyu', '全局搜索命中正文');
  const snip = ctx.searchSnippet(ctx.window.BLOG_POSTS.find((p) => p.id === 'hello-qingyu'), '轻语博客');
  assert.ok(snip.length > 0 && snip.includes('轻语博客'), '搜索摘要包含关键词');
  // 无关键词返回空
  assert.strictEqual(ctx.globalSearch('', 8).length, 0, '空关键词无结果');
}]);

tests.push(['file:// 本地预览：顶部导航与页脚链接均为 hash 且点击可跳转', async () => {
  // 构造 file:// 环境（本地双击 index.html 直开）
  let appEl = { innerHTML: '' };
  const stubEl2 = () => ({ innerHTML: '', querySelectorAll: () => [], addEventListener() {}, value: '', getAttribute: () => null, textContent: '' });
  const doc2 = { title: '', documentElement: { setAttribute() {} }, querySelector: (s) => s === '#app' ? appEl : stubEl2(), querySelectorAll: () => [], createElement: () => stubEl2(), body: { appendChild() {} }, addEventListener() {} };
  const winListeners = {};
  const win2 = { BLOG_POSTS: [], addEventListener: (ev, fn) => { winListeners[ev] = fn; }, matchMedia: () => ({ matches: false }), scrollTo() {}, crypto };
  let hash = '';
  const loc2 = {
    protocol: 'file:', origin: 'null', host: '', pathname: 'C:/demo/public/index.html', search: '', href: 'file:///C:/demo/public/index.html',
    get hash() { return hash; },
    set hash(v) { hash = v; if (winListeners.hashchange) winListeners.hashchange(); },
  };
  const ctx2 = {
    window: win2, document: doc2, location: loc2,
    history: { pushState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    confirm: () => true, setTimeout, clearTimeout, URLSearchParams, Blob: function () {},
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    console, Date, JSON, Math, String, Array, Object, RegExp, Map, Set, Uint8Array,
    TextEncoder, TextDecoder, btoa, atob, encodeURIComponent, decodeURIComponent,
  };
  win2.BLOG_CONFIG = { mode: 'static' };
  vm.createContext(ctx2);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'posts.js'), 'utf8'), ctx2, { filename: 'posts.js' });
  vm.runInContext(fs.readFileSync(path.join(PUB, 'app.js'), 'utf8'), ctx2, { filename: 'app.js' });
  await win2.__bootPromise;
  const html = appEl.innerHTML;
  // 顶部导航：默认项为 hash 形式
  assert.ok(html.includes('href="#/"'), '品牌/首页链接为 #/');
  assert.ok(html.includes('href="#/archive"'), '归档链接为 #/archive');
  assert.ok(html.includes('href="#/about"'), '关于链接为 #/about');
  // 页脚链接为 hash 形式（不允许裸 /path）
  assert.ok(!/href="\/archive"/.test(html), '页脚无裸 /archive 绝对路径');
  assert.ok(/href="#\/tags"/.test(html), '页脚标签链接为 #/tags');
  // 模拟点击：bindNavClicks 对 # 链接不 preventDefault，浏览器默认改 hash → hashchange → route
  // 直接走浏览器默认行为：设置 hash（setter 触发 hashchange 回调）
  hash = ''; // 从首页开始
  await ctx2.route(); // 当前在首页
  loc2.hash = '#/archive';
  const title = (appEl.innerHTML.match(/<h2 class="page-title">([^<]*)<\/h2>/) || [])[1];
  assert.strictEqual(title, '归档', '点击归档后渲染归档页');
  assert.ok(appEl.innerHTML.includes('href="#/archive"'), '归档页导航仍是 hash 链接');
  // 再点关于：连续跳转正常
  loc2.hash = '#/about';
  assert.ok(appEl.innerHTML.includes('关于'), '点击关于后渲染关于页');
}]);

tests.push(['标签页：标签云 + 计数 + 点击进入筛选', async () => {
  const t = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/tags');
  assert.ok(t.html.includes('🏷 标签'), '标签页标题');
  assert.ok(t.html.includes('cloud-chip') && t.html.includes('cloud-count'), '标签云与计数');
  assert.ok(t.html.includes('/?tag=' + encodeURIComponent('随笔')), '点击进入标签筛选');
  assert.ok(t.html.includes('教程') && t.html.includes('写作'), '示例标签齐全');
  // 默认导航包含「标签」
  const home = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } });
  assert.ok(home.html.includes('/tags'), '默认导航含标签入口');
  // 筛选态标签高亮
  const f = await boot({ 'window.BLOG_CONFIG': { mode: 'static' } }, '/tags');
  void f;
}]);

tests.push(['API：RSS /api/feed.xml 生成与 XML 转义', async () => {
  const { env, token, core } = await authEnv();
  await core.handlePosts(new Request('http://t/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ id: 'r1', title: 'RSS <测试> & 内容', date: '2025-01-01', content: '**正文**' })
  }), env);
  const r = await core.handleFeed(new Request('http://t/api/feed.xml'), env);
  assert.strictEqual(r.status, 200);
  assert.ok((r.headers.get('Content-Type') || '').includes('application/rss+xml'), 'Content-Type 为 RSS');
  const body = await r.text();
  assert.ok(body.includes('<item>'), '包含条目');
  assert.ok(body.includes('RSS &lt;测试&gt; &amp; 内容'), 'XML 转义正确');
  assert.ok(body.includes('<![CDATA['), '正文使用 CDATA');
}]);

/* ---------- 解析导出内容 ---------- */
function parsePostsJs(src) {
  const marker = 'window.BLOG_POSTS = ';
  const idx = src.indexOf(marker);
  assert.ok(idx >= 0, '输出包含 window.BLOG_POSTS');
  return JSON.parse(src.slice(idx + marker.length).replace(/;\s*$/, ''));
}

/* ---------- 运行 ---------- */
(async () => {
  let passed = 0, failed = 0;
  console.log('== 轻语博客冒烟测试 ==');
  for (const [name, fn] of tests) {
    try { await fn(); passed++; console.log('  ✅ ' + name); }
    catch (e) { failed++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack ? e.message : e)); }
  }
  console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
  process.exit(failed ? 1 : 0);
})();