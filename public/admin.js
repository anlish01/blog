/* ============================================================
 * 轻语博客 · 后台管理 UI（响应式：PC 固定侧栏 / 移动端抽屉）
 * ------------------------------------------------------------
 * 纯原生 JS，无框架；复用前台 app.js 的全局能力（apiFetch / adminOk /
 * esc / svgIcon / renderMarkdown / navigate / getConfig 等）。
 * 通过 window.QingyuAdmin.mount(root, path) 由 app.js 路由挂载，
 * 前台 reader 逻辑完全不受影响（前提逻辑不变）。
 *
 * 路由（均在 /admin 命名空间下）：
 *   /admin                 仪表盘
 *   /admin/posts           全部文章
 *   /admin/posts/new       写新文章
 *   /admin/posts/:id/edit  编辑文章
 *   /admin/categories      分类管理
 *   /admin/tags            标签管理
 *   /admin/comments        全部评论
 *   /admin/comments/pending 待审核评论
 *   /admin/media           媒体资源
 *   /admin/settings        博客设置
 * （/write 与 /posts/:id/edit 也跳转至此编辑器）
 * ============================================================ */
(function () {
  'use strict';

  /* ----------------------- 工具函数 ----------------------- */
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function icon(name, size) { return window.svgIcon ? window.svgIcon(name, size) : ''; }
  function cfg() { return window.getConfig ? window.getConfig() : (window.BLOG_CONFIG || {}); }
  function cloudOn() { return typeof window._cloudOn === 'function' ? window._cloudOn() : false; }
  function isAdmin() { return typeof window.adminOk === 'function' ? window.adminOk() : false; }
  function go(path) { if (window.navigate) window.navigate(path); }
  function link(path) { return window.href ? window.href(path) : path; }

  /* ---------- 加密（PBKDF2+AES-GCM，与 reader 端完全兼容） ---------- */
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf); var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    var bin = atob(b64); var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  async function deriveAdminKey(password, salt) {
    var enc = new TextEncoder();
    var keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveKey']);
    return window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptText(text, password) {
    var salt = window.crypto.getRandomValues(new Uint8Array(16));
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveAdminKey(password, salt);
    var enc = new TextEncoder();
    var data = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(String(text)));
    return { salt: bufToB64(salt.buffer), iv: bufToB64(iv.buffer), data: bufToB64(data) };
  }
  async function decryptText(encObj, password) {
    try {
      var salt = new Uint8Array(b64ToBuf(encObj.salt));
      var iv = new Uint8Array(b64ToBuf(encObj.iv));
      var data = b64ToBuf(encObj.data);
      var key = await deriveAdminKey(password, salt);
      var plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
      return new TextDecoder().decode(plain);
    } catch (e) { return null; }
  }

  function fmtDate(s) {
    s = String(s || '');
    if (!s) return '';
    return s.slice(0, 10);
  }
  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function slug(s) {
    if (window.slug) return window.slug(s);
    return String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || ('p' + Date.now().toString(36));
  }
  async function api(url, opts) {
    if (!window.apiFetch) throw new Error('apiFetch 不可用');
    return await window.apiFetch(url, opts || {});
  }
  function toast(msg, type) {
    var wrap = document.querySelector('.ab-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ab-toast-wrap'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'ab-toast ' + (type || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 300); }, 2400);
  }
  function confirmModal(title, bodyHtml, onOk, okText) {
    var mask = document.createElement('div');
    mask.className = 'ab-modal-mask';
    mask.innerHTML =
      '<div class="ab-modal">' +
      '<h3>' + esc(title) + '</h3>' +
      (bodyHtml || '') +
      '<div class="ab-modal-actions">' +
      '<button class="ab-btn ghost" data-act="cancel">取消</button>' +
      '<button class="ab-btn danger" data-act="ok">' + esc(okText || '确定') + '</button>' +
      '</div></div>';
    document.body.appendChild(mask);
    function close() { mask.remove(); }
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.getAttribute('data-act') === 'cancel') close();
      else if (e.target.getAttribute('data-act') === 'ok') { close(); onOk && onOk(); }
    });
    return close;
  }

  /* ----------------------- 数据访问（兼容云端 / 静态） ----------------------- */
  async function listPosts() {
    if (cloudOn()) {
      var d = await api('api/posts');
      return (d && d.posts) || [];
    }
    // 静态模式：BLOG_POSTS 合并本地草稿
    var base = (window.getStaticPosts ? window.getStaticPosts() : []) || [];
    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    var map = {};
    base.forEach(function (p) { if (p && p.id) map[p.id] = p; });
    drafts.forEach(function (p) { if (p && p.id) map[p.id] = p; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  async function getPost(id) {
    if (cloudOn()) {
      try { var d = await api('api/posts/' + encodeURIComponent(id)); return d && d.post; } catch (e) { return null; }
    }
    var all = await listPosts();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function saveStaticPost(post) {
    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    var idx = -1;
    for (var i = 0; i < drafts.length; i++) if (drafts[i] && drafts[i].id === post.id) idx = i;
    var item = { id: post.id, title: post.title, date: post.date, tags: post.tags || [], excerpt: post.excerpt || '',
      cover: post.cover || '', category: post.category || '', status: post.status || 'published',
      pinned: !!post.pinned, protected: !!post.protected, enc: post.enc || null, content: post.content || '' };
    if (idx >= 0) drafts[idx] = item; else drafts.push(item);
    localStorage.setItem('qingyu.drafts', JSON.stringify(drafts));
  }
  async function savePost(post, isNew) {
    if (cloudOn()) {
      if (isNew) return await api('api/posts', { method: 'POST', body: JSON.stringify(post) });
      return await api('api/posts/' + encodeURIComponent(post.id), { method: 'PUT', body: JSON.stringify(post) });
    }
    saveStaticPost(post);
    return { ok: true };
  }
  async function deletePost(id) {
    if (cloudOn()) return await api('api/posts/' + encodeURIComponent(id), { method: 'DELETE' });
    // 静态：从 BLOG_POSTS 与草稿中移除
    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    drafts = drafts.filter(function (p) { return p.id !== id; });
    localStorage.setItem('qingyu.drafts', JSON.stringify(drafts));
    return { ok: true };
  }
  function downloadPostsJs() {
    if (!window.buildPostsJs) { toast('当前环境不支持导出', 'err'); return; }
    // posts.js
    var txt = window.buildPostsJs();
    var blob = new Blob([txt], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'posts.js';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('已导出 posts.js', 'ok');
  }
  /** 一键导出全部：posts.js + feed.xml + sitemap.xml（静态模式发布三件套） */
  function downloadAllStatic() {
    downloadPostsJs();
    if (window.buildFeedXmlClient) {
      setTimeout(function () {
        var fb = new Blob([window.buildFeedXmlClient(window.getStaticPosts ? window.getStaticPosts() : [], 20)], { type: 'application/xml' });
        var fa = document.createElement('a'); fa.href = URL.createObjectURL(fb); fa.download = 'feed.xml'; fa.click();
        setTimeout(function () { URL.revokeObjectURL(fa.href); }, 1000);
      }, 200);
    }
    if (window.buildSitemapClient) {
      setTimeout(function () {
        var sb = new Blob([window.buildSitemapClient()], { type: 'application/xml' });
        var sa = document.createElement('a'); sa.href = URL.createObjectURL(sb); sa.download = 'sitemap.xml'; sa.click();
        setTimeout(function () { URL.revokeObjectURL(sa.href); }, 1000);
      }, 400);
    }
    toast('已导出 posts.js + feed.xml + sitemap.xml，覆盖 public/ 即可发布', 'ok');
  }

  /* ----------------------- 登录门禁 ----------------------- */
  function renderGate(root) {
    var head = '', form = '', hint = '';
    if (cloudOn()) {
      head = '<h2>登录后台</h2><p>使用云端管理员密码登录</p>';
      form =
        '<input class="ab-input" type="password" id="abGatePwd" placeholder="管理员密码" autocomplete="current-password">' +
        '<button class="ab-btn primary" id="abGateBtn">登 录</button>' +
        '<p class="ab-hint" style="margin-top:14px">首次部署请先按 README 用 <code>/api/admin/setup</code> 设置密码（需 BLOG_ADMIN_SETUP_KEY）。</p>';
    } else if (window.needAdminSetup && window.needAdminSetup()) {
      head = '<h2>设置管理密码</h2><p>本地模式：设置后用于进入后台（≥4 位）</p>';
      form =
        '<input class="ab-input" type="password" id="abGatePwd" placeholder="设置管理密码" autocomplete="new-password">' +
        '<button class="ab-btn primary" id="abGateBtn">设置并进入</button>';
    } else {
      head = '<h2>登录后台</h2><p>本地模式：输入管理密码</p>';
      form =
        '<input class="ab-input" type="password" id="abGatePwd" placeholder="管理密码" autocomplete="current-password">' +
        '<button class="ab-btn primary" id="abGateBtn">登 录</button>';
    }
    root.innerHTML =
      '<div class="ab-gate">' +
      '<div class="ab-gate-card">' +
      '<div class="ab-gate-logo">青</div>' + head +
      form +
      '</div></div>';

    var btn = root.querySelector('#abGateBtn');
    var inp = root.querySelector('#abGatePwd');
    async function submit() {
      var pwd = inp.value || '';
      if (!pwd) { toast('请输入密码', 'err'); return; }
      btn.disabled = true;
      try {
        if (cloudOn()) {
          var r = await window.cloudLogin(pwd);
          if (r && r.ok) { toast('登录成功', 'ok'); go('/admin'); }
          else { toast((r && r.message) || '登录失败', 'err'); btn.disabled = false; }
        } else if (window.needAdminSetup && window.needAdminSetup()) {
          if (window.setupAdmin(pwd)) { toast('已设置', 'ok'); go('/admin'); }
          else { toast('密码至少 4 位', 'err'); btn.disabled = false; }
        } else {
          if (window.tryAdmin(pwd)) { toast('登录成功', 'ok'); go('/admin'); }
          else { toast('密码错误', 'err'); btn.disabled = false; }
        }
      } catch (e) { toast('登录异常：' + (e && e.message || e), 'err'); btn.disabled = false; }
    }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    inp.focus();
  }

  /* ----------------------- 侧边栏菜单 ----------------------- */
  var NAV = [
    { group: '概览', items: [{ key: 'dashboard', label: '仪表盘', icon: 'sitemap', href: '/admin' }] },
    { group: '文章管理', items: [
      { key: 'posts', label: '全部文章', icon: 'list', href: '/admin/posts' },
      { key: 'write', label: '写新文章', icon: 'pen', href: '/admin/posts/new' },
      { key: 'categories', label: '分类管理', icon: 'tag', href: '/admin/categories' },
      { key: 'tags', label: '标签管理', icon: 'tag', href: '/admin/tags' }
    ] },
    { group: '评论管理', items: [
      { key: 'comments', label: '全部评论', icon: 'quote', href: '/admin/comments' },
      { key: 'comments-pending', label: '待审核评论', icon: 'lock', href: '/admin/comments/pending', badge: 'pending' }
    ] },
    { group: '内容与设置', items: [
      { key: 'media', label: '媒体资源', icon: 'image', href: '/admin/media' },
      { key: 'settings', label: '博客设置', icon: 'sitemap', href: '/admin/settings' }
    ] }
  ];

  function renderSider(activeKey, pendingCount) {
    var groups = NAV.map(function (g) {
      var items = g.items.map(function (it) {
        var badge = (it.badge === 'pending' && pendingCount > 0) ? '<span class="ab-nav-count">' + pendingCount + '</span>' : '';
        return '<a class="ab-nav-item ' + (it.key === activeKey ? 'active' : '') + '" data-link="' + esc(it.href) + '">' +
          icon(it.icon, 17) + '<span class="ab-nav-text">' + esc(it.label) + '</span>' + badge + '</a>';
      }).join('');
      return '<div class="ab-nav-group"><div class="ab-nav-group-title">' + esc(g.group) + '</div>' + items + '</div>';
    }).join('');

    var adminName = (cfg().footer && cfg().footer.copyrightName) || '管理员';
    return (
      '<aside class="ab-sider" id="abSider">' +
        '<div class="ab-sider-header">' +
          '<div class="ab-logo">青</div>' +
          '<div class="ab-sider-title">' + esc(adminName) + '</div>' +
        '</div>' +
        '<nav class="ab-nav">' + groups + '</nav>' +
        '<div class="ab-sider-footer">' +
          '<div class="ab-avatar">A</div>' +
          '<div class="ab-sider-footer-text"><b>' + esc(adminName) + '</b><span>个人博客管理员</span></div>' +
          '<button class="ab-btn-icon" id="abSiderLogout" title="退出登录">' + icon('logout', 17) + '</button>' +
        '</div>' +
      '</aside>' +
      '<div class="ab-sider-mask" id="abSiderMask"></div>'
    );
  }

  /* ----------------------- 顶栏 ----------------------- */
  function renderHeader(crumbs) {
    var crumbHtml = crumbs.map(function (c, i) {
      if (i === crumbs.length - 1) return '<b>' + esc(c) + '</b>';
      return '<span class="ab-hide-sm">' + esc(c) + '</span><span class="sep ab-hide-sm">/</span>';
    }).join(' ');
    return (
      '<header class="ab-header">' +
        '<button class="ab-btn-icon" id="abMenuBtn" title="折叠/展开菜单">' + icon('list', 18) + '</button>' +
        '<div class="ab-breadcrumb">' + crumbHtml + '</div>' +
        '<div class="ab-header-spacer"></div>' +
        '<div class="ab-header-right">' +
          '<button class="ab-header-btn" id="abPreview" title="在新标签打开前台博客">' + icon('external', 16) + '<span class="ab-hide-sm">预览站点</span></button>' +
          '<div class="ab-dropdown">' +
            '<button class="ab-btn-icon ab-bell" id="abBell" title="新评论提醒">' + icon('quote', 18) + '<span class="ab-badge" id="abBellBadge" style="display:none">0</span></button>' +
            '<div class="ab-menu" id="abBellMenu"><div class="ab-menu-item" style="color:var(--ab-muted);cursor:default">暂时没有新评论</div></div>' +
          '</div>' +
          '<div class="ab-dropdown">' +
            '<button class="ab-btn-icon" id="abAvatarBtn" title="账户">' + icon('lock', 18) + '</button>' +
            '<div class="ab-menu" id="abAvatarMenu">' +
              '<div class="ab-menu-item" data-act="profile">' + icon('pen', 16) + '个人资料</div>' +
              '<div class="ab-menu-item" data-act="password">' + icon('lock', 16) + '修改密码</div>' +
              '<div class="ab-menu-sep"></div>' +
              '<div class="ab-menu-item danger" data-act="logout">' + icon('logout', 16) + '退出登录</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  /* ----------------------- 路由解析 ----------------------- */
  function parseRoute(path) {
    path = String(path || '/');
    if (path === '/write' || path === '/admin/write' || path === '/admin/posts/new') return { key: 'write', page: 'editor', id: null, isNew: true };
    var m = path.match(/^\/admin\/posts\/([^/]+)\/edit$/);
    if (m) return { key: 'write', page: 'editor', id: decodeURIComponent(m[1]), isNew: false };
    m = path.match(/^\/posts\/([^/]+)\/edit$/);
    if (m) return { key: 'write', page: 'editor', id: decodeURIComponent(m[1]), isNew: false };
    if (path === '/admin' || path === '/admin/') return { key: 'dashboard', page: 'dashboard' };
    if (path === '/admin/posts') return { key: 'posts', page: 'posts' };
    if (path === '/admin/categories') return { key: 'categories', page: 'categories' };
    if (path === '/admin/tags') return { key: 'tags', page: 'tags' };
    if (path === '/admin/comments') return { key: 'comments', page: 'comments', filter: 'all' };
    if (path === '/admin/comments/pending') return { key: 'comments-pending', page: 'comments', filter: 'pending' };
    if (path === '/admin/media') return { key: 'media', page: 'media' };
    if (path === '/admin/settings') return { key: 'settings', page: 'settings' };
    return { key: 'dashboard', page: 'dashboard' };
  }
  function crumbsFor(route) {
    for (var i = 0; i < NAV.length; i++) {
      for (var j = 0; j < NAV[i].items.length; j++) {
        if (NAV[i].items[j].key === route.key) {
          if (NAV[i].group === '概览') return [NAV[i].items[j].label];
          return [NAV[i].group, NAV[i].items[j].label];
        }
      }
    }
    return ['仪表盘'];
  }

  /* ----------------------- 装载入口 ----------------------- */
  var siderCollapsed = false;

  function mount(root, path) {
    if (!isAdmin()) { renderGate(root); return; }
    var route = parseRoute(path);
    // 异步拉取待审核数量用于角标
    var pendingCount = 0;
    renderShell(root, route, pendingCount);
    bindShell(root, route);
    loadPendingBadge(root, route);
    renderPage(root, route);
  }

  function renderShell(root, route, pendingCount) {
    var crumbs = crumbsFor(route);
    root.innerHTML =
      '<div class="ab-root' + (siderCollapsed ? ' ab-collapsed' : '') + '">' +
        renderSider(route.key, pendingCount) +
        '<div class="ab-main">' +
          renderHeader(crumbs) +
          '<main class="ab-content" id="abContent"></main>' +
          '<footer class="ab-footer" style="text-align:center;padding:18px;color:var(--ab-muted);font-size:12.5px;border-top:1px solid var(--ab-border);background:var(--ab-card)">博客管理后台 © 2026</footer>' +
        '</div>' +
      '</div>';
    if (siderCollapsed) root.querySelector('#abSider').classList.add('collapsed');
  }

  function bindShell(root, route) {
    var sider = root.querySelector('#abSider');
    var mask = root.querySelector('#abSiderMask');

    root.querySelectorAll('[data-link]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); });
    });

    var menuBtn = root.querySelector('#abMenuBtn');
    menuBtn.addEventListener('click', function () {
      if (window.innerWidth <= 991) {
        sider.classList.toggle('open');
        mask.classList.toggle('show');
      } else {
        siderCollapsed = !siderCollapsed;
        sider.classList.toggle('collapsed', siderCollapsed);
      }
    });
    mask.addEventListener('click', function () { sider.classList.remove('open'); mask.classList.remove('show'); });

    root.querySelector('#abPreview').addEventListener('click', function () {
      var url = window.location.origin + (window.location.protocol === 'file:' ? '/index.html' : '/');
      window.open(url, '_blank');
    });

    root.querySelector('#abSiderLogout').addEventListener('click', function () {
      confirmModal('退出登录', '<p class="ab-muted">确定要退出后台吗？</p>', function () {
        if (cloudOn()) window.cloudLogout && window.cloudLogout(); else window.adminLogout && window.adminLogout();
        go('/admin');
      }, '退出');
    });

    // 通知铃铛
    var bell = root.querySelector('#abBell');
    var bellMenu = root.querySelector('#abBellMenu');
    bell.addEventListener('click', function (e) { e.stopPropagation(); bellMenu.classList.toggle('open'); });
    // 头像下拉
    var avBtn = root.querySelector('#abAvatarBtn');
    var avMenu = root.querySelector('#abAvatarMenu');
    avBtn.addEventListener('click', function (e) { e.stopPropagation(); avMenu.classList.toggle('open'); });
    avMenu.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (!act) return;
      avMenu.classList.remove('open');
      if (act === 'logout') {
        if (cloudOn()) window.cloudLogout && window.cloudLogout(); else window.adminLogout && window.adminLogout();
        go('/admin');
      } else if (act === 'profile') {
        go('/admin/settings');
      } else if (act === 'password') {
        openPasswordModal();
      }
    });
    if (!window.__abDocCloseBound) {
      window.__abDocCloseBound = true;
      document.addEventListener('click', function () {
        var ms = document.querySelectorAll('.ab-menu.open');
        ms.forEach(function (m) { m.classList.remove('open'); });
      });
    }
  }

  function loadPendingBadge(root, route) {
    if (!cloudOn()) return;
    api('api/comments?status=pending').then(function (d) {
      var list = (d && d.comments) || [];
      var badge = root.querySelector('#abBellBadge');
      var menu = root.querySelector('#abBellMenu');
      if (badge && list.length) {
        badge.style.display = ''; badge.textContent = list.length;
      }
      if (menu) {
        if (list.length) {
          menu.innerHTML = list.slice(0, 6).map(function (c) {
            return '<div class="ab-menu-item" data-link="/admin/comments/pending" style="white-space:normal;line-height:1.4">' +
              '<div><b>' + esc(c.author || '匿名') + '</b><br><span class="ab-text-sm ab-muted">' + esc((c.content || '').slice(0, 28)) + '</span></div></div>';
          }).join('') + '<div class="ab-menu-sep"></div><div class="ab-menu-item" data-link="/admin/comments/pending">查看全部待审核 →</div>';
          menu.querySelectorAll('[data-link]').forEach(function (a) { a.addEventListener('click', function () { go(a.getAttribute('data-link')); }); });
        }
      }
    }).catch(function () {});
  }

  /* ----------------------- 内容区分发 ----------------------- */
  function renderPage(root, route) {
    var content = root.querySelector('#abContent');
    if (route.page === 'dashboard') return pageDashboard(content);
    if (route.page === 'posts') return pagePosts(content);
    if (route.page === 'editor') return pageEditor(content, route);
    if (route.page === 'categories') return pageCategories(content);
    if (route.page === 'tags') return pageTags(content);
    if (route.page === 'comments') return pageComments(content, route.filter);
    if (route.page === 'media') return pageMedia(content);
    if (route.page === 'settings') return pageSettings(content);
  }

  /* ====================== 仪表盘 ====================== */
  function pageDashboard(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">仪表盘</h1><p class="ab-page-sub">站点概览与近 30 天趋势</p></div></div>' +
      '<div class="ab-grid cols-5" id="abStats"></div>' +
      '<div class="ab-grid cols-2" style="margin-top:16px">' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('eye', 16) + ' 近 30 天访问趋势</div><div id="abTrendViews"></div></div>' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('quote', 16) + ' 近 30 天评论趋势</div><div id="abTrendCmt"></div></div>' +
      '</div>' +
      '<div class="ab-grid cols-2" style="margin-top:16px">' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('doc', 16) + ' 最新发布</div><div class="ab-feed" id="abRecentPosts"></div></div>' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('quote', 16) + ' 最新评论</div><div class="ab-feed" id="abRecentCmt"></div></div>' +
      '</div>';

    loadDashboard(content);
  }

  async function loadDashboard(content) {
    var posts = [];
    try { posts = await listPosts(); } catch (e) {}
    var total = posts.length;
    var published = posts.filter(function (p) { return (p.status || 'published') !== 'draft'; }).length;
    var drafts = posts.filter(function (p) { return (p.status || 'published') === 'draft'; }).length;

    var commentsAll = [], pending = 0;
    if (cloudOn()) {
      try { var cd = await api('api/comments?status=all'); commentsAll = (cd && cd.comments) || []; } catch (e) {}
      pending = commentsAll.filter(function (c) { return (c.status || 'approved') === 'pending'; }).length;
    }

    var pinnedCount = posts.filter(function (p) { return !!p.pinned; }).length;
    var lockedCount = posts.filter(function (p) { return !!p.protected; }).length;
    var stats = [
      { label: '文章总数', value: total, icon: 'doc' },
      { label: '已发布', value: published, icon: 'check' },
      { label: '草稿', value: drafts, icon: 'pen' },
      { label: '置顶', value: pinnedCount, icon: 'pin' },
      { label: '加密', value: lockedCount, icon: 'lock' },
      { label: '评论总数', value: cloudOn() ? commentsAll.length : '—', icon: 'quote' },
      { label: '待审核评论', value: cloudOn() ? pending : '—', icon: 'lock' }
    ];
    content.querySelector('#abStats').innerHTML = stats.map(function (s) {
      return '<div class="ab-card ab-stat"><div class="ab-stat-label">' + icon(s.icon, 16) + esc(s.label) + '</div><div class="ab-stat-value">' + esc(String(s.value)) + '</div></div>';
    }).join('');

    // 最新发布
    var recentPosts = posts.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 5);
    content.querySelector('#abRecentPosts').innerHTML = recentPosts.length ? recentPosts.map(function (p) {
      return '<div class="ab-feed-item"><div class="ab-feed-main"><b>' + esc(p.title || '(无标题)') + '</b><span>' + esc(fmtDate(p.date)) + ' · ' + esc(p.category || '未分类') + '</span></div></div>';
    }).join('') : '<div class="ab-empty"><div class="ab-empty-ico">📝</div><p>还没有文章</p><a class="ab-btn primary sm" data-link="/admin/posts/new">去写一篇</a></div>';
    content.querySelectorAll('#abRecentPosts [data-link]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); }); });

    // 最新评论
    var recentCmt = commentsAll.slice(0, 5);
    content.querySelector('#abRecentCmt').innerHTML = recentCmt.length ? recentCmt.map(function (c) {
      return '<div class="ab-feed-item"><div class="ab-feed-main"><b>' + esc(c.author || '匿名') + '</b><span>' + esc((c.content || '').slice(0, 30)) + '</span></div></div>';
    }).join('') : '<div class="ab-empty"><div class="ab-empty-ico">💬</div><p>暂无评论</p></div>';

    // 趋势
    if (cloudOn()) {
      try {
        var td = await api('api/stats/trend?days=30');
        var trend = (td && td.trend) || [];
        content.querySelector('#abTrendViews').innerHTML = lineChart(trend.map(function (t) { return t.views; }), '近30天每日访问量');
      } catch (e) { content.querySelector('#abTrendViews').innerHTML = '<div class="ab-empty"><p>暂无访问数据</p></div>'; }
      try {
        var byDate = {};
        commentsAll.forEach(function (c) { var d = fmtDate(c.date); byDate[d] = (byDate[d] || 0) + 1; });
        var last30 = [];
        for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); last30.push(byDate[d] || 0); }
        content.querySelector('#abTrendCmt').innerHTML = lineChart(last30, '近30天每日评论数');
      } catch (e) { content.querySelector('#abTrendCmt').innerHTML = '<div class="ab-empty"><p>暂无评论数据</p></div>'; }
    } else {
      content.querySelector('#abTrendViews').innerHTML = '<div class="ab-empty"><p>访问趋势需在云端模式（Cloudflare）下查看</p></div>';
      content.querySelector('#abTrendCmt').innerHTML = '<div class="ab-empty"><p>评论趋势需在云端模式（Cloudflare）下查看</p></div>';
    }
  }

  function lineChart(values, label) {
    var w = 520, h = 200, pad = 28;
    var max = Math.max(1, Math.max.apply(null, values));
    var n = values.length;
    if (n === 0) return '<div class="ab-empty"><p>无数据</p></div>';
    var step = (w - pad * 2) / Math.max(1, n - 1);
    var pts = values.map(function (v, i) {
      var x = pad + i * step;
      var y = h - pad - (v / max) * (h - pad * 2);
      return [x, y];
    });
    var path = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var dots = pts.map(function (p) { return '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.5"/>'; }).join('');
    var base = '<line class="axis" x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '"/>';
    var last = pts[pts.length - 1];
    return '<svg class="ab-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + base +
      '<path class="line" d="' + path + '"/>' + dots +
      '<text class="lbl" x="' + (w - pad) + '" y="' + (last[1] - 6) + '" text-anchor="end">' + (values[values.length - 1]) + '</text>' +
      '</svg><div class="ab-text-sm ab-muted" style="margin-top:6px">' + esc(label) + '（峰值 ' + max + '）</div>';
  }

  /* ====================== 文章列表 ====================== */
  function pagePosts(content) {
    content.innerHTML =
      '<div class="ab-page-head"><div><h1 class="ab-page-title">全部文章</h1><p class="ab-page-sub">管理你已发布与草稿中的文章</p></div>' +
        '<button class="ab-btn primary" data-link="/admin/posts/new">' + icon('pen', 15) + ' 写新文章</button></div>' +
      '<div class="ab-toolbar">' +
        '<div class="ab-search"><input class="ab-input" id="abPostKw" placeholder="搜索标题 / 标签…"></div>' +
        '<select class="ab-select" id="abPostStatus" style="max-width:140px"><option value="all">全部状态</option><option value="published">已发布</option><option value="draft">草稿</option></select>' +
        '<select class="ab-select" id="abPostCat" style="max-width:160px"><option value="">全部分类</option></select>' +
      '</div>' +
      '<div class="ab-table-wrap"><table class="ab-table"><thead><tr>' +
        '<th>标题</th><th>分类</th><th>标签</th><th>发布时间</th><th>状态</th><th class="col-actions">操作</th>' +
      '</tr></thead><tbody id="abPostBody"></tbody></table></div>' +
      '<div class="ab-pagination" id="abPostPage"></div>';

    bindPosts(content);
    loadPosts(content, 1);
    // 绑定内容区内的导航链接（如「写新文章」按钮），bindShell 仅绑定挂载时已有的元素
    content.querySelectorAll('[data-link]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); });
    });
  }

  function bindPosts(content) {
    var kw = content.querySelector('#abPostKw');
    var st = content.querySelector('#abPostStatus');
    var cat = content.querySelector('#abPostCat');
    function refilter() { loadPosts(content, 1); }
    kw.addEventListener('input', debounce(refilter, 250));
    st.addEventListener('change', refilter);
    cat.addEventListener('change', refilter);
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  async function loadPosts(content, page) {
    var body = content.querySelector('#abPostBody');
    var catSel = content.querySelector('#abPostCat');
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px"><span class="ab-spin"></span> 加载中…</td></tr>';
    var posts = [];
    try { posts = await listPosts(); } catch (e) { body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px" class="ab-muted">加载失败：' + esc(e.message || e) + '</td></tr>'; return; }

    // 分类下拉
    var cats = {};
    posts.forEach(function (p) { var c = p.category || '未分类'; cats[c] = (cats[c] || 0) + 1; });
    var cur = catSel.value;
    catSel.innerHTML = '<option value="">全部分类</option>' + Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + ' (' + cats[c] + ')</option>'; }).join('');
    catSel.value = cur;

    var kw = content.querySelector('#abPostKw').value.trim().toLowerCase();
    var st = content.querySelector('#abPostStatus').value;
    var cf = content.querySelector('#abPostCat').value;

    var filtered = posts.filter(function (p) {
      if (st !== 'all' && (p.status || 'published') !== st) return false;
      if (cf && (p.category || '未分类') !== cf) return false;
      if (kw) {
        var hay = ((p.title || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
    filtered.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:34px" class="ab-muted">没有匹配的文章</td></tr>';
      content.querySelector('#abPostPage').innerHTML = '';
      return;
    }
    var per = 10, totalPages = Math.max(1, Math.ceil(filtered.length / per));
    page = Math.min(page, totalPages);
    var slice = filtered.slice((page - 1) * per, page * per);
    body.innerHTML = slice.map(function (p) {
      var id = p.id;
      var statusBadge = '';
      if (p.pinned) statusBadge = '<span class="ab-status published">' + icon('pin', 11) + ' 置顶</span>';
      else if (p.protected) statusBadge = '<span class="ab-status draft">' + icon('lock', 11) + ' 加密</span>';
      else statusBadge = '<span class="ab-status ' + ((p.status || 'published') === 'draft' ? 'draft' : 'published') + '">' + ((p.status || 'published') === 'draft' ? '草稿' : '已发布') + '</span>';
      return '<tr>' +
        '<td><a class="ab-post-title" data-link="/admin/posts/' + enc(id) + '/edit">' + esc(p.title || '(无标题)') + '</a></td>' +
        '<td class="ab-td-cat">' + (p.category ? '<span class="ab-chip cat">' + esc(p.category) + '</span>' : '<span class="ab-muted">—</span>') + '</td>' +
        '<td class="ab-td-tags">' + (p.tags && p.tags.length ? '<div class="ab-tag-row">' + p.tags.map(function (t) { return '<span class="ab-chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '<span class="ab-muted">—</span>') + '</td>' +
        '<td class="ab-td-date">' + esc(fmtDate(p.date)) + '</td>' +
        '<td class="ab-td-status">' + statusBadge + '</td>' +
        '<td class="col-actions">' +
          '<button class="ab-btn sm" data-edit="' + enc(id) + '">' + icon('pen', 13) + ' 编辑</button> ' +
          '<button class="ab-btn sm" data-pin="' + enc(id) + '">' + icon('pin', 13) + ' ' + (p.pinned ? '取消置顶' : '置顶') + '</button> ' +
          '<button class="ab-btn sm" data-lock="' + enc(id) + '">' + icon('lock', 13) + ' ' + (p.protected ? '取消加密' : '加密') + '</button> ' +
          '<button class="ab-btn sm danger" data-del="' + enc(id) + '">' + icon('trash', 13) + ' 删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    body.querySelectorAll('[data-link]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); }); });
    body.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { go('/admin/posts/' + dec(b.getAttribute('data-edit')) + '/edit'); }); });
    body.querySelectorAll('[data-preview]').forEach(function (b) { b.addEventListener('click', function () { window.open(link('/posts/' + dec(b.getAttribute('data-preview')) + '/'), '_blank'); }); });
    body.querySelectorAll('[data-pin]').forEach(function (b) { b.addEventListener('click', async function () {
      var pid = dec(b.getAttribute('data-pin'));
      // 立即切换按钮文字（乐观更新），让用户即时看到反馈
      var isPinned = b.innerHTML.indexOf('取消置顶') >= 0;
      b.innerHTML = '<span class="ab-spin" style="width:13px;height:13px;border-width:2px"></span> ' + (isPinned ? '置顶中…' : '取消中…');
      b.disabled = true;
      try {
        var post = await getPost(pid);
        if (!post) { toast('未找到文章', 'err'); return; }
        post.pinned = !post.pinned;
        if (cloudOn()) {
          await api('api/posts/' + enc(pid), { method: 'PUT', body: JSON.stringify(post) });
        } else {
          saveStaticPost(post);
          downloadPostsJs();
        }
        toast(post.pinned ? '✓ 已置顶' : '✓ 已取消置顶', 'ok');
      } catch (e) { toast('操作失败：' + (e.message || e), 'err'); }
      b.disabled = false;
      loadPosts(content, page);
    }); });
    body.querySelectorAll('[data-lock]').forEach(function (b) { b.addEventListener('click', async function () {
      var pid = dec(b.getAttribute('data-lock'));
      var isLocked = b.innerHTML.indexOf('取消加密') >= 0;
      b.innerHTML = '<span class="ab-spin" style="width:13px;height:13px;border-width:2px"></span> ' + (isLocked ? '解密中…' : '加密中…');
      b.disabled = true;
      try {
        var post = await getPost(pid);
        if (!post) { toast('未找到文章', 'err'); return; }
        if (!post.protected) {
          // —— 添加加密 ——
          var pwd = prompt('设置文章访问密码（至少 4 位）：');
          if (pwd === null) { b.disabled = false; loadPosts(content, page); return; }
          pwd = String(pwd || '').trim();
          if (pwd.length < 4) { toast('密码至少 4 位', 'err'); b.disabled = false; loadPosts(content, page); return; }
          var pwd2 = prompt('再次输入密码确认：');
          if (String(pwd2 || '') !== pwd) { toast('两次密码不一致', 'err'); b.disabled = false; loadPosts(content, page); return; }
          var encContent = post.content || '';
          if (!encContent) { toast('文章正文为空，无法加密', 'err'); b.disabled = false; loadPosts(content, page); return; }
          var encObj = await encryptText(encContent, pwd);
          post.protected = true; post.enc = encObj; post.content = '';
        } else {
          // —— 取消加密 ——
          var oldPwd = prompt('输入该文章的原密码以取消加密：');
          if (oldPwd === null) { b.disabled = false; loadPosts(content, page); return; }
          var plain = post.content ? post.content : (post.enc ? await decryptText(post.enc, String(oldPwd || '')) : null);
          if (!plain) { toast('密码错误或无法解密', 'err'); b.disabled = false; loadPosts(content, page); return; }
          post.protected = false; post.enc = null; post.content = plain;
        }
        if (cloudOn()) {
          await api('api/posts/' + enc(pid), { method: 'PUT', body: JSON.stringify(post) });
        } else {
          saveStaticPost(post);
          downloadPostsJs();
        }
        toast(post.protected ? '✓ 已加密' : '✓ 已取消加密', 'ok');
      } catch (e) { toast('操作失败：' + (e.message || e), 'err'); }
      b.disabled = false;
      loadPosts(content, page);
    }); });
    body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
      var pid = dec(b.getAttribute('data-del'));
      confirmModal('删除文章', '<p class="ab-muted">确定删除《' + esc(pid) + '》？此操作不可恢复。</p>', async function () {
        try { await deletePost(pid); toast('已删除', 'ok'); loadPosts(content, page); } catch (e) { toast('删除失败：' + (e.message || e), 'err'); }
      }, '删除');
    }); });

    var pg = content.querySelector('#abPostPage');
    var html = '';
    if (page > 1) html += '<button class="ab-page-btn" data-p="' + (page - 1) + '">上一页</button>';
    html += '<button class="ab-page-btn active">' + page + ' / ' + totalPages + '</button>';
    if (page < totalPages) html += '<button class="ab-page-btn" data-p="' + (page + 1) + '">下一页</button>';
    pg.innerHTML = html;
    pg.querySelectorAll('[data-p]').forEach(function (b) { b.addEventListener('click', function () { loadPosts(content, parseInt(b.getAttribute('data-p'), 10)); }); });
  }
  function enc(s) { return encodeURIComponent(s); }
  function dec(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  /* ====================== 编辑器 ====================== */
  function pageEditor(content, route) {
    content.innerHTML =
      '<div class="ab-page-head"><div><h1 class="ab-page-title">' + (route.isNew ? '写新文章' : '编辑文章') + '</h1><p class="ab-page-sub">支持 Markdown，右侧实时预览</p></div></div>' +
      '<div class="ab-editor-head">' +
        '<input class="ab-input" id="abTitle" placeholder="文章标题" style="font-size:16px;font-weight:600">' +
        '<div class="ab-editor-meta">' +
          '<div class="ab-field" style="margin:0"><label class="ab-label">分类</label><input class="ab-input" id="abCat" list="abCatList" placeholder="如：技术"><datalist id="abCatList"></datalist></div>' +
          '<div class="ab-field" style="margin:0"><label class="ab-label">标签（逗号分隔）</label><input class="ab-input" id="abTags" placeholder="如：前端, 随笔"></div>' +
        '</div>' +
        '<div class="ab-field" style="margin:0"><label class="ab-label">封面图 URL（可选）</label><div class="ab-row"><input class="ab-input" id="abCover" placeholder="https://… 或选择媒体库"><button class="ab-btn sm" id="abPickCover">从媒体库选择</button></div></div>' +
        '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:0">' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer"><input type="checkbox" id="abPinned"> ' + icon('pin', 14) + ' 置顶</label>' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer"><input type="checkbox" id="abProtect"> ' + icon('lock', 14) + ' 加密</label>' +
          '<input class="ab-input" id="abProtectPwd" type="password" placeholder="文章访问密码（勾选加密后设置）" style="display:none;max-width:260px">' +
        '</div>' +
      '</div>' +
      '<div class="ab-editor-split">' +
        '<div class="ab-editor-pane">' +
          '<div class="ab-editor-toolbar" id="abToolbar">' +
            '<button class="ab-tool" data-md="bold" title="粗体">B</button>' +
            '<button class="ab-tool" data-md="italic" title="斜体"><i>I</i></button>' +
            '<button class="ab-tool" data-md="h" title="标题">H</button>' +
            '<button class="ab-tool" data-md="quote" title="引用">❝</button>' +
            '<button class="ab-tool" data-md="code" title="代码">&lt;/&gt;</button>' +
            '<button class="ab-tool" data-md="ul" title="列表">≡</button>' +
            '<button class="ab-tool" data-md="link" title="链接">🔗</button>' +
            '<button class="ab-tool" data-md="img" title="图片">🖼</button>' +
          '</div>' +
          '<textarea class="ab-editor-area" id="abBody" placeholder="开始用 Markdown 写作…"></textarea>' +
        '</div>' +
        '<div class="ab-editor-pane"><div class="ab-editor-preview" id="abPreviewPane"></div></div>' +
      '</div>' +
      '<div class="ab-row" style="margin-top:16px;justify-content:flex-end;gap:10px">' +
        (cloudOn() ? '' : '<button class="ab-btn" id="abExport">一键导出 posts.js + feed.xml + sitemap.xml</button>') +
        '<button class="ab-btn" id="abSaveDraft">存草稿</button>' +
        '<button class="ab-btn primary" id="abPublish">' + icon('check', 15) + ' 发布</button>' +
      '</div>';

    bindEditor(content, route);
    if (route.id) loadEditor(content, route.id); else updatePreview(content);
  }

  function bindEditor(content, route) {
    var area = content.querySelector('#abBody');
    area.addEventListener('input', debounce(function () { updatePreview(content); }, 200));
    content.querySelector('#abToolbar').querySelectorAll('[data-md]').forEach(function (b) {
      b.addEventListener('click', function () { insertMd(area, b.getAttribute('data-md')); updatePreview(content); area.focus(); });
    });
    content.querySelector('#abSaveDraft').addEventListener('click', function () { saveEditor(content, route, 'draft'); });
    content.querySelector('#abPublish').addEventListener('click', function () { saveEditor(content, route, 'published'); });
    var exp = content.querySelector('#abExport');
    if (exp) exp.addEventListener('click', downloadAllStatic);
    var pick = content.querySelector('#abPickCover');
    if (pick) pick.addEventListener('click', function () { openMediaPicker(content); });
    // 加密勾选 → 密码框显隐
    var protectChk = content.querySelector('#abProtect');
    var protectPwd = content.querySelector('#abProtectPwd');
    if (protectChk && protectPwd) {
      protectChk.addEventListener('change', function () { protectPwd.style.display = protectChk.checked ? 'inline-block' : 'none'; });
    }
    // 填充分类候选
    if (cloudOn()) {
      api('api/posts').then(function (d) {
        var list = (d && d.posts) || [];
        var cats = {}; list.forEach(function (p) { if (p.category) cats[p.category] = 1; });
        content.querySelector('#abCatList').innerHTML = Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
      }).catch(function () {});
    }
  }
  function updatePreview(content) {
    var area = content.querySelector('#abBody');
    var pane = content.querySelector('#abPreviewPane');
    var md = area.value || '';
    if (window.renderMarkdown) pane.innerHTML = window.renderMarkdown(md);
    else pane.textContent = md;
  }
  function insertMd(area, type) {
    var s = area.selectionStart, e = area.selectionEnd, v = area.value;
    var sel = v.slice(s, e), pre = '', post = '', rep = sel;
    if (type === 'bold') { pre = '**'; post = '**'; }
    else if (type === 'italic') { pre = '*'; post = '*'; }
    else if (type === 'h') { pre = '## '; }
    else if (type === 'quote') { pre = '> '; }
    else if (type === 'code') { pre = '`'; post = '`'; }
    else if (type === 'ul') { pre = '- '; }
    else if (type === 'link') { rep = '[' + (sel || '链接文字') + '](https://)'; }
    else if (type === 'img') { rep = '![' + (sel || '图片描述') + '](https://)'; }
    area.value = v.slice(0, s) + pre + rep + post + v.slice(e);
    area.selectionStart = area.selectionEnd = s + pre.length + rep.length;
  }
  async function loadEditor(content, id) {
    var p = await getPost(id);
    if (!p) { toast('未找到该文章', 'err'); return; }
    content.querySelector('#abTitle').value = p.title || '';
    content.querySelector('#abCat').value = p.category || '';
    content.querySelector('#abTags').value = (p.tags || []).join(', ');
    content.querySelector('#abCover').value = p.cover || '';
    // 已加密文章：尝试用空内容提示
    if (p.protected && !p.content) {
      content.querySelector('#abBody').value = '';
      content.querySelector('#abBody').placeholder = '这是一篇加密文章，保存时将保留密文（如需编辑正文请先从列表取消加密）';
    } else {
      content.querySelector('#abBody').value = p.content || '';
    }
    content.querySelector('#abPinned').checked = !!p.pinned;
    var protectChk = content.querySelector('#abProtect');
    protectChk.checked = !!p.protected;
    if (p.protected) { content.querySelector('#abProtectPwd').style.display = 'inline-block'; }
    updatePreview(content);
  }
  async function saveEditor(content, route, status) {
    var title = content.querySelector('#abTitle').value.trim();
    var body = content.querySelector('#abBody').value;
    if (!title) { toast('请填写标题', 'err'); return; }
    var id = route.id || slug(title);
    var tags = content.querySelector('#abTags').value.split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);

    // 若正在编辑已有文章且该文章是加密的，先取完整对象以保留旧密文
    var existing = null;
    if (route.id) { try { existing = await getPost(route.id); } catch (e) {} }

    var wantPinned = !!content.querySelector('#abPinned').checked;
    var wantProtect = !!content.querySelector('#abProtect').checked;
    var protectPwd = (content.querySelector('#abProtectPwd').value || '').trim();

    var post = {
      id: id, title: title, date: new Date().toISOString().slice(0, 10),
      excerpt: (body.replace(/[#>*`\-!\[\]()]/g, '').slice(0, 120).trim()),
      content: body, cover: content.querySelector('#abCover').value.trim(),
      pinned: wantPinned, protected: false, enc: null, tags: tags,
      category: content.querySelector('#abCat').value.trim(),
      status: status
    };

    // —— 加密逻辑 ——
    if (wantProtect) {
      if (protectPwd && body) {
        // 新密码 + 有正文 → 加密
        if (protectPwd.length < 4) { toast('访问密码至少 4 位', 'err'); return; }
        post.enc = await encryptText(body, protectPwd);
        post.protected = true;
        post.content = '';
      } else if (existing && existing.protected) {
        // 已加密文章、未提供新密码 → 保留原密文
        post.protected = true;
        post.enc = existing.enc;
        post.content = '';
      } else {
        toast('勾选了加密但未填写文章访问密码', 'err'); return;
      }
    } else if (existing && existing.protected) {
      // 取消加密：保留明文（编辑器里有正文）
      post.protected = false;
      post.enc = null;
    }

    var btn = status === 'published' ? content.querySelector('#abPublish') : content.querySelector('#abSaveDraft');
    btn.disabled = true;
    try {
      var isNew = !route.id;
      var r = await savePost(post, isNew);
      if (r && (r.ok || r.post)) {
        toast(status === 'published' ? '已发布' : '已存草稿', 'ok');
        if (cloudOn()) go('/admin/posts'); else {
          toast('本地已保存，可导出 posts.js 发布', 'ok');
        }
      } else {
        toast('保存失败', 'err');
      }
    } catch (e) {
      if (!cloudOn()) { saveStaticPost(post); toast('已存草稿（本地）', 'ok'); }
      else toast('保存失败：' + (e.message || e), 'err');
    } finally { btn.disabled = false; }
  }

  function openMediaPicker(content) {
    var mask = document.createElement('div');
    mask.className = 'ab-modal-mask';
    mask.innerHTML = '<div class="ab-modal" style="max-width:560px"><h3>选择媒体</h3><div id="abPickerGrid" style="max-height:320px;overflow:auto"><span class="ab-spin"></span></div><div class="ab-modal-actions"><button class="ab-btn ghost" data-act="cancel">取消</button></div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask || e.target.getAttribute('data-act') === 'cancel') mask.remove(); });
    if (!cloudOn()) { mask.querySelector('#abPickerGrid').innerHTML = '<div class="ab-empty"><p>媒体库需在云端模式使用</p></div>'; return; }
    api('api/media').then(function (d) {
      var list = (d && d.media) || [];
      mask.querySelector('#abPickerGrid').innerHTML = list.length ? ('<div class="ab-media-grid">' + list.map(function (m) {
        return '<div class="ab-media-card" data-url="' + esc(m.url) + '" style="cursor:pointer"><div class="ab-media-thumb"><img src="' + esc(m.url) + '" alt=""></div><div class="ab-media-meta"><div class="ab-media-name">' + esc(m.name || '图片') + '</div></div></div>';
      }).join('') + '</div>') : '<div class="ab-empty"><p>媒体库为空</p></div>';
      mask.querySelectorAll('[data-url]').forEach(function (c) { c.addEventListener('click', function () {
        content.querySelector('#abCover').value = c.getAttribute('data-url'); mask.remove(); toast('已选择封面', 'ok');
      }); });
    }).catch(function (e) { mask.querySelector('#abPickerGrid').innerHTML = '<div class="ab-empty"><p>加载失败</p></div>'; });
  }

  /* ====================== 分类管理 ====================== */
  async function pageCategories(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">分类管理</h1><p class="ab-page-sub">分类是对文章的归类（每篇文章一个分类），在编辑器中设置。可重命名 / 删除。</p></div>' +
      (cloudOn() ? '' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">静态模式只读</span>') + '</div>' +
      '<div class="ab-card"><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>分类</th><th>文章数</th><th class="col-actions">操作</th></tr></thead><tbody id="abCatBody"></tbody></table></div></div>';
    await loadTerms(content, 'category', '#abCatBody');
  }
  async function pageTags(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">标签管理</h1><p class="ab-page-sub">标签是文章的关键词标记（每篇文章可多个），在编辑器中设置。可重命名 / 删除。</p></div>' +
      (cloudOn() ? '' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">静态模式只读</span>') + '</div>' +
      '<div class="ab-card"><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>标签</th><th>使用次数</th><th class="col-actions">操作</th></tr></thead><tbody id="abTagBody"></tbody></table></div></div>';
    await loadTerms(content, 'tags', '#abTagBody');
  }
  async function loadTerms(content, field, sel) {
    var body = content.querySelector(sel);
    body.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:24px"><span class="ab-spin"></span> 加载中…</td></tr>';
    var posts = [];
    try { posts = await listPosts(); } catch (e) {}
    var map = {};
    posts.forEach(function (p) {
      var vals = field === 'category' ? [(p.category || '未分类')] : (p.tags || []);
      vals.forEach(function (v) { var k = field === 'category' ? (p.category || '未分类') : v; if (k) map[k] = (map[k] || 0) + 1; });
    });
    var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    if (!keys.length) { body.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px" class="ab-muted">暂无' + (field === 'category' ? '分类' : '标签') + '</td></tr>'; return; }
    if (!cloudOn()) {
      body.innerHTML = keys.map(function (k) { return '<tr><td><span class="ab-chip ' + (field === 'category' ? 'cat' : '') + '">' + esc(k) + '</span></td><td>' + map[k] + '</td><td class="ab-muted">云端模式可编辑</td></tr>'; }).join('');
      return;
    }
    body.innerHTML = keys.map(function (k) {
      var ek = enc(k);
      return '<tr><td><span class="ab-chip ' + (field === 'category' ? 'cat' : '') + '">' + esc(k) + '</span></td><td>' + map[k] + '</td>' +
        '<td class="col-actions"><button class="ab-btn sm" data-rename="' + ek + '">' + icon('pen', 13) + ' 重命名</button> ' +
        '<button class="ab-btn sm danger" data-delterm="' + ek + '">' + icon('trash', 13) + ' 删除</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-rename]').forEach(function (b) { b.addEventListener('click', function () { renameTerm(content, field, dec(b.getAttribute('data-rename')), sel); }); });
    body.querySelectorAll('[data-delterm]').forEach(function (b) { b.addEventListener('click', function () {
      var old = dec(b.getAttribute('data-delterm'));
      confirmModal('删除' + (field === 'category' ? '分类' : '标签'), '<p class="ab-muted">将「' + esc(old) + '」从所有文章中移除，确定？</p>', async function () {
        try { await applyTermChange(field, old, null); toast('已删除', 'ok'); loadTerms(content, field, sel); } catch (e) { toast('失败：' + (e.message || e), 'err'); }
      }, '删除');
    }); });
  }
  async function renameTerm(content, field, old, sel) {
    var nv = prompt('将「' + old + '」重命名为：', old);
    if (nv == null) return; nv = nv.trim();
    if (!nv || nv === old) return;
    try { await applyTermChange(field, old, nv); toast('已重命名', 'ok'); loadTerms(content, field, sel); } catch (e) { toast('失败：' + (e.message || e), 'err'); }
  }
  async function applyTermChange(field, old, neo) {
    var summary = await listPosts();
    var ids = [];
    summary.forEach(function (p) {
      if (field === 'category') { if ((p.category || '未分类') === old) ids.push(p.id); }
      else { if ((p.tags || []).indexOf(old) >= 0) ids.push(p.id); }
    });
    for (var i = 0; i < ids.length; i++) {
      // 必须取「完整」文章（含正文）再改字段后回写，否则云端 PUT 会清空正文
      var full = await getPost(ids[i]);
      if (!full) continue;
      if (field === 'category') { full.category = neo || '未分类'; }
      else {
        var tags = (full.tags || []).slice();
        var j = tags.indexOf(old);
        if (j >= 0) { if (neo) { tags[j] = neo; } else { tags.splice(j, 1); } full.tags = tags; }
      }
      await savePost(full, false);
    }
  }

  /* ====================== 评论管理 ====================== */
  async function pageComments(content, filter) {
    var title = filter === 'pending' ? '待审核评论' : '全部评论';
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + title + '</h1><p class="ab-page-sub">审核与管理读者评论</p></div>' +
      (cloudOn() ? '' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">云端模式可用</span>') + '</div>' +
      (cloudOn() ? '' : '<div class="ab-card"><div class="ab-empty"><div class="ab-empty-ico">💬</div><p>评论管理需在云端模式（Cloudflare）下使用</p></div></div>');
    if (!cloudOn()) return;
    content.innerHTML += '<div class="ab-toolbar">' +
      '<div class="ab-search"><input class="ab-input" id="abCmtKw" placeholder="搜索评论内容 / 昵称…"></div>' +
      '<select class="ab-select" id="abCmtFilter" style="max-width:160px"><option value="all">全部</option><option value="pending"' + (filter === 'pending' ? ' selected' : '') + '>待审核</option><option value="approved">已通过</option></select>' +
      '</div><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>评论人</th><th>内容</th><th>所属文章</th><th>时间</th><th>状态</th><th class="col-actions">操作</th></tr></thead><tbody id="abCmtBody"></tbody></table></div>';
    bindComments(content);
    loadComments(content, filter);
  }
  function bindComments(content) {
    var kw = content.querySelector('#abCmtKw');
    var f = content.querySelector('#abCmtFilter');
    kw.addEventListener('input', debounce(function () { loadComments(content, f.value); }, 250));
    f.addEventListener('change', function () { loadComments(content, f.value); });
  }
  async function loadComments(content, filter) {
    var body = content.querySelector('#abCmtBody');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px"><span class="ab-spin"></span> 加载中…</td></tr>';
    var d;
    try { d = await api('api/comments?status=' + (filter === 'pending' ? 'pending' : 'all')); } catch (e) { body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px" class="ab-muted">加载失败：' + esc(e.message || e) + '</td></tr>'; return; }
    var list = (d && d.comments) || [];
    var kw = (content.querySelector('#abCmtKw').value || '').trim().toLowerCase();
    if (kw) list = list.filter(function (c) { return ((c.author || '') + ' ' + (c.content || '')).toLowerCase().indexOf(kw) >= 0; });
    if (!list.length) { body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:34px" class="ab-muted">暂无评论</td></tr>'; return; }
    body.innerHTML = list.map(function (c) {
      var st = c.status || 'approved';
      var actions = '';
      if (st === 'pending') actions += '<button class="ab-btn sm primary" data-approve="' + enc(c.id) + '">' + icon('check', 13) + ' 通过</button> ';
      actions += '<button class="ab-btn sm danger" data-delcmt="' + enc(c.id) + '">' + icon('trash', 13) + ' 删除</button>';
      return '<tr>' +
        '<td>' + esc(c.author || '匿名') + '</td>' +
        '<td style="max-width:320px">' + esc((c.content || '').slice(0, 120)) + '</td>' +
        '<td>' + esc(c.post_title || c.post_id || '—') + '</td>' +
        '<td>' + esc(fmtDate(c.date)) + '</td>' +
        '<td><span class="ab-status ' + st + '">' + (st === 'pending' ? '待审核' : '已通过') + '</span></td>' +
        '<td class="col-actions">' + actions + '</td>' +
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-approve]').forEach(function (b) { b.addEventListener('click', function () { approveComment(content, dec(b.getAttribute('data-approve')), filter); }); });
    body.querySelectorAll('[data-delcmt]').forEach(function (b) { b.addEventListener('click', function () {
      var cid = dec(b.getAttribute('data-delcmt'));
      confirmModal('删除评论', '<p class="ab-muted">确定删除这条评论？</p>', async function () {
        try { await api('api/comments/' + enc(cid), { method: 'DELETE' }); toast('已删除', 'ok'); loadComments(content, filter); } catch (e) { toast('失败：' + (e.message || e), 'err'); }
      }, '删除');
    }); });
  }
  async function approveComment(content, cid, filter) {
    try { await api('api/comments/' + enc(cid), { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }); toast('已通过', 'ok'); loadComments(content, filter); } catch (e) { toast('失败：' + (e.message || e), 'err'); }
  }

  /* ====================== 媒体库 ====================== */
  function pageMedia(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">媒体资源</h1><p class="ab-page-sub">上传与管理图片（云端存储于 D1，单张建议 ≤ 2MB）</p></div>' +
      (cloudOn() ? '<label class="ab-btn primary">' + icon('upload', 15) + ' 上传图片<input type="file" id="abUpload" accept="image/*" multiple hidden></label>' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">云端模式可用</span>') + '</div>' +
      (cloudOn() ? '' : '<div class="ab-card"><div class="ab-empty"><div class="ab-empty-ico">🖼</div><p>媒体库需在云端模式（Cloudflare）下使用</p></div></div>');
    if (!cloudOn()) return;
    content.innerHTML += '<div class="ab-media-grid" id="abMediaGrid"><span class="ab-spin"></span></div>';
    var up = content.querySelector('#abUpload');
    up.addEventListener('change', function () { uploadFiles(content, up.files); });
    loadMedia(content);
  }
  async function loadMedia(content) {
    var grid = content.querySelector('#abMediaGrid');
    grid.innerHTML = '<span class="ab-spin"></span> 加载中…';
    try {
      var d = await api('api/media');
      var list = (d && d.media) || [];
      grid.innerHTML = list.length ? list.map(function (m) {
        return '<div class="ab-media-card">' +
          '<div class="ab-media-thumb"><img src="' + esc(m.url) + '" alt="' + esc(m.name || '') + '"></div>' +
          '<div class="ab-media-meta"><div class="ab-media-name">' + esc(m.name || '图片') + '</div><div class="ab-media-size">' + fmtSize(m.size) + '</div></div>' +
          '<div class="ab-media-actions"><button class="ab-btn sm" data-copy="' + enc(m.url) + '">复制链接</button><button class="ab-btn sm danger" data-delmedia="' + enc(m.id) + '">' + icon('trash', 13) + ' 删除</button></div>' +
        '</div>';
      }).join('') : '<div class="ab-card ab-empty"><div class="ab-empty-ico">🖼</div><p>还没有图片，点击右上角上传</p></div>';
      grid.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copyText(dec(b.getAttribute('data-copy'))); toast('已复制链接', 'ok'); }); });
      grid.querySelectorAll('[data-delmedia]').forEach(function (b) { b.addEventListener('click', function () {
        var mid = dec(b.getAttribute('data-delmedia'));
        confirmModal('删除图片', '<p class="ab-muted">确定从媒体库删除该图片？</p>', async function () {
          try { await api('api/media/' + enc(mid), { method: 'DELETE' }); toast('已删除', 'ok'); loadMedia(content); } catch (e) { toast('失败：' + (e.message || e), 'err'); }
        }, '删除');
      }); });
    } catch (e) { grid.innerHTML = '<div class="ab-empty"><p>加载失败：' + esc(e.message || e) + '</p></div>'; }
  }
  function copyText(t) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(t); else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } } catch (e) {}
  }
  async function uploadFiles(content, files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!/^image\//.test(file.type)) { toast(file.name + ' 不是图片', 'err'); continue; }
      if (file.size > 2 * 1048576) { toast(file.name + ' 超过 2MB', 'err'); continue; }
      try {
        var dataUrl = await readAsDataURL(file);
        await api('api/media', { method: 'POST', body: JSON.stringify({ name: file.name, url: dataUrl, type: file.type, size: file.size }) });
        toast('已上传 ' + file.name, 'ok');
      } catch (e) { toast('上传失败：' + (e.message || e), 'err'); }
    }
    loadMedia(content);
  }
  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error('读取失败')); };
      r.readAsDataURL(file);
    });
  }

  /* ====================== 博客设置 ====================== */
  function pageSettings(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">博客设置</h1><p class="ab-page-sub">站点信息、个人资料与导航菜单</p></div>' +
      (cloudOn() ? '<button class="ab-btn primary" id="abSaveSettings">' + icon('save', 15) + ' 保存设置</button>' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">云端模式可用</span>') + '</div>' +
      (cloudOn() ? '' : '<div class="ab-card"><div class="ab-empty"><div class="ab-empty-ico">⚙️</div><p>站点设置需在云端模式（Cloudflare）下持久化</p></div></div>');
    if (!cloudOn()) return;
    content.innerHTML += '<div class="ab-tabs">' +
      '<div class="ab-tab active" data-tab="site">站点基础信息</div>' +
      '<div class="ab-tab" data-tab="profile">个人资料</div>' +
      '<div class="ab-tab" data-tab="nav">导航菜单</div>' +
      '</div><div id="abSettingsBody"></div>';
    content.querySelectorAll('.ab-tab').forEach(function (t) { t.addEventListener('click', function () { content.querySelectorAll('.ab-tab').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); renderSettingsTab(content, t.getAttribute('data-tab')); }); });
    renderSettingsTab(content, 'site');
    content.querySelector('#abSaveSettings').addEventListener('click', function () { saveSettings(content); });
    loadSettings(content);
  }
  var settingsCache = {};
  async function loadSettings(content) {
    try { var d = await api('api/settings'); settingsCache = (d && d.settings) || {}; } catch (e) { settingsCache = {}; }
    fillSettings(content);
  }
  function fillSettings(content) {
    var s = settingsCache;
    var site = safeJson(s.site_info);
    var prof = safeJson(s.profile);
    var navRaw = s.nav;
    if (content.querySelector('#abSiteName')) content.querySelector('#abSiteName').value = site.name || (cfg().footer && cfg().footer.copyrightName) || '';
    if (content.querySelector('#abSiteDesc')) content.querySelector('#abSiteDesc').value = site.desc || '';
    if (content.querySelector('#abSiteAvatar')) content.querySelector('#abSiteAvatar').value = site.avatar || '';
    if (content.querySelector('#abFooterCopyright')) content.querySelector('#abFooterCopyright').value = site.copyright || (cfg().footer && cfg().footer.copyrightName) || '';
    if (content.querySelector('#abFooterText')) content.querySelector('#abFooterText').value = site.footerText || (cfg().footer && cfg().footer.decl) || '';
    if (content.querySelector('#abModerate')) content.querySelector('#abModerate').checked = s.moderate_comments === '1';
    if (content.querySelector('#abProfileName')) content.querySelector('#abProfileName').value = prof.name || '';
    if (content.querySelector('#abProfileBio')) content.querySelector('#abProfileBio').value = prof.bio || '';
    if (content.querySelector('#abProfileAvatar')) content.querySelector('#abProfileAvatar').value = prof.avatar || '';
    if (content.querySelector('#abProfileEmail')) content.querySelector('#abProfileEmail').value = prof.email || '';
    if (content.querySelector('#abNavJson')) content.querySelector('#abNavJson').value = navRaw ? (typeof navRaw === 'string' ? navRaw : JSON.stringify(navRaw, null, 2)) : JSON.stringify(cfg().nav || [], null, 2);
  }
  function safeJson(v) { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch (e) { return {}; } }
  function renderSettingsTab(content, tab) {
    var body = content.querySelector('#abSettingsBody');
    if (tab === 'site') {
      body.innerHTML = '<div class="ab-card" style="max-width:620px">' +
        '<div class="ab-field"><label class="ab-label">站点名称</label><input class="ab-input" id="abSiteName"></div>' +
        '<div class="ab-field"><label class="ab-label">站点简介</label><textarea class="ab-textarea" id="abSiteDesc" style="min-height:70px"></textarea></div>' +
        '<div class="ab-field"><label class="ab-label">站点头像 / Logo URL</label><input class="ab-input" id="abSiteAvatar"></div>' +
        '<div class="ab-field"><label class="ab-label">页脚版权署名</label><input class="ab-input" id="abFooterCopyright"></div>' +
        '<div class="ab-field"><label class="ab-label">页脚声明</label><textarea class="ab-textarea" id="abFooterText" style="min-height:70px"></textarea></div>' +
        '<div class="ab-field"><label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><input type="checkbox" id="abModerate"> 新评论默认需要审核（开启后新评论先进入「待审核」）</label></div>' +
      '</div>';
    } else if (tab === 'profile') {
      body.innerHTML = '<div class="ab-card" style="max-width:620px">' +
        '<div class="ab-avatar-edit"><img class="ab-avatar-prev" id="abProfPrev" src=""><div><div class="ab-label" style="margin:0">个人头像预览</div><div class="ab-hint">在下方填写头像 URL</div></div></div>' +
        '<div class="ab-field"><label class="ab-label">昵称</label><input class="ab-input" id="abProfileName"></div>' +
        '<div class="ab-field"><label class="ab-label">简介</label><textarea class="ab-textarea" id="abProfileBio" style="min-height:70px"></textarea></div>' +
        '<div class="ab-field"><label class="ab-label">头像 URL</label><input class="ab-input" id="abProfileAvatar"></div>' +
        '<div class="ab-field"><label class="ab-label">联系邮箱</label><input class="ab-input" id="abProfileEmail"></div>' +
      '</div>';
      var pa = body.querySelector('#abProfileAvatar');
      var pv = body.querySelector('#abProfPrev');
      pa.addEventListener('input', function () { pv.src = pa.value; });
    } else if (tab === 'nav') {
      var defaultNav = [
        { text: '首页', url: '/' },
        { text: '归档', url: '/archive' },
        { text: '关于', url: '/about' },
        { text: '友链', url: '/links' }
      ];
      var exJson = JSON.stringify(settingsCache.nav ? (typeof settingsCache.nav === 'string' ? JSON.parse(settingsCache.nav || '[]') : settingsCache.nav) : (cfg().nav || defaultNav), null, 2);
      body.innerHTML = '<div class="ab-card" style="max-width:720px">' +
        '<div class="ab-section-title">' + icon('list', 15) + ' 可视化编辑</div>' +
        '<div id="abNavVisual" class="ab-nav-editor"></div>' +
        '<div class="ab-section-title" style="margin-top:16px">' + icon('doc', 15) + ' JSON 编辑（高级）</div>' +
        '<div class="ab-hint" style="margin-bottom:8px">直接编辑 JSON。每项格式：<code>{ "text": "菜单名", "url": "/路径" }</code>。支持子菜单：<code>{ "text": "更多", "children": [ ... ] }</code>。</div>' +
        '<textarea class="ab-textarea" id="abNavJson" style="min-height:180px;font-family:monospace;font-size:13px"></textarea>' +
        '<div class="ab-row" style="margin-top:8px;gap:8px">' +
          '<button class="ab-btn sm" id="abNavFormat">格式化 JSON</button>' +
          '<button class="ab-btn sm" id="abNavReset">恢复默认示例</button>' +
        '</div>' +
      '</div>';
      renderNavVisual(content, exJson);
      // JSON 格式化
      var fmtBtn = content.querySelector('#abNavFormat');
      if (fmtBtn) fmtBtn.addEventListener('click', function () {
        var ta = content.querySelector('#abNavJson');
        try { ta.value = JSON.stringify(JSON.parse(ta.value), null, 2); toast('已格式化', 'ok'); } catch (e) { toast('JSON 格式错误', 'err'); }
      });
      // 恢复默认
      var rstBtn = content.querySelector('#abNavReset');
      if (rstBtn) rstBtn.addEventListener('click', function () {
        content.querySelector('#abNavJson').value = JSON.stringify(defaultNav, null, 2);
        renderNavVisual(content, JSON.stringify(defaultNav, null, 2));
        toast('已恢复默认示例', 'ok');
      });
      // 双向同步：JSON textarea → 可视化
      content.querySelector('#abNavJson').addEventListener('input', debounce(function () {
        renderNavVisual(content, content.querySelector('#abNavJson').value);
      }, 400));
    }
    fillSettings(content);
  }
  async function saveSettings(content) {
    var site = {
      name: val(content, '#abSiteName'), desc: val(content, '#abSiteDesc'), avatar: val(content, '#abSiteAvatar'),
      copyright: val(content, '#abFooterCopyright'), footerText: val(content, '#abFooterText')
    };
    var prof = {
      name: val(content, '#abProfileName'), bio: val(content, '#abProfileBio'),
      avatar: val(content, '#abProfileAvatar'), email: val(content, '#abProfileEmail')
    };
    var navRaw = val(content, '#abNavJson');
    try { JSON.parse(navRaw); } catch (e) { toast('导航菜单 JSON 格式错误', 'err'); return; }
    var payload = {
      site_info: site, profile: prof, nav: navRaw,
      moderate_comments: content.querySelector('#abModerate') && content.querySelector('#abModerate').checked ? '1' : '0'
    };
    try {
      await api('api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      toast('设置已保存', 'ok');
    } catch (e) { toast('保存失败：' + (e.message || e), 'err'); }
  }
  function val(content, sel) { var el = content.querySelector(sel); return el ? el.value : ''; }

  /* ---------- 可视化导航编辑器 ---------- */
  function renderNavVisual(content, jsonStr) {
    var wrap = content.querySelector('#abNavVisual');
    if (!wrap) return;
    var items = [];
    try { items = JSON.parse(jsonStr || '[]'); } catch (e) { wrap.innerHTML = '<div class="ab-hint">JSON 格式错误，请修正</div>'; return; }
    if (!items.length) { wrap.innerHTML = '<div class="ab-hint">暂无导航项，可在下方 JSON 或点击「+添加」创建</div>'; }
    else {
      wrap.innerHTML = '<div class="ab-nav-list">' + items.map(function (it, i) {
        var children = (it.children || []).map(function (ch, ci) {
          return '<div class="ab-nav-row child">' +
            '<span class="ab-nav-ico">└</span>' +
            '<input class="ab-input ab-nav-text" data-idx="' + i + '" data-cidx="' + ci + '" value="' + esc(ch.text || '') + '" placeholder="子菜单名">' +
            '<input class="ab-input ab-nav-url" data-idx="' + i + '" data-cidx="' + ci + '" value="' + esc(ch.url || '') + '" placeholder="/path">' +
            '<button class="ab-btn-icon danger" data-rmchild="' + i + '-' + ci + '" title="删除子项">' + icon('trash', 14) + '</button>' +
          '</div>';
        }).join('');
        return '<div class="ab-nav-row">' +
          '<span class="ab-nav-ico">' + icon('list', 14) + '</span>' +
          '<input class="ab-input ab-nav-text" data-idx="' + i + '" value="' + esc(it.text || '') + '" placeholder="菜单名">' +
          '<input class="ab-input ab-nav-url" data-idx="' + i + '" value="' + esc(it.url || '') + '" placeholder="/path">' +
          '<button class="ab-btn-icon" data-addchild="' + i + '" title="添加子菜单">' + icon('plus', 14) + '</button>' +
          '<button class="ab-btn-icon danger" data-rmitem="' + i + '" title="删除">' + icon('trash', 14) + '</button>' +
        '</div>' + children;
      }).join('') + '</div>';
    }
    // 添加按钮
    wrap.innerHTML += '<button class="ab-btn sm" id="abNavAddItem" style="margin-top:8px">' + icon('plus', 13) + ' 添加菜单项</button>';

    // 事件：编辑文本 → 同步到 JSON
    function syncToJSON() {
      var rows = wrap.querySelectorAll('.ab-nav-row');
      var newItems = [];
      rows.forEach(function (row) {
        if (row.classList.contains('child')) return; // 子项在父项循环中处理
        var idx = parseInt(row.querySelector('[data-idx]').getAttribute('data-idx'), 10);
        var text = (row.querySelector('.ab-nav-text') || {}).value || '';
        var url = (row.querySelector('.ab-nav-url') || {}).value || '';
        var children = [];
        wrap.querySelectorAll('.ab-nav-row.child[data-idx="' + idx + '"]').forEach(function (cr) {
          children.push({ text: (cr.querySelector('.ab-nav-text') || {}).value || '', url: (cr.querySelector('.ab-nav-url') || {}).value || '' });
        });
        var item = { text: text, url: url };
        if (children.length) item.children = children;
        newItems.push(item);
      });
      content.querySelector('#abNavJson').value = JSON.stringify(newItems, null, 2);
    }
    wrap.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('input', debounce(syncToJSON, 300)); });

    // 添加菜单项
    wrap.querySelector('#abNavAddItem').addEventListener('click', function () {
      var ta = content.querySelector('#abNavJson');
      try {
        var arr = JSON.parse(ta.value || '[]');
        arr.push({ text: '新菜单', url: '/' });
        ta.value = JSON.stringify(arr, null, 2);
        renderNavVisual(content, ta.value);
      } catch (e) { toast('JSON 格式错误，请先修正', 'err'); }
    });

    // 添加子菜单
    wrap.querySelectorAll('[data-addchild]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-addchild'), 10);
        var ta = content.querySelector('#abNavJson');
        try {
          var arr = JSON.parse(ta.value || '[]');
          if (!arr[idx]) return;
          if (!arr[idx].children) arr[idx].children = [];
          arr[idx].children.push({ text: '子菜单', url: '/' });
          ta.value = JSON.stringify(arr, null, 2);
          renderNavVisual(content, ta.value);
        } catch (e) { toast('JSON 格式错误', 'err'); }
      });
    });

    // 删除菜单项
    wrap.querySelectorAll('[data-rmitem]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-rmitem'), 10);
        var ta = content.querySelector('#abNavJson');
        try {
          var arr = JSON.parse(ta.value || '[]');
          arr.splice(idx, 1);
          ta.value = JSON.stringify(arr, null, 2);
          renderNavVisual(content, ta.value);
        } catch (e) { toast('JSON 格式错误', 'err'); }
      });
    });

    // 删除子菜单
    wrap.querySelectorAll('[data-rmchild]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-rmchild').split('-');
        var idx = parseInt(parts[0], 10), cidx = parseInt(parts[1], 10);
        var ta = content.querySelector('#abNavJson');
        try {
          var arr = JSON.parse(ta.value || '[]');
          if (arr[idx] && arr[idx].children) arr[idx].children.splice(cidx, 1);
          ta.value = JSON.stringify(arr, null, 2);
          renderNavVisual(content, ta.value);
        } catch (e) { toast('JSON 格式错误', 'err'); }
      });
    });
  }

  /* ====================== 修改密码 ====================== */
  function openPasswordModal() {
    var mask = document.createElement('div');
    mask.className = 'ab-modal-mask';
    mask.innerHTML = '<div class="ab-modal"><h3>修改密码</h3>' +
      '<div class="ab-field" style="margin-bottom:12px"><label class="ab-label">当前密码</label><input class="ab-input" id="abCurPwd" type="password"></div>' +
      '<div class="ab-field" style="margin-bottom:12px"><label class="ab-label">新密码（≥8 位）</label><input class="ab-input" id="abNewPwd" type="password"></div>' +
      '<div class="ab-modal-actions"><button class="ab-btn ghost" data-act="cancel">取消</button><button class="ab-btn primary" id="abDoPwd">确定修改</button></div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask || e.target.getAttribute('data-act') === 'cancel') mask.remove(); });
    mask.querySelector('#abDoPwd').addEventListener('click', async function () {
      var cur = mask.querySelector('#abCurPwd').value, pwd = mask.querySelector('#abNewPwd').value;
      if (!cur || !pwd) { toast('请填写完整', 'err'); return; }
      try {
        await api('api/admin/password', { method: 'POST', body: JSON.stringify({ current: cur, password: pwd }) });
        toast('密码已更新，请重新登录', 'ok');
        mask.remove();
        if (cloudOn()) window.cloudLogout && window.cloudLogout();
        go('/admin');
      } catch (e) { toast('修改失败：' + (e.message || e), 'err'); }
    });
  }

  /* ----------------------- 导出 ----------------------- */
  window.QingyuAdmin = { mount: mount };

  /* app.js 先于本脚本执行时，初次 route() 因 QingyuAdmin 尚未定义而走了旧后台渲染。
   * 本脚本加载完成后，若当前已在后台路由，重新分发一次路由以挂载新版后台 UI。 */
  try {
    var _p = (typeof window.currentRoute === 'function') ? window.currentRoute().path : (location.pathname || '/');
    if (_p === '/write' || _p === '/admin' || _p.indexOf('/admin/') === 0 || /^\/posts\/[^\/]+\/edit$/.test(_p) || _p === '/posts/edit') {
      if (typeof window.route === 'function') window.route();
    }
  } catch (e) {}
})();
