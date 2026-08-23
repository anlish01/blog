/* ============================================================================
 * 轻语博客 · 前端逻辑（app.js）
 * ----------------------------------------------------------------------------
 * 包含：列表 / 详情 / 写作 / 搜索 / 标签 / 归档 / 评论 / 加密 / TOC / 代码高亮 / 统计
 * 版本 v2.1.0 ｜ 侧边导航已集成 ｜ 2026-08-22
 * ============================================================================ */
'use strict';

var BLOG_VERSION = '2.4.2';

/* ---------- 全局缓存 ---------- */
var _unlocked = {};
var _searchOpen = false;   // 顶部导航搜索是否展开
var _searchDocBound = false;   // document 级外部点击监听是否已绑定
var _commentsCache = {};
var _statsCache = {};
var _routeTimer = null;

/* ---------- 基础工具 ---------- */
/* ---------- main theme (dark / light) ---------- */
function themeKey() { return 'qingyu.theme'; }
function getTheme() {
  try { var v = localStorage.getItem(themeKey()); if (v === 'light' || v === 'dark') return v; } catch (e) {}
  try { if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } catch (e) {}
  return 'light';
}
function applyTheme(t) {
  if (t !== 'dark') t = 'light';
  try { document.documentElement.setAttribute('data-theme', t); } catch (e) {}
}
function setTheme(t) { applyTheme(t); try { localStorage.setItem(themeKey(), t); } catch (e) {} }
function toggleTheme() { var n = getTheme() === 'dark' ? 'light' : 'dark'; setTheme(n); refreshThemeIcon(); return n; }
/* 统一 SVG 图标：currentColor 描边，自动继承文字色、hover 变主题色 */
function svgIcon(name, size) {
  size = size || 18;
  var s = 'width="' + size + '" height="' + size + '"';
  var c = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  var I = {
    sun: '<svg ' + s + ' ' + c + '><circle cx="12" cy="12" r="4"/><path d="M12 2.4v2.4M12 19.2v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>',
    moon: '<svg ' + s + ' ' + c + '><path d="M20.5 13.2A8.5 8.5 0 1 1 11 3.5a6.6 6.6 0 0 0 9.5 9.7z"/></svg>',
    pin: '<svg ' + s + ' ' + c + '><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
    lock: '<svg ' + s + ' ' + c + '><rect x="5" y="11" width="14" height="9" rx="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    eye: '<svg ' + s + ' ' + c + '><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    heart: '<svg ' + s + ' ' + c + '><path d="M12 20s-7-4.6-7-9.3A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.7C19 15.4 12 20 12 20z"/></svg>',
    cloud: '<svg ' + s + ' ' + c + '><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17.5 18z"/><path d="M12 13v5M9.5 15.5 12 13l2.5 2.5"/></svg>',
    save: '<svg ' + s + ' ' + c + '><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></svg>',
    external: '<svg ' + s + ' ' + c + '><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    download: '<svg ' + s + ' ' + c + '><path d="M12 4v10M8 11l4 4 4-4M5 19h14"/></svg>',
    upload: '<svg ' + s + ' ' + c + '><path d="M12 20V10M8 13l4-4 4 4M5 5h14"/></svg>',
    file: '<svg ' + s + ' ' + c + '><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
    rss: '<svg ' + s + ' ' + c + '><circle cx="5" cy="18" r="1"/><path d="M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15"/></svg>',
    sitemap: '<svg ' + s + ' ' + c + '><rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="4" width="7" height="5" rx="1"/><rect x="9" y="15" width="7" height="5" rx="1"/><path d="M6.5 9v3h11V9M12.5 12v3"/></svg>',
    spinner: '<svg class="spin-icon" ' + s + ' ' + c + '><path d="M12 3a9 9 0 1 0 9 9" /></svg>',
    question: '<svg ' + s + ' ' + c + '><circle cx="12" cy="12" r="9"/><path d="M9.2 9.6a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2-2.6 3.6M12 17h.01"/></svg>',
    doc: '<svg ' + s + ' ' + c + '><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h5M9.5 15h5"/></svg>',
    top: '<svg ' + s + ' ' + c + '><path d="M12 20V6"/><path d="M6 11.5 12 5.5l6 6"/></svg>',
    pen: '<svg ' + s + ' ' + c + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    logout: '<svg ' + s + ' ' + c + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>'
  };
  return I[name] || '';
}
function themeIcon() { return getTheme() === 'dark' ? svgIcon('sun', 18) : svgIcon('moon', 18); }
function refreshThemeIcon() {
  var b = document.querySelector('#themeToggle'); if (b) b.innerHTML = themeIcon();
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stripMd(md) {
  var s = String(md || '');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]*)`/g, '$1');
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/^#{1,6}\s*/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/^\s*\d+\.\s+/gm, '');
  s = s.replace(/^>\s*/gm, '');
  s = s.replace(/[*_~`]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function htmlToText(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function sortPosts(a, b) {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
  if (a.date === b.date) return (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
  return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
}

function normalizeTags(p) {
  if (Array.isArray(p && p.tags)) return p.tags.map(function (t) { return String(t).trim(); }).filter(Boolean);
  return String((p && p.tags) || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
}

function parseMdFile(text, filename) {
  var src = String(text || '');
  var meta = {};
  var body = src;
  if (/^---\r?\n/.test(src)) {
    var end = src.indexOf('\n---', 3);
    if (end > 0) {
      var block = src.slice(3, end);
      body = src.slice(end + 4).replace(/^\r?\n/, '');
      block.split(/\r?\n/).forEach(function (line) {
        var m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (m) meta[m[1].toLowerCase()] = m[2].trim();
      });
    }
  }
  var base = String(filename || '').replace(/\.md$/i, '').replace(/^.*[\\\/]/, '');
  var id = slugify(meta.id || base || 'post-' + Date.now());
  return {
    id: id,
    title: meta.title || base || '未命名文章',
    date: meta.date || new Date().toISOString().slice(0, 10),
    tags: meta.tags || '',
    excerpt: meta.excerpt || '',
    password: meta.password || '',
    content: body.trim()
  };
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'post';
}

/* ---------- Markdown 渲染器 ---------- */
function tokenizeCode(lang, code) {
  if (!lang || !/^(js|javascript|ts|typescript|python|py|bash|sh|css|html|json)$/i.test(lang)) {
    return esc(code);
  }
  lang = lang.toLowerCase();
  var out = '';
  var kw = '';
  if (lang === 'js' || lang === 'javascript' || lang === 'ts' || lang === 'typescript') {
    kw = '\\b(?:const|let|var|function|return|if|else|for|while|class|new|import|export|from|async|await|try|catch|throw|switch|case|break|continue|typeof|instanceof|in|of|this|do|yield|delete|void|null|undefined|true|false)\\b';
  } else if (lang === 'python' || lang === 'py') {
    kw = '\\b(?:def|return|if|else|elif|for|while|import|from|class|try|except|finally|with|as|pass|break|continue|lambda|global|nonlocal|yield|True|False|None|not|and|or|in|is|raise|assert|del)\\b';
  } else if (lang === 'bash' || lang === 'sh') {
    kw = '\\b(?:if|then|else|fi|for|while|do|done|case|esac|function|echo|export|cd|exit|return|local|sudo|grep|sed|awk|curl|wget|npm|node|npx|git)\\b';
  } else if (lang === 'css') {
    kw = '\\b(?:display|position|color|background|margin|padding|border|width|height|font|opacity|flex|grid|z-index|top|right|bottom|left|transform|transition|@media|@keyframes)\\b';
  } else if (lang === 'html') {
    return esc(code);
  } else if (lang === 'json') {
    return esc(code);
  }
  var re = new RegExp('(' + kw + ')|(\\d+(?:\\.\\d+)?)|(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#.*|<!--[\\s\\S]*?-->)|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')', 'g');
  var last = 0, m;
  while ((m = re.exec(code)) !== null) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += '<span class="tok-kw">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="tok-num">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="tok-com">' + esc(m[3]) + '</span>';
    else if (m[4]) out += '<span class="tok-str">' + esc(m[4]) + '</span>';
    last = m.index + m[0].length;
  }
  out += esc(code.slice(last));
  return out;
}

function renderMarkdown(md) {
  var src = String(md || '');
  var tocCount = 0;
  var lines = src.split(/\r?\n/);
  var html = '';
  var i = 0;

  // 逐块解析
  while (i < lines.length) {
    var line = lines[i];

    // 代码块
    if (/^```/.test(line)) {
      var lang = line.replace(/^```/, '').trim();
      var codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 跳过 ```
      html += '<pre class="code-block"><code class="lang-' + esc(lang) + '">' + tokenizeCode(lang, codeLines.join('\n')) + '</code></pre>\n';
      continue;
    }

    // 标题
    var hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      var lvl = hm[1].length;
      var txt = hm[2].trim();
      tocCount++;
      html += '<h' + lvl + ' id="toc-' + tocCount + '">' + inlineMd(txt) + '</h' + lvl + '>\n';
      i++;
      continue;
    }

    // 空行
    if (/^\s*$/.test(line)) { i++; continue; }

    // 表格
    if (i + 1 < lines.length && /\|/.test(line) && /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(lines[i+1])) {
      var headerRow = line;
      var sepRow = lines[i+1];
      var headerCells = headerRow.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      i += 2;
      var rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') {
        var cells = lines[i].replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        rows.push(cells);
        i++;
      }
      html += '<table><thead><tr>' + headerCells.map(function (c) { return '<th>' + inlineMd(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr>' + r.map(function (c) { return '<td>' + inlineMd(c) + '</td>'; }).join('') + '</tr>';
      });
      html += '</tbody></table>\n';
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      var quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html += '<blockquote><p>' + inlineMd(quoteLines.join(' ')) + '</p></blockquote>\n';
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        html += '<li>' + inlineMd(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>\n';
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      html += '<ol>\n';
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        html += '<li>' + inlineMd(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>\n';
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    // 分割线
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      html += '<hr>\n';
      i++;
      continue;
    }

    // 普通段落（聚合到空行）
    var para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i]) && !/^#{1,6}\s+/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    html += '<p>' + inlineMd(para.join(' ')) + '</p>\n';
  }

  return html;
}

function inlineMd(s) {
  var t = esc(String(s || ""));
  t = t.replace(/\\\\([*_`~\\[\\]])/g, '\u0001$1');
  // 行内代码
  t = t.replace(/`([^`]*)`/g, '<code class="inline-code">$1</code>');
  // 斜体
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // 加粗
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // 删除线
  t = t.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  // 图片（过滤 javascript:/data: 等危险协议）
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (m, alt, src) {
    if (/^\s*(javascript|data|vbscript):/i.test(String(src).trim())) return m;
    return '<img src="' + src + '" alt="' + alt + '">';
  });
  // 链接（过滤 javascript:/data: 等危险协议）
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, txt, url) {
    if (/^\s*(javascript|data|vbscript):/i.test(String(url).trim())) return m;
    return '<a href="' + url + '">' + txt + '</a>';
  });
  // 恢复遮罩
  t = t.replace(/\u0001([*_`~\[\]])/g, '$1');
  return t;
}

function buildToc(html) {
  var sections = [];
  var re = /<h([1-6]) id="(toc-(\d+))">([\s\S]*?)<\/h[1-6]>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    sections.push({ lvl: Number(m[1]), id: m[2], order: Number(m[3]), text: htmlToText(m[4]) });
  }
  if (sections.length < 2) return { html: '', headings: sections };
  // 多级有序编号：1 / 1.1 / 1.2 / 2 / 2.1 …
  var counts = [0, 0, 0, 0, 0, 0, 0]; // 索引 1..6 对应层
  sections.forEach(function (s) {
    counts[s.lvl]++;
    for (var k = s.lvl + 1; k <= 6; k++) counts[k] = 0;
    var parts = [];
    for (var j = 1; j <= s.lvl; j++) if (counts[j]) parts.push(counts[j]);
    s.num = parts.join('.');
  });
  var hs = sections.map(function (s) {
    return '<a href="#' + s.id + '" data-toc="' + s.id + '" style="padding-left:' + ((s.lvl - 1) * 14) + 'px"><span class="toc-num">' + esc(s.num) + '</span>' + esc(s.text) + '</a>';
  }).join('');
  return {
    headings: sections,
    html: '<details class="toc"><summary>📑 目录</summary><div class="toc-list">' + hs + '</div></details>'
  };
}

/** 给正文标题前插入编号（与目录一致），便于「标题为有序」 */
function stampHeadingNumbers(headings) {
  if (!headings || !document) return;
  headings.forEach(function (s) {
    try {
      var el = (typeof document.getElementById === 'function') ? document.getElementById(s.id) : document.querySelector('#' + s.id);
      if (!el || typeof el.insertBefore !== 'function' || typeof el.firstChild === 'undefined') return;
      var span = document.createElement('span');
      if (!span) return;
      span.className = 'toc-num';
      span.textContent = s.num;
      el.insertBefore(span, el.firstChild);
    } catch (e) { /* 编号标注失败不应影响正文渲染 */ }
  });
}

/* ---------- 配置与数据 ---------- */
function getConfig() {
  var cfg = (typeof window !== 'undefined' && window.BLOG_CONFIG) || {};
  return {
    mode: cfg.mode || 'auto',
    apiBase: cfg.apiBase || '',
    siteUrl: cfg.siteUrl || (typeof location !== 'undefined' ? location.origin : ''),
    writeToken: cfg.writeToken || '',
    adminPwd: cfg.adminPwd || '',
    pageSize: (typeof cfg.pageSize === 'number' && cfg.pageSize >= 0) ? cfg.pageSize : 8,
    nav: Array.isArray(cfg.nav) ? cfg.nav : [],
    footer: cfg.footer || {},
    ads: cfg.ads || {}
  };
}

function getStaticPosts() {
  return (typeof window !== 'undefined' && Array.isArray(window.BLOG_POSTS)) ? window.BLOG_POSTS : [];
}

function slug(s) { return String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64); }

function apiBase() {
  var cfg = getConfig();
  if (cfg.apiBase) return cfg.apiBase.replace(/\/+$/, '');
  return '';
}

async function apiFetch(url, opts) {
  var cfg = getConfig();
  var base = apiBase();
  // 统一拼绝对地址：避免在子路径页面（如 /posts/<别名>/）下，
  // 相对路径 api/... 被浏览器解析成 /posts/<别名>/api/... 而打错。
  var path = String(url).replace(/^\/+/, '');
  var originOk = typeof location !== 'undefined' && /^https?:$/.test(String(location.protocol || ''));
  var full = /^https?:/i.test(path)
    ? path
    : (base ? base.replace(/\/+$/, '') + '/' : (originOk ? location.origin + '/' : '')) + path;
  var headers = (opts && opts.headers) || {};
  // 云端会话 token（登录后由 /api/admin/login 签发并存入 localStorage）
  var session = _sessionToken();
  if (session) headers['Authorization'] = 'Bearer ' + session;
  else if (cfg.writeToken) headers['Authorization'] = 'Bearer ' + cfg.writeToken;
  // 仅写请求（或显式带 body）才设置 Content-Type：GET 设置它会在跨域时多一次 OPTIONS 预检
  var method = String((opts && opts.method) || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' || (opts && opts.body)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  var res = await fetch(full, Object.assign({}, opts, { headers: headers }));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function sortPagePosts(posts) {
  return (posts || []).slice().sort(sortPosts);
}

/* ---------- 搜索 ---------- */
function globalSearch(query, limit) {
  var q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  var posts = sortPagePosts(getStaticPosts());
  var hits = [];
  posts.forEach(function (p) {
    if (p.protected && !_unlocked[p.id]) return;
    var hay = (p.title || '') + ' ' + (p.excerpt || '') + ' ' + (p.content || '') + ' ' + (p.tags || []).join(' ');
    if (hay.toLowerCase().indexOf(q) >= 0) hits.push(p);
  });
  return hits.slice(0, limit || 8);
}

function searchSnippet(post, query) {
  var q = String(query || '').trim();
  if (!q) return '';
  var body = stripMd(post.content || '');
  var idx = body.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) idx = (post.excerpt || '').toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) idx = (post.title || '').toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return '';
  var start = Math.max(0, idx - 30);
  var end = Math.min(body.length, idx + q.length + 40);
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
}

/* ---------- 加密 ---------- */
function bufToB64(buf) {
  var bytes = new Uint8Array(buf);
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64) {
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
async function deriveKey(password, salt) {
  var enc = new TextEncoder();
  var keyMaterial = await (window.crypto || crypto).subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveKey']);
  return (window.crypto || crypto).subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptText(text, password) {
  var salt = (window.crypto || crypto).getRandomValues(new Uint8Array(16));
  var iv = (window.crypto || crypto).getRandomValues(new Uint8Array(12));
  var key = await deriveKey(password, salt);
  var enc = new TextEncoder();
  var data = await (window.crypto || crypto).subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(String(text)));
  return { salt: bufToB64(salt.buffer), iv: bufToB64(iv.buffer), data: bufToB64(data) };
}
async function decryptText(enc, password) {
  try {
    var salt = new Uint8Array(b64ToBuf(enc.salt));
    var iv = new Uint8Array(b64ToBuf(enc.iv));
    var data = b64ToBuf(enc.data);
    var key = await deriveKey(password, salt);
    var plain = await (window.crypto || crypto).subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return new TextDecoder().decode(plain);
  } catch (e) { return null; }
}
function isUnlocked(id) { return !!_unlocked[id]; }
function getUnlocked(id) { return _unlocked[id] || ''; }
async function tryUnlock(id, password) {
  var post = (getStaticPosts() || []).find(function (p) { return p.id === id; });
  if (!post) return false;
  // 云端模式：列表接口 /api/posts 不返回 enc（密文），锁屏时须先从详情接口取回
  if (!post.enc && _cloudOn()) {
    try {
      var data = await apiFetch('api/posts/' + encodeURIComponent(id));
      var full = (data && data.post) || null;
      if (full && full.enc) post.enc = full.enc;
    } catch (e) { /* 拉取失败则按无密文处理 */ }
  }
  if (!post.enc) return false;
  var plain = await decryptText(post.enc, password);
  if (plain !== null) {
    _unlocked[id] = plain;
    try { if (typeof route === 'function') route(); } catch (e) {}
    return true;
  }
  return false;
}

/* ---------- 评论 ----------
 * 云端模式：走 D1 后端（/api/posts/:id/comments，跨用户共享）；
 * 静态模式：本地 localStorage。
 */
function commentKey(id) { return 'qingyu.comments.' + id; }
function commentApi(id) { return 'api/posts/' + encodeURIComponent(String(id || '')) + '/comments'; }

async function loadComments(postId) {
  var id = String(postId || '');
  if (_cloudOn()) {
    // 云端评论实时共享，不命中本地缓存
    try {
      var data = await apiFetch(commentApi(id));
      var arr = (data && Array.isArray(data.comments)) ? data.comments : [];
      _commentsCache[id] = arr;
      return arr;
    } catch (e) { return []; }
  }
  if (_commentsCache[id]) return _commentsCache[id];
  var raw = '';
  try { raw = localStorage.getItem(commentKey(id)) || ''; } catch (e) {}
  var arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; }
  _commentsCache[id] = arr;
  return arr;
}

async function saveComment(postId, author, content) {
  var id = String(postId || '');
  author = String(author || '').trim().slice(0, 30);
  content = String(content || '').trim().slice(0, 1000);
  if (!author || !content) return null;
  if (_cloudOn()) {
    try {
      var data = await apiFetch(commentApi(id), {
        method: 'POST',
        body: JSON.stringify({ author: author, content: content })
      });
      var c = (data && data.comment) || null;
      if (c) { try { delete _commentsCache[id]; } catch (e) {} }
      return c;
    } catch (e) { return null; }
  }
  var list = await loadComments(id);
  var comment = {
    id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    author: author,
    content: content,
    date: new Date().toISOString().slice(0, 10)
  };
  if (list.length >= 300) list.shift();
  list.push(comment);
  _commentsCache[id] = list;
  try { localStorage.setItem(commentKey(id), JSON.stringify(list)); } catch (e) {}
  return comment;
}

async function deleteComment(postId, cid) {
  var id = String(postId || '');
  if (_cloudOn()) {
    // 云端删除需管理员会话（apiFetch 自动携带 Bearer token）
    try {
      await apiFetch(commentApi(id) + '/' + encodeURIComponent(String(cid || '')), { method: 'DELETE', body: '{}' });
      try { delete _commentsCache[id]; } catch (e) {}
      return await loadComments(id);
    } catch (e) { return _commentsCache[id] || []; }
  }
  var list = await loadComments(id);
  var next = list.filter(function (c) { return c.id !== cid; });
  _commentsCache[id] = next;
  try { localStorage.setItem(commentKey(id), JSON.stringify(next)); } catch (e) {}
  return next;
}

/* ---------- 统计 ----------
 * 云端模式：走 D1 后端（/api/posts/:id/stats，跨用户共享）；
 * 静态模式：本地 localStorage。
 */
function statKey(id) { return 'qingyu.stats.' + id; }
function statApi(id) { return 'api/posts/' + encodeURIComponent(String(id || '')) + '/stats'; }

async function loadStats(postId) {
  var id = String(postId || '');
  if (_cloudOn()) {
    try {
      var data = await apiFetch(statApi(id));
      var s = (data && data.stats) || { views: 0, likes: 0 };
      _statsCache[id] = s;
      return s;
    } catch (e) { return { views: 0, likes: 0 }; }
  }
  if (_statsCache[id]) return _statsCache[id];
  var s = { views: 0, likes: 0 };
  try {
    var raw = localStorage.getItem(statKey(id));
    if (raw) { var parsed = JSON.parse(raw); s = { views: Number(parsed.views) || 0, likes: Number(parsed.likes) || 0 }; }
  } catch (e) {}
  _statsCache[id] = s;
  return s;
}

async function incView(postId) {
  if (_cloudOn()) {
    try {
      var data = await apiFetch(statApi(postId), { method: 'POST', body: JSON.stringify({ action: 'views' }) });
      var s = (data && data.stats) || { views: 0, likes: 0 };
      _statsCache[postId] = s;
      return s;
    } catch (e) { return _statsCache[postId] || { views: 0, likes: 0 }; }
  }
  var s = await loadStats(postId);
  s.views = Math.min(s.views + 1, 9999999);
  _statsCache[postId] = s;
  try { localStorage.setItem(statKey(postId), JSON.stringify(s)); } catch (e) {}
  return s;
}

/** 是否已点过赞（本地记录，防刷） */
function likedKey(id) { return 'qingyu.liked.' + String(id || ''); }
function wasLiked(postId) {
  try { return localStorage.getItem(likedKey(postId)) === '1'; } catch (e) { return false; }
}
function markLiked(postId) {
  try { localStorage.setItem(likedKey(postId), '1'); } catch (e) {}
}

async function likePost(postId) {
  if (wasLiked(postId)) return null;   // 已赞，防重复
  if (_cloudOn()) {
    try {
      var data = await apiFetch(statApi(postId), { method: 'POST', body: JSON.stringify({ action: 'like' }) });
      markLiked(postId);
      var s = (data && data.stats) || { views: 0, likes: 0 };
      _statsCache[postId] = s;
      return s;
    } catch (e) { return null; }
  }
  var s = await loadStats(postId);
  s.likes = Math.min(s.likes + 1, 9999999);
  markLiked(postId);
  _statsCache[postId] = s;
  try { localStorage.setItem(statKey(postId), JSON.stringify(s)); } catch (e) {}
  return s;
}

/* ---------- 管理员门禁 ----------
 * 云端模式（API 可用）：密码存 Cloudflare KV，前端只持有会话 token。
 *   登录 POST /api/admin/login → token 存 localStorage('qingyu.token')。
 * 静态模式（file:// 或纯静态托管）：保留本地密码门禁（防君子）。
 */
function _cfgPwd() { return getConfig().adminPwd; }
function _localPwd() { try { return localStorage.getItem('qingyu.admin.pwd') || ''; } catch (e) { return ''; } }
function _setLocalPwd(v) { try { localStorage.setItem('qingyu.admin.pwd', String(v)); } catch (e) {} }
function _adminSession() { try { return localStorage.getItem('qingyu.admin.ok') === '1'; } catch (e) { return false; } }
function _setAdminSession(v) { try { localStorage.setItem('qingyu.admin.ok', v ? '1' : '0'); } catch (e) {} }
/* 云端会话 token */
function _sessionToken() { try { return localStorage.getItem('qingyu.token') || ''; } catch (e) { return ''; } }
function _setSessionToken(t) {
  try { if (t) localStorage.setItem('qingyu.token', t); else localStorage.removeItem('qingyu.token'); } catch (e) {}
}
/* 云模式判定：配置为 api，或 boot 已成功拉到云端文章 */
function _cloudOn() {
  var cfg = getConfig();
  return cfg.mode === 'api' || (cfg.mode === 'auto' && _cloudDetected);
}

var _cloudDetected = false;   // boot 时置位：/api/posts 拉取成功 = 云端在线

function needAdminSetup() {
  return !_cfgPwd() && !_localPwd();
}
function adminOk() {
  // 云端：有会话 token 即视为已登录（有效性由服务端鉴权兜底）
  if (_cloudOn()) return !!_sessionToken();
  return _adminSession();
}
function setupAdmin(pwd) {
  pwd = String(pwd || '');
  if (pwd.length < 4) return false;
  _setLocalPwd(pwd);
  _setAdminSession(true);
  return true;
}
function tryAdmin(pwd) {
  var target = _cfgPwd() || _localPwd();
  if (!target) return false;
  if (String(pwd || '') === target) { _setAdminSession(true); return true; }
  return false;
}
/** 云端登录：POST /api/admin/login，成功存 token；返回 { ok, message } */
async function cloudLogin(pwd) {
  try {
    var data = await apiFetch('api/admin/login', { method: 'POST', body: JSON.stringify({ password: String(pwd || '') }) });
    if (!data || !data.token) return { ok: false, message: (data && data.error) || '登录失败' };
    _setSessionToken(data.token);
    _setAdminSession(true);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: '登录失败（HTTP ' + (e && e.message ? e.message.replace('HTTP ', '') : '') + '）' };
  }
}
/** 云端登出：调用 /api/admin/logout 并清除本地 token */
async function cloudLogout() {
  var t = _sessionToken();
  _setSessionToken('');
  _setAdminSession(false);
  if (_cloudOn() && t) {
    try { await apiFetch('api/admin/logout', { method: 'POST', body: '{}' }); } catch (e) {}
  }
}
function adminLogout() {
  if (_cloudOn()) { cloudLogout(); }
  else { _setAdminSession(false); }
}

/* ---------- 导出 ---------- */
function buildPostsJs() {
  var drafts = [];
  try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) { drafts = []; }
  var all = getStaticPosts().slice();
  drafts.forEach(function (d) {
    if (!d || !d.id) return;
    var idx = all.findIndex(function (p) { return p.id === d.id; });
    var item = {
      id: d.id,
      title: d.title || '',
      date: d.date || new Date().toISOString().slice(0, 10),
      tags: normalizeTags(d),
      excerpt: d.excerpt || '',
      pinned: !!d.pinned,
      content: d.content || ''
    };
    if (idx >= 0) all[idx] = item; else all.push(item);
  });
  all.sort(sortPosts);
  var out = '/* ============================================================\n * 轻语博客 · 文章数据（由「导出 posts.js」生成）\n * 下载本文件后覆盖博客目录下的 posts.js 即可发布。\n * ============================================================ */\nwindow.BLOG_POSTS = ' + JSON.stringify(all, null, 2) + ';\n';
  return out;
}

/** 读取草稿：key='__new' 返回最近一次「保存/发布文章」的条目（总是 push 到最后），
 *  其余返回指定 id 的条目；找不到返回 null */
function loadDraftFromStore(key) {
  try {
    var arr = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]');
    if (!Array.isArray(arr)) return null;
    if (key === '__new') return arr.length ? arr[arr.length - 1] : null;
    return arr.find(function (d) { return d && d.id === key; }) || null;
  } catch (e) { return null; }
}

function saveDraftToStore(key, val) {
  try {
    var keyS = String(key || '');
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) { existing = []; }
    if (keyS === '__new') {
      existing = existing.filter(function (d) { return d && d.id !== (val && val.id); });
      if (val && val.id) existing.push(val);
    } else {
      var idx = existing.findIndex(function (d) { return d && d.id === keyS; });
      if (idx >= 0) existing[idx] = Object.assign({}, existing[idx], val || {});
      else if (val) existing.push(Object.assign({ id: keyS }, val));
    }
    localStorage.setItem('qingyu.drafts', JSON.stringify(existing));
  } catch (e) {}
}

function buildFeedXmlClient(posts, maxItems) {
  var cfg = getConfig();
  var base = cfg.siteUrl || (typeof location !== 'undefined' ? location.origin : '');
  base = String(base || '').replace(/\/+$/, '');
  var list = (posts || []).slice().sort(sortPosts).filter(function (p) { return !p.protected; }).slice(0, maxItems || 20);
  var items = list.map(function (p) {
    var link = base + postUrl(p.id);
    var content = esc(p.content || '').replace(/\]\]>/g, ']]&gt;');
    return '<item>\n      <title>' + esc(p.title) + '</title>\n      <link>' + esc(link) + '</link>\n      <guid isPermaLink="false">' + esc(p.id) + '</guid>\n      <pubDate>' + rfc822(p.date) + '</pubDate>\n      <description><![CDATA[' + content + ']]></description>\n    </item>';
  }).join('\n    ');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>' + esc(cfg.title || '轻语博客') + '</title>\n    <link>' + esc(base || 'https://blog.example') + '</link>\n    <description>' + esc(cfg.description || '一个零依赖的轻量博客') + '</description>\n    <language>zh-CN</language>\n    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n    ' + items + '\n  </channel>\n</rss>\n';
}
function rfc822(dateStr) {
  try {
    var s = String(dateStr || '').trim();
    // 兼容 "YYYY-MM-DD" 与 "YYYY-MM-DD HH:mm"（按本地时区解析为 UTC 输出）
    var iso = s.slice(0, 10) + 'T' + (s.slice(11, 16) || '00:00') + ':00';
    var d = new Date(iso);
    if (isNaN(d.getTime())) d = new Date(s);
    return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
  } catch (e) { return new Date().toUTCString(); }
}

/* ---------- 保存文件 ---------- */
async function saveFileFriendly(name, content, doneText, failText) {
  var b = new Blob([content], { type: 'application/octet-stream' });
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      var handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: '', accept: {} }] });
      var writable = await handle.createWritable();
      await writable.write(b);
      await writable.close();
      return true;
    } catch (e) { return false; }
  }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return false;
}

/* ============================================================
 * 页面渲染
 * ============================================================ */
function app() { return document.querySelector('#app'); }

function renderNav(active) {
  var cfg = getConfig();
  var navs = cfg.nav.length ? cfg.nav : [
    { text: '首页', url: '/', path: '/' },
    { text: '标签', url: '/tags', path: '/tags' },
    { text: '归档', url: '/archive', path: '/archive' },
    { text: '关于', url: '/about', path: '/about' }
  ];
  var links = navs.map(function (n) {
    var raw = n.url || '/';
    var pathKey = n.path || (/^#\//.test(raw) ? raw.slice(1) : (/^\//.test(raw) ? raw : null));
    var url = (/^#\//.test(raw)) ? href(raw.slice(1)) : (/^\//.test(raw) ? href(raw) : raw);
    var cls = (pathKey && pathKey === active) ? 'nav-link active' : 'nav-link';
    var isChildPath = n.children && n.children.length;
    if (isChildPath) {
      var kids = n.children.map(function (c) {
        var cRaw = c.url || '/';
        var cUrl = (/^#\//.test(cRaw)) ? href(cRaw.slice(1)) : (/^\//.test(cRaw) ? href(cRaw) : cRaw);
        var tgt = cUrl && /^https?:|^\/\//.test(cUrl) ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + esc(cUrl) + '" class="nav-link"' + tgt + '>' + esc(c.text || '') + '</a>';
      }).join('');
      return '<div class="nav-item has-sub"><a href="' + esc(url) + '" class="' + cls + '">' + esc(n.text || '') + '</a><div class="sub-menu">' + kids + '</div></div>';
    }
    var ext = url && /^https?:|^\/\//.test(url) ? ' target="_blank" rel="noopener"' : '';
    return '<div class="nav-item"><a href="' + esc(url) + '" class="' + cls + '"' + ext + '>' + esc(n.text || '') + '</a></div>';
  }).join('');
  var sup = '<button class="icon-btn" id="themeToggle" aria-label="切换深色模式" title="切换深色/浅色模式">' + themeIcon() + '</button>';
  var searchBtn = '<button class="icon-btn search-toggle" id="searchToggle" aria-label="搜索" title="搜索文章">' + searchIconSvg() + '</button>';
  var searchForm = '<form class="topbar-search" id="topbarSearch" role="search" onsubmit="return false">'
    + '<span class="ts-icon">' + searchIconSvg() + '</span>'
    + '<input id="globalSearchInput" type="search" placeholder="搜索文章…" autocomplete="off" aria-label="搜索文章">'
    + '<button type="button" class="ts-close" id="searchClose" aria-label="关闭搜索">✕</button>'
    + '</form>';
  return '<header class="topbar' + (active && _searchOpen ? ' searching' : '') + '">'
    + '<div class="container topbar-inner">'
    + '<div class="topbar-left"><a class="brand" href="' + esc(href('/')) + '">轻语博客</a></div>'
    + '<nav class="main-nav">' + links + '</nav>'
    + '<div class="topbar-actions">' + searchBtn + sup + '</div>'
    + searchForm
    + '</div>'
    + '<div class="search-panel" id="searchPanel"></div>'
    + '</header>';
}

function renderFooter() {
  var cfg = getConfig();
  var f = cfg.footer || {};
  var year = new Date().getFullYear();
  var startYear = Number(f.startYear) || 2019;
  var copyRange = (startYear && startYear < year) ? (startYear + '-' + year) : ('' + year);
  var site = f.copyrightName || cfg.title || '轻语博客';
  // 页脚导航行（含写作后台；RSS 仅在电脑端显示，移动端隐藏）
  var nav = [
    { text: '首页', url: '/' },
    { text: '标签', url: '/tags' },
    { text: '归档', url: '/archive' },
    { text: '关于', url: '/about' },
    { text: '写作后台', url: '/admin' }
  ];
  function l(x) {
    var u = x.url || '/';
    if (/^#\//.test(u)) u = href(u.slice(1));
    else if (/^\//.test(u)) u = href(u);
    return '<a href="' + esc(u) + '">' + esc(x.text || '') + '</a>';
  }
  var navHtml = nav.map(l).join('<span class="footer-dot">·</span>');
  // RSS：file:// 直开时在同目录，其余用根路径（避免在 /posts/<别名>/ 下相对解析成 404）
  var rssHref = useHashMode() ? 'feed.xml' : '/feed.xml';
  navHtml += '<span class="footer-dot footer-rss">·</span><a class="footer-rss" href="' + esc(rssHref) + '">RSS</a>';
  // 电脑端专属区块：自定义文字 / 站点声明 / 联系方式 / 友情链接
  var extra = '';
  if (f.text) extra += '<p class="footer-text">' + esc(f.text) + '</p>';
  if (f.decl) extra += '<p class="footer-decl">站点声明：' + esc(f.decl) + '</p>';
  if (f.email) extra += '<p class="footer-contact">相关侵权、举报、投诉及建议等，请发邮件至 E-mail：<a href="mailto:' + esc(f.email) + '">' + esc(f.email) + '</a></p>';
  var friends = (f.links || []).map(l).join('');
  if (friends) extra += '<p class="footer-friends">友情链接：' + friends + '</p>';
  // 版权行（移动端仅显示此行，备案号在移动端隐藏）
  var copy = 'Copyright ©' + copyRange + ' ' + esc(site);
  var icp = f.icp ? ' <span class="footer-icp">' + esc(f.icp) + '</span>' : '';
  return '<footer><div class="container footer-inner">'
    + '<div class="footer-nav">' + navHtml + '</div>'
    + (extra ? '<div class="footer-extra">' + extra + '</div>' : '')
    + '<div class="footer-copy">' + copy + icp + '</div>'
    + '</div>'
    // 返回顶部：固定悬浮右下角，所有页面共用（点击仅滚回当前页顶部）
    + '<button class="btn-top" id="backTop" aria-label="返回顶部" title="返回顶部">' + svgIcon('top', 18) + '</button>'
    + '</footer>';
}

function homePageSize() {
  var n = Number(getConfig().pageSize);
  return (n && n > 0) ? n : 0;   // 0 = 不分页，全部显示
}

/* 计算当前分页并渲染「卡片列表 + 翻页器」 */
function homeListHtml(filtered, ads, adsEnabled, page, pageSize, emptyMsg) {
  var total = filtered.length;
  var totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  var pageItems = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;
  var list = renderCardList(pageItems, ads, adsEnabled);
  if (!pageItems.length) list = '<div class="empty"><div class="big">' + svgIcon('doc', 36) + '</div><p>' + (emptyMsg || '这里还没有文章。') + '</p></div>';
  return { html: '<div id="listContainer">' + list + '</div>' + pagerHtml(page, totalPages), page: page, totalPages: totalPages };
}

/* 翻页器：上一页 / 下一页，保留当前标签与页码（query 形式，链接可前进/后退）。
 * 仅在第 1 页时显示「下一页」，末页时显示「上一页」，单页则不显示翻页器。 */
function pagerHtml(page, totalPages) {
  if (totalPages <= 1) return '';
  var tag = (currentRoute().query.tag) || '';
  var prevHref = href('/', tag ? { tag: tag, page: page - 1 } : { page: page - 1 });
  var nextHref = href('/', tag ? { tag: tag, page: page + 1 } : { page: page + 1 });
  var parts = [];
  if (page > 1) parts.push('<a class="pager-btn" href="' + esc(prevHref) + '">上一页</a>');
  parts.push('<span class="pager-info">第 ' + page + ' / ' + totalPages + ' 页</span>');
  if (page < totalPages) parts.push('<a class="pager-btn" href="' + esc(nextHref) + '">下一页</a>');
  return '<div class="pager">' + parts.join('') + '</div>';
}

function renderHome() {
  var cfg = getConfig();
  var posts = sortPagePosts(getStaticPosts());
  var cur = currentRoute();
  var tag = cur.query.tag || '';
  var ads = cfg.ads || {};
  var adsEnabled = !!ads.enabled;
  var pageSize = homePageSize();
  var page = parseInt(cur.query.page, 10) || 1;
  var html = renderNav(cur.path);
  html += '<main class="container page-fade"><div class="list-head"><h2 class="page-title">最新发布</h2></div>';
  if (tag) {
    html += '<div class="current-tag"><span class="tag-chip">' + esc(tag) + ' <a class="tag-clear" href="' + esc(href('/')) + '">✕</a></span></div>';
  }
  html += renderHomeTagRow(posts, tag);
  if (adsEnabled && ads.belowSearch) html += '<div class="ad-slot"><span class="ad-label">广告</span>' + ads.belowSearch + '</div>';
  var filtered = tag ? posts.filter(function (p) { return (p.tags || []).indexOf(tag) >= 0; }) : posts;
  var body = homeListHtml(filtered, ads, adsEnabled, page, pageSize);
  html += '<div id="homeBody">' + body.html + '</div>';
  html += '</main>';
  html += renderFooter();
  return html;
}

function searchIconSvg() {
  return '<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><circle class="search-dot" cx="15.2" cy="15.2" r="1.6"></circle></svg>';
}

/* 首页标签分类行：位于「最新发布」标题下方、卡片列表上方 */
function renderHomeTagRow(posts, activeTag) {
  var counts = {};
  var order = [];
  posts.forEach(function (p) {
    normalizeTags(p).forEach(function (t) {
      if (!counts[t]) { counts[t] = 0; order.push(t); }
      counts[t]++;
    });
  });
  if (!order.length) return '';
  var html = '<div class="home-tags">';
  html += '<span class="home-tags-label">分类</span>';
  order.forEach(function (t) {
    var on = t === activeTag;
    html += '<a class="home-tag' + (on ? ' active' : '') + '" href="' + esc(href('/', { tag: t })) + '" data-home-tag>' + esc(t) + '<span class="home-tag-count">' + counts[t] + '</span></a>';
  });
  html += '</div>';
  return html;
}

/* 渲染卡片（可含广告位），供首页初始及搜索实时过滤复用 */
function renderCardList(plist, ads, adsEnabled) {
  var every = Number(ads.betweenEvery) || 3;
  var out = '';
  plist.forEach(function (p, idx) {
    if (adsEnabled && ads.between && idx > 0 && idx % every === 0) out += '<div class="ad-slot"><span class="ad-label">广告</span>' + ads.between + '</div>';
    out += renderCard(p);
  });
  return out;
}

function renderCard(p) {
  var badge = p.pinned ? '<span class="pin">' + svgIcon('pin', 13) + ' 置顶</span>' : '';
  var tags = normalizeTags(p).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
  var excerpt = p.excerpt || stripMd(p.content || '').slice(0, 100);
  return '<a class="post-card" href="' + esc(href(postUrl(p.id))) + '"><div class="meta"><span class="date">' + esc(p.date || '') + '</span>' + badge + '</div><h2>' + esc(p.title || '') + '</h2>' + (tags ? '<div class="mini-tags">' + tags + '</div>' : '') + '<div class="excerpt">' + esc(excerpt) + '</div></a>';
}

async function renderPost(id) {
  var cur = currentRoute();
  var html = renderNav(cur.path);
  var posts = getStaticPosts();
  var post = posts.find(function (p) { return p.id === id; });
  html += '<main class="container page-fade"><div class="post-body">';
  if (!post) {
    html += '<div class="empty"><div class="big">' + svgIcon('question', 36) + '</div><p>内容不存在</p><p><a href="' + esc(href('/')) + '">返回首页</a></p></div></div></main>';
    html += renderFooter();
    app().innerHTML = html;
    return;
  }
  if (post.protected && !_unlocked[post.id]) {
    html += '<div class="lock-card"><div class="big">' + svgIcon('lock', 28) + '</div><h3>这是一篇加密文章</h3><p>输入访问密码以阅读</p><div class="lock-form"><input type="password" id="lockInput" placeholder="访问密码"><button class="btn btn-primary" id="lockBtn">解锁</button></div><div class="lock-msg" id="lockMsg"></div></div>';
    html += '</div></main>' + renderFooter();
    app().innerHTML = html;
    var btn = document.querySelector('#lockBtn');
    if (btn) btn.addEventListener('click', async function () {
      var input = document.querySelector('#lockInput');
      var msg = document.querySelector('#lockMsg');
      if (!input) return;
      var ok = await tryUnlock(post.id, input.value);
      if (ok) { route(); }
      else if (msg) msg.textContent = '密码错误，请重试';
    });
    return;
  }
  if (_cloudOn() && !post.protected && !post.content && !post._fullLoaded) {
    html += '<div class="empty"><div class="big">' + svgIcon('spinner', 26) + '</div><p>加载中…</p></div>';
    html += '</div></main>' + renderFooter();
    app().innerHTML = html;
    // 超时保护：10 秒拿不到正文就放弃加载态，避免“一直加载中”
    var settled = false;
    function finish(data) {
      if (settled) return;
      settled = true;
      var full = (data && data.post) || null;
      if (full) {
        if (full.content !== undefined) post.content = full.content;
        if (full.enc !== undefined) post.enc = full.enc;
      }
      post._fullLoaded = true;
      route();
    }
    apiFetch('api/posts/' + encodeURIComponent(post.id))
      .then(function (data) { finish(data); })
      .catch(function () { finish(null); });
    setTimeout(function () { finish(null); }, 10000);
    return;
  }
  var content = post.protected ? _unlocked[post.id] : post.content;
  var bodyHtml = renderMarkdown(content || '');
  var tocRes = buildToc(bodyHtml);
  var toc = tocRes.html;
  var tocHeadings = tocRes.headings;
  var tags = normalizeTags(post).map(function (t) { return '<a href="' + esc(href('/', { tag: t })) + '" data-tag-link>' + esc(t) + '</a>'; }).join('');
  var minutes = Math.max(1, Math.ceil((stripMd(content || '').length / 400)));
  html += '<div class="post-header"><h1>' + esc(post.title || '') + '</h1><div class="meta"><span class="meta-date">' + esc(post.date || '') + '</span><span class="meta-dot">·</span><span>' + minutes + ' 分钟阅读</span><span class="meta-dot">·</span><span class="meta-views">' + svgIcon('eye', 14) + ' <span id="viewCount">0</span> 次浏览</span>' + (post.pinned ? '<span class="pin">' + svgIcon('pin', 13) + ' 置顶</span>' : '') + '</div></div>';
  html += toc;
  html += '<article class="article">' + bodyHtml + '</article>';
  // 点赞：正文尾部，水平居中
  html += '<div class="like-bar"><button class="btn like-btn" id="likeBtn">' + svgIcon('heart', 15) + ' <span id="likeCount">0</span></button></div>';
  // 底部：左标签、右复制链接(+编辑)
  var afEdit = adminOk()
    ? '<a class="btn" href="' + esc(href(postUrl(post.id) + 'edit')) + '">' + svgIcon('pen', 13) + ' 编辑</a>'
    : '';
  html += '<div class="article-footer"><div class="af-tags">' + (tags || '') + '</div><div class="af-actions">' + afEdit + '<button class="btn" id="btnCopyLink">🔗 复制链接</button></div></div>';

  // prev / next
  var sorted = posts.slice().sort(sortPosts);
  var idx = sorted.findIndex(function (p) { return p.id === id; });
  var prev = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  var next = idx > 0 ? sorted[idx - 1] : null;
  html += '<div class="pn-nav">';
  html += prev ? '<a class="pn-item" href="' + esc(href(postUrl(prev.id))) + '"><span class="pn-dir">← 上一篇</span><span class="pn-title">' + esc(prev.title || '') + '</span></a>' : '<span class="pn-item pn-empty"></span>';
  html += next ? '<a class="pn-item" href="' + esc(href(postUrl(next.id))) + '"><span class="pn-dir">下一篇 →</span><span class="pn-title">' + esc(next.title || '') + '</span></a>' : '<span class="pn-item pn-empty"></span>';
  html += '</div>';

  // comments
  html += '<div class="comments"><h3>评论 <span class="comment-count" id="commentCount">' + '0' + '</span></h3>';
  html += '<p class="comment-hint">在此输入昵称与内容发表评论</p>';
  html += '<div class="comment-form"><input type="text" id="commentAuthor" placeholder="昵称"><textarea id="commentContent" rows="2" placeholder="说点什么…"></textarea><div class="comment-submit-row"><button class="btn btn-primary" id="commentSubmit">发表评论</button><span class="c-status" id="commentStatus"></span></div></div>';
  html += '<ul class="comment-list" id="commentList"></ul></div>';

  var adCfg = getConfig().ads || {};
  if (adCfg.enabled && adCfg.content) html += '<div class="ad-slot"><span class="ad-label">广告</span>' + adCfg.content + '</div>';

  html += '</div></main>' + renderFooter();
  app().innerHTML = html;
  stampHeadingNumbers(tocHeadings);

  // stats load
  loadStats(post.id).then(function (s) {
    var v = document.querySelector('#viewCount'); if (v) v.textContent = String(s.views);
    var l = document.querySelector('#likeCount'); if (l) l.textContent = String(s.likes);
  });
  incView(post.id).then(function (s) {
    var v = document.querySelector('#viewCount'); if (v && s) v.textContent = String(s.views);
  });
  var likeBtn = document.querySelector('#likeBtn');
  if (likeBtn) {
    if (wasLiked(post.id)) { likeBtn.classList.add('liked'); likeBtn.disabled = true; }
    likeBtn.addEventListener('click', function () {
      likePost(post.id).then(function (s) {
        var l = document.querySelector('#likeCount');
        if (s && l) l.textContent = String(s.likes);
        likeBtn.classList.add('liked');
        likeBtn.disabled = true;
      });
    });
  }

  var copyBtn = document.querySelector('#btnCopyLink');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var url = location.origin + appRoot() + postUrl(post.id);
    navigator.clipboard && navigator.clipboard.writeText(url) && (copyBtn.textContent = '✓ 已复制');
  });

  // load comments
  loadComments(post.id).then(function (list) {
    var ul = document.querySelector('#commentList');
    var cnt = document.querySelector('#commentCount');
    if (cnt) cnt.textContent = String(list.length);
    if (!ul) return;
    var canDel = !_cloudOn() || adminOk();
    if (!list.length) { ul.innerHTML = '<li class="comment-empty">暂无评论</li>'; return; }
    ul.innerHTML = list.map(function (c) {
      return '<li class="comment"><div class="comment-head"><span class="comment-author">' + esc(c.author) + '</span><span class="comment-date">' + esc(c.date || '') + '</span>' + (canDel ? '<button class="comment-del" data-cid="' + esc(c.id) + '">删除</button>' : '') + '</div><div class="comment-content">' + esc(c.content) + '</div></li>';
    }).join('');
    ul.querySelectorAll('.comment-del').forEach(function (b) {
      b.addEventListener('click', function () { deleteComment(post.id, b.getAttribute('data-cid')).then(renderCommentsList); });
    });
  });

  var submit = document.querySelector('#commentSubmit');
  if (submit) submit.addEventListener('click', async function () {
    var a = document.querySelector('#commentAuthor');
    var c = document.querySelector('#commentContent');
    var st = document.querySelector('#commentStatus');
    if (!a || !c) return;
    if (!a.value.trim() || !c.value.trim()) { if (st) st.textContent = '请填写昵称和内容'; return; }
    await saveComment(post.id, a.value, c.value);
    if (st) st.textContent = '✓ 已发表';
    if (c) c.value = '';
    loadComments(post.id).then(renderCommentsList);
  });

  function renderCommentsList(list) {
    var ul = document.querySelector('#commentList');
    var cnt = document.querySelector('#commentCount');
    if (cnt) cnt.textContent = String(list.length);
    if (!ul) return;
    var canDel = !_cloudOn() || adminOk();
    if (!list.length) { ul.innerHTML = '<li class="comment-empty">暂无评论</li>'; return; }
    ul.innerHTML = list.map(function (c) {
      return '<li class="comment"><div class="comment-head"><span class="comment-author">' + esc(c.author) + '</span><span class="comment-date">' + esc(c.date || '') + '</span>' + (canDel ? '<button class="comment-del" data-cid="' + esc(c.id) + '">删除</button>' : '') + '</div><div class="comment-content">' + esc(c.content) + '</div></li>';
    }).join('');
    ul.querySelectorAll('.comment-del').forEach(function (b) {
      b.addEventListener('click', function () { deleteComment(post.id, b.getAttribute('data-cid')).then(renderCommentsList); });
    });
  }
}

function renderArchive() {
  var posts = sortPagePosts(getStaticPosts());
  var byYear = {};
  posts.forEach(function (p) {
    var yr = (p.date || '').slice(0, 4) || '未知';
    var mo = Number((p.date || '').slice(5, 7) || 0);
    if (!byYear[yr]) byYear[yr] = {};
    if (!byYear[yr][mo]) byYear[yr][mo] = [];
    byYear[yr][mo].push(p);
  });
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade"><h2 class="page-title">归档</h2>';
  Object.keys(byYear).sort().reverse().forEach(function (yr) {
    html += '<div class="archive-year"><h2>' + esc(yr) + ' 年</h2>';
    Object.keys(byYear[yr]).sort(function (a, b) { return Number(b) - Number(a); }).forEach(function (mo) {
      var list = byYear[yr][mo];
      html += '<div class="archive-month"><h3>' + esc(mo) + ' 月 <span class="count">' + list.length + ' 篇</span></h3><ul>';
      list.forEach(function (p) {
        html += '<li><a href="' + esc(href(postUrl(p.id))) + '">' + esc(p.title || '') + '</a></li>';
      });
      html += '</ul></div>';
    });
    html += '</div>';
  });
  html += '</main>' + renderFooter();
  return html;
}

function renderAbout() {
  var posts = getStaticPosts();
  var tags = {};
  var totalWords = 0;
  var latest = '';
  posts.forEach(function (p) {
    if (p.protected) return;
    normalizeTags(p).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    totalWords += stripMd(p.content || '').length;
    if (!latest || p.date > latest) latest = p.date;
  });
  var cfg = getConfig();
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade"><h2 class="page-title">关于</h2><div class="about-card card"><h3>轻语博客</h3><p>一个零依赖、双击即开的轻量博客。</p>';
  html += '<div class="stat-grid"><div class="stat"><b>' + posts.length + '</b><span>篇内容</span></div><div class="stat"><b>' + Object.keys(tags).length + '</b><span>个标签</span></div><div class="stat"><b>' + totalWords + '</b><span>总字数</span></div><div class="stat"><b>' + esc(latest || '-') + '</b><span>最新更新</span></div></div>';
  html += '<h3>版本</h3><p>v' + esc(BLOG_VERSION) + '</p><h3>数据模式</h3><p>' + (_cloudOn() ? '云端模式' : '静态模式') + '</p><h3>首次使用</h3><p>双击 index.html 即可开始。</p>';
  html += '</div></main>' + renderFooter();
  return html;
}

function renderTags() {
  var posts = getStaticPosts();
  var counts = {};
  posts.forEach(function (p) {
    normalizeTags(p).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
  });
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade"><h2 class="page-title">🏷 标签</h2><div class="tag-cloud">';
  Object.keys(counts).sort().forEach(function (t) {
    html += '<a class="cloud-chip" href="' + esc(href('/', { tag: t })) + '">' + esc(t) + '<span class="cloud-count">' + counts[t] + '</span></a>';
  });
  html += '</div></main>' + renderFooter();
  return html;
}

/* ---------- 管理后台辅助函数 ---------- */
function adminRoute() {
  var path = currentRoute().path;
  if (path === '/write' || path === '/admin' || path === '/admin/write') return 'write';
  if (path === '/admin/posts') return 'posts';
  if (/^\/admin\/posts\/[^\/]+\/edit$/.test(path)) return 'edit';
  return 'write';
}

function getEditIdFromRoute() {
  var path = currentRoute().path;
  var match = path.match(/^\/admin\/posts\/([^\/]+)\/edit$/);
  return match ? match[1] : null;
}

function renderAdminSidebar(active) {
  return '<aside class="admin-sidebar">'
    + '<div class="admin-sidebar-brand">📋 管理 <span style="font-size:11px;font-weight:400;color:var(--muted);">v2.2.0</span></div>'
    + '<nav class="admin-sidebar-nav">'
    + '<a href="' + esc(href('/admin/write')) + '" class="admin-nav-item' + (active === 'write' ? ' active' : '') + '">✏️ 写作</a>'
    + '<a href="' + esc(href('/admin/posts')) + '" class="admin-nav-item' + (active === 'posts' || active === 'edit' ? ' active' : '') + '">📄 文章</a>'
    + '</nav>'
    + '<div class="admin-sidebar-footer">'
    + '<button class="btn btn-ghost btn-logout" id="btnLogoutSidebar">' + svgIcon('logout', 14) + ' 退出</button>'
    + '</div>'
    + '</aside>';
}

function renderPostList() {
  var posts = getStaticPosts();
  if (!posts || !posts.length) {
    return '<div class="admin-posts-header"><h2>📄 所有文章</h2></div>'
      + '<p class="empty-state">还没有文章，去 <a href="' + esc(href('/admin/write')) + '">写一篇</a> 吧</p>';
  }
  var html = '<div class="admin-posts-header"><h2>📄 所有文章</h2><span class="count">共 ' + posts.length + ' 篇</span></div>';
  html += '<table class="admin-posts-table"><thead><tr><th>标题</th><th>日期</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  posts.forEach(function (p) {
    var status = p.pinned ? '📌 置顶' : (p.protected ? '🔒 加密' : '已发布');
    var title = p.title || '未命名';
    html += '<tr>'
      + '<td><a href="' + esc(href('/admin/posts/' + encodeURIComponent(p.id) + '/edit')) + '">' + esc(title) + '</a></td>'
      + '<td>' + esc(p.date || '') + '</td>'
      + '<td><span class="status-badge' + (p.pinned ? ' pinned' : '') + (p.protected ? ' protected' : '') + '">' + status + '</span></td>'
      + '<td><div class="post-actions">'
      + '<a href="' + esc(href('/admin/posts/' + encodeURIComponent(p.id) + '/edit')) + '" class="btn btn-sm">✏️ 编辑</a>'
      + '<button class="btn btn-sm btn-danger" data-post-id="' + esc(p.id) + '" data-post-title="' + esc(title) + '">🗑️ 删除</button>'
      + '</div></td>'
      + '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function renderEditorBody() {
  var _editId = currentEditId();
  var _editPost = _editId ? getStaticPosts().find(function (p) { return p.id === _editId; }) : null;
  // 如果路由是编辑模式，使用路由中的 ID 覆盖
  if (adminRoute() === 'edit') {
    var routeId = getEditIdFromRoute();
    if (routeId) {
      _editId = routeId;
      _editPost = getStaticPosts().find(function (p) { return p.id === _editId; });
    }
  }
  var body = '';
  body += '<div class="write-head">'
    + '<h2 class="page-title wh-title">' + svgIcon('pen', 20) + ' 写作台</h2>'
    + (_cloudOn()
        ? '<span class="mode-chip cloud">' + svgIcon('cloud', 12) + ' 云端模式</span>'
        : '<span class="mode-chip local">' + svgIcon('file', 12) + ' 本地模式</span>')
    + (_editId ? '<span class="mode-chip editing" id="writeTitleHint">' + (_editPost ? esc('编辑：' + (_editPost.title || '')) : '新文章') + '</span>' : '')
    + '</div>';
  body += '<div class="card editor-meta"><div class="editor-grid">'
    + '<div class="field"><label>标题</label><input type="text" id="titleInput" placeholder="文章标题"></div>'
    + '<div class="field"><label>日期（可精确到时间）</label><div style="display:flex;gap:8px;align-items:center;"><input type="datetime-local" id="dateInput" style="flex:1;"><button class="btn btn-sm btn-ghost" id="btnToday" title="设为当前时间" style="flex-shrink:0;padding:5px 10px;font-size:12px;">今天</button></div></div>'
    + '<div class="field"><label>摘要（可选，不填则自动截取）</label><input type="text" id="excerptInput" placeholder="显示在列表与 RSS 中的一段话"></div>'
    + '<div class="field"><label>标签（逗号分隔）</label><input type="text" id="tagInput" placeholder="日记, 技术"></div>'
    + '<div class="field check-label"><label><input type="checkbox" id="pinnedInput"> ' + svgIcon('pin', 13) + ' 置顶</label></div>'
    + '<div class="field check-label" style="margin-left:auto"><label><input type="checkbox" id="protectInput"> ' + svgIcon('lock', 13) + ' 加密</label><input type="password" id="protectPwdInput" placeholder="文章访问密码（勾选加密后设置）" style="display:none;width:220px;margin-left:8px"></div>'
    + '</div></div>';
  body += '<div class="editor-wrap">'
    + '<section class="editor-pane"><div class="pane-head">' + svgIcon('pen', 13) + ' 编辑<span class="pane-note">Markdown</span></div><div id="toolbar" class="toolbar">' + toolbarHtml() + '</div><textarea id="mdInput" class="md-input" rows="18" placeholder="用 Markdown 写作…"></textarea></section>'
    + '<section class="editor-pane preview-pane"><div class="pane-head">' + svgIcon('eye', 13) + ' 预览<span class="pane-note">实时渲染</span></div><div class="write-preview article preview-body" id="previewPane"></div></section>'
    + '</div>';
  body += '<div class="editor-actions actions-bar">'
    + (_cloudOn() ? '<button class="btn btn-primary" id="btnCloud">' + svgIcon('cloud', 15) + ' 发布到云端</button>' : '')
    + '<button class="btn btn-primary" id="btnSave">' + svgIcon('save', 15) + ' 保存文章</button>'
    + '<span class="action-sep"></span>'
    + '<button class="btn" id="btnSaveDraft">' + svgIcon('upload', 15) + ' 存草稿</button>'
    + '<button class="btn" id="btnImport">' + svgIcon('file', 15) + ' 导入 .md</button>'
    + '<input type="file" id="mdFileInput" accept=".md,.markdown" hidden>'
    + '<button class="btn" id="btnOpenMdEditor">' + svgIcon('external', 15) + ' 官方编辑器</button>'
    + '<span class="action-sep"></span>'
    + '<button class="btn" id="btnExport">' + svgIcon('download', 15) + ' 导出 posts.js</button>'
    + '<button class="btn" id="btnRss">' + svgIcon('rss', 15) + ' RSS</button>'
    + '<button class="btn" id="btnSitemap">' + svgIcon('sitemap', 15) + ' Sitemap</button>'
    + '<span class="actions-right"><span class="word-count" id="wordCount"></span><span class="save-status" id="saveStatus"></span>'
    + '<button class="btn btn-outline-danger btn-logout" id="btnClearData" title="清除所有本地数据并重置站点">' + svgIcon('trash', 14) + ' 清理数据</button>'
    + '<button class="btn btn-ghost btn-logout" id="btnLogout">' + svgIcon('logout', 15) + ' 退出登录</button></span>'
    + '</div>';
  body += '<p class="keys-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> 存草稿 · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 保存文章</p>';
  body += '<h3 class="draft-hint"><b>一键导出：</b>保存文章 / RSS / Sitemap 会打开系统保存对话框，选中原文件即可原地覆盖发布。</h3>';
  return body;
}

function renderWrite() {
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade write-page">';
  if (!adminOk()) {
    if (_cloudOn()) {
      // 云端模式：密码校验于 Cloudflare D1 后端，此页只做登录（token 已存则直接进入编辑）
      html += '<div class="card gate-card">'
        + '<div class="gate-badge">' + svgIcon('lock', 26) + '</div>'
        + '<h3 class="gate-title">管理员登录</h3>'
        + '<p class="gate-sub">输入管理员密码以继续写作<br>密码校验于 Cloudflare D1 后端，仅比对哈希、不回传</p>'
        + '<div class="gate-form"><input type="password" id="gatePwd" placeholder="管理密码" autocomplete="current-password"><button class="btn btn-primary" id="btnGate">' + svgIcon('logout', 15) + ' 登 录</button></div>'
        + '<div class="gate-msg alert-strip" id="gateMsg"></div>'
        + '<div class="gate-foot"><a href="' + esc(href('/')) + '">← 返回首页</a></div>'
        + '<p class="gate-hint">提示：首次部署请先按 README 用 <code>/api/admin/setup</code> 设置密码。</p>'
        + '</div>';
    } else if (needAdminSetup()) {
      html += '<div class="card gate-card">'
        + '<div class="gate-badge">' + svgIcon('lock', 26) + '</div>'
        + '<h3 class="gate-title">设置管理密码</h3>'
        + '<p class="gate-sub">首次使用请设置一个至少 4 位的管理密码<br>仅保存在本机浏览器，不上传服务器</p>'
        + '<div class="gate-form"><input type="password" id="setupPwd" placeholder="管理密码" autocomplete="new-password"><button class="btn btn-primary" id="btnSetup">设置并进入</button></div>'
        + '<div class="gate-msg alert-strip" id="gateMsg"></div>'
        + '</div>';
    } else {
      html += '<div class="card gate-card">'
        + '<div class="gate-badge">' + svgIcon('lock', 26) + '</div>'
        + '<h3 class="gate-title">管理员验证</h3>'
        + '<p class="gate-sub">请输入管理密码以继续写作<br>验证通过后会保持登录状态，可随时退出</p>'
        + '<div class="gate-form"><input type="password" id="gatePwd" placeholder="管理密码" autocomplete="current-password"><button class="btn btn-primary" id="btnGate">进 入</button></div>'
        + '<div class="gate-msg alert-strip" id="gateMsg"></div>'
        + '<div class="gate-foot"><a href="' + esc(href('/')) + '">← 返回首页</a></div>'
        + '<p class="gate-hint">提示：可在 <code>public/config.js</code> 配置 adminPwd。</p>'
        + '</div>';
    }
    html += '</main>' + renderFooter();
    app().innerHTML = html;
    var btnSetup = document.querySelector('#btnSetup');
    if (btnSetup) btnSetup.addEventListener('click', function () {
      var inp = document.querySelector('#setupPwd');
      var msg = document.querySelector('#gateMsg');
      if (!inp) return;
      if (setupAdmin(inp.value)) { route(); }
      else if (msg) msg.textContent = '密码太短，至少 4 位';
    });
    var btnGate = document.querySelector('#btnGate');
    if (btnGate) btnGate.addEventListener('click', function () {
      var inp = document.querySelector('#gatePwd');
      var msg = document.querySelector('#gateMsg');
      if (!inp || !inp.value) { if (msg) msg.textContent = '请输入密码'; return; }
      if (_cloudOn()) {
        // 加载态：防重复提交，spinner 反馈
        var orig = btnGate.innerHTML;
        btnGate.disabled = true;
        btnGate.innerHTML = svgIcon('spinner', 14) + ' 登录中…';
        cloudLogin(inp.value).then(function (r) {
          btnGate.disabled = false;
          btnGate.innerHTML = orig;
          if (r.ok) { route(); }
          else {
            if (msg) msg.textContent = r.message || '密码错误';
            try { inp.focus(); inp.select(); } catch (e2) {}
          }
        });
      } else if (tryAdmin(inp.value)) { route(); }
      else if (msg) msg.textContent = '密码错误';
    });
    // 回车即提交 + 自动聚焦密码框
    [['#setupPwd', '#btnSetup'], ['#gatePwd', '#btnGate']].forEach(function (pair) {
      var inp = document.querySelector(pair[0]);
      var btn = document.querySelector(pair[1]);
      if (inp && btn) {
        inp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); btn.click(); }
        });
        try { inp.focus(); } catch (e) {}
      }
    });
    return;
  }
  var _editId = currentEditId();
  var _editPost = _editId ? getStaticPosts().find(function (p) { return p.id === _editId; }) : null;
  // 顶栏：页面标题 + 模式徽章 + 编辑状态，层次一目了然
  html += '<div class="write-head">'
    + '<h2 class="page-title wh-title">' + svgIcon('pen', 20) + ' 写作台</h2>'
    + (_cloudOn()
        ? '<span class="mode-chip cloud">' + svgIcon('cloud', 12) + ' 云端模式</span>'
        : '<span class="mode-chip local">' + svgIcon('file', 12) + ' 本地模式</span>')
    + (_editId ? '<span class="mode-chip editing" id="writeTitleHint">' + (_editPost ? esc('编辑：' + (_editPost.title || '')) : '新文章') + '</span>' : '')
    + '</div>';
  html += '<div class="card editor-meta"><div class="editor-grid">'
    + '<div class="field"><label>标题</label><input type="text" id="titleInput" placeholder="文章标题"></div>'
    + '<div class="field"><label>日期（可精确到时间）</label><div style="display:flex;gap:8px;align-items:center;"><input type="datetime-local" id="dateInput" style="flex:1;"><button class="btn btn-sm btn-ghost" id="btnToday" title="设为当前时间" style="flex-shrink:0;padding:5px 10px;font-size:12px;">今天</button></div></div>'
    + '<div class="field"><label>摘要（可选，不填则自动截取）</label><input type="text" id="excerptInput" placeholder="显示在列表与 RSS 中的一段话"></div>'
    + '<div class="field"><label>标签（逗号分隔）</label><input type="text" id="tagInput" placeholder="日记, 技术"></div>'
    + '<div class="field check-label"><label><input type="checkbox" id="pinnedInput"> ' + svgIcon('pin', 13) + ' 置顶</label></div>'
    + '<div class="field check-label" style="margin-left:auto"><label><input type="checkbox" id="protectInput"> ' + svgIcon('lock', 13) + ' 加密</label><input type="password" id="protectPwdInput" placeholder="文章访问密码（勾选加密后设置）" style="display:none;width:220px;margin-left:8px"></div>'
    + '</div></div>';
  html += '<div class="editor-wrap">'
    + '<section class="editor-pane"><div class="pane-head">' + svgIcon('pen', 13) + ' 编辑<span class="pane-note">Markdown</span></div><div id="toolbar" class="toolbar">' + toolbarHtml() + '</div><textarea id="mdInput" class="md-input" rows="18" placeholder="用 Markdown 写作…"></textarea></section>'
    + '<section class="editor-pane preview-pane"><div class="pane-head">' + svgIcon('eye', 13) + ' 预览<span class="pane-note">实时渲染</span></div><div class="write-preview article preview-body" id="previewPane"></div></section>'
    + '</div>';
  html += '<div class="editor-actions actions-bar">'
    + (_cloudOn() ? '<button class="btn btn-primary" id="btnCloud">' + svgIcon('cloud', 15) + ' 发布到云端</button>' : '')
    + '<button class="btn btn-primary" id="btnSave">' + svgIcon('save', 15) + ' 保存文章</button>'
    + '<span class="action-sep"></span>'
    + '<button class="btn" id="btnSaveDraft">' + svgIcon('upload', 15) + ' 存草稿</button>'
    + '<button class="btn" id="btnImport">' + svgIcon('file', 15) + ' 导入 .md</button>'
    + '<input type="file" id="mdFileInput" accept=".md,.markdown" hidden>'
    + '<button class="btn" id="btnOpenMdEditor">' + svgIcon('external', 15) + ' 官方编辑器</button>'
    + '<span class="action-sep"></span>'
    + '<button class="btn" id="btnExport">' + svgIcon('download', 15) + ' 导出 posts.js</button>'
    + '<button class="btn" id="btnRss">' + svgIcon('rss', 15) + ' RSS</button>'
    + '<button class="btn" id="btnSitemap">' + svgIcon('sitemap', 15) + ' Sitemap</button>'
    + '<span class="actions-right"><span class="word-count" id="wordCount"></span><span class="save-status" id="saveStatus"></span>'
    + '<button class="btn btn-outline-danger btn-logout" id="btnClearData" title="清除所有本地数据并重置站点">' + svgIcon('trash', 14) + ' 清理数据</button>'
    + '<button class="btn btn-ghost btn-logout" id="btnLogout">' + svgIcon('logout', 15) + ' 退出登录</button></span>'
    + '</div>';
  html += '<p class="keys-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> 存草稿 · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 保存文章</p>';
  html += '<h3 class="draft-hint"><b>一键导出：</b>保存文章 / RSS / Sitemap 会打开系统保存对话框，选中原文件即可原地覆盖发布。</h3>';
  html += '</main>' + renderFooter();
  app().innerHTML = html;

  var editId = currentEditId();
  if (editId) {
    var post = getStaticPosts().find(function (p) { return p.id === editId; });
    if (post) {
      var title = document.querySelector('#titleInput'); if (title) title.value = post.title || '';
      var date = document.querySelector('#dateInput'); if (date) date.value = toDateTimeLocal(post.date || '');
      var tags = document.querySelector('#tagInput'); if (tags) tags.value = (post.tags || []).join(', ');
      var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = post.excerpt || '';
      var pin = document.querySelector('#pinnedInput'); if (pin) pin.checked = !!post.pinned;
      var protect = document.querySelector('#protectInput'); if (protect) protect.checked = !!post.protected;
      var pwdBox = document.querySelector('#protectPwdInput');
      if (pwdBox) pwdBox.style.display = post.protected ? 'inline-block' : 'none';
      var md = document.querySelector('#mdInput');
      if (md) {
        // 已加密文章：有解锁明文则填明文（保存时重新加密需原密码）；无则只显示空（需先解锁）
        if (post.protected) {
          md.value = _unlocked[post.id] || '';
          if (!_unlocked[post.id]) md.placeholder = '这是一篇加密文章，请先在详情页解锁后编辑';
        } else if (_cloudOn()) {
          // 云端模式：始终以云端最新正文为准（本地静态旧正文不算数），先占位再由 loadEditContent 拉取覆盖
          md.value = '';
          md.placeholder = '正在从云端加载正文…';
        } else {
          md.value = post.content || '';
        }
      }
      var st = document.querySelector('#saveStatus'); if (st) st.textContent = '正在编辑：' + (post.title || '');
      // also update page title for tests
      var hTitle = document.querySelector('#writeTitleHint'); if (hTitle) hTitle.textContent = '正在编辑：' + (post.title || '');
      updatePreview();
      loadEditContent(post, editId);
    }
  } else {
    // restore draft
    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    var latest = drafts.length ? drafts[drafts.length - 1] : null;
    if (latest && latest.id) {
      var title2 = document.querySelector('#titleInput'); if (title2) title2.value = latest.title || '';
      var date2 = document.querySelector('#dateInput'); if (date2) date2.value = toDateTimeLocal(latest.date || '');
      var tags2 = document.querySelector('#tagInput'); if (tags2) tags2.value = (latest.tags || []).join(', ');
      var excerpt2 = document.querySelector('#excerptInput'); if (excerpt2) excerpt2.value = latest.excerpt || '';
      var pin2 = document.querySelector('#pinnedInput'); if (pin2) pin2.checked = !!latest.pinned;
      var protect2 = document.querySelector('#protectInput'); if (protect2) protect2.checked = !!latest.protected;
      var pwdBox2 = document.querySelector('#protectPwdInput');
      if (pwdBox2) pwdBox2.style.display = latest.protected ? 'inline-block' : 'none';
      var md2 = document.querySelector('#mdInput'); if (md2) md2.value = latest.content || '';
    }
  }
  updatePreview();
  bindWriteEvents();
}
function toolbarHtml() {
  return ['bold', 'italic', 'code', 'h2', 'link', 'img', 'quote', 'ul', 'ol', 'fence'].map(function (cmd) {
    var icons = { bold: 'B', italic: 'I', code: '<>', h2: 'H2', link: '🔗', img: '🖼', quote: '❝', ul: '•', ol: '1.', fence: '```' };
    return '<button type="button" class="tb-btn" data-cmd="' + cmd + '" title="' + cmd + '">' + (icons[cmd] || cmd) + '</button>';
  }).join('');
}

/** 当前编辑的文章别名：来自路由 /posts/<别名>/edit 或 ?edit= */
function currentEditId() {
  var r = currentRoute();
  if (r.path.indexOf('/posts/') === 0) {
    var seg = r.path.slice('/posts/'.length).split('/');
    if (seg[1] === 'edit' && seg[0]) {
      try { return decodeURIComponent(seg[0]); } catch (e) { return seg[0]; }
    }
  }
  var q = r.query;
  return (q && q.edit) || '';
}

function updatePreview() {
  var md = document.querySelector('#mdInput');
  var pv = document.querySelector('#previewPane');
  if (!md || !pv) return;
  pv.innerHTML = renderMarkdown(md.value || '');
  var wc = document.querySelector('#wordCount');
  if (wc) wc.textContent = stripMd(md.value || '').length + ' 字';
}

/** 云端模式编辑：/api/posts 列表只返回摘要（无 content），编辑时须按 id 拉取云端全文。
 *  云端是权威数据源：即使本地静态 posts.js 有旧正文，也一律用云端最新内容覆盖（拉取失败才保留本地）。 */
function loadEditContent(post, editId) {
  if (!post || !_cloudOn() || post.protected) return;
  var st = document.querySelector('#saveStatus');
  if (st) st.textContent = '正在加载正文…';
  apiFetch('api/posts/' + encodeURIComponent(editId))
    .then(function (data) {
      var full = (data && data.post) || null;
      if (full) {
        if (full.content !== undefined) post.content = full.content;
        if (full.enc !== undefined) post.enc = full.enc;
      }
      var md = document.querySelector('#mdInput');
      if (md) { md.value = post.content || ''; md.placeholder = ''; }
      updatePreview();
      if (st) st.textContent = '正在编辑：' + (post.title || '');
    })
    .catch(function () {
      // 拉取失败：回退到本地静态内容（如有），避免编辑器空白
      var md = document.querySelector('#mdInput');
      if (md && !md.value) { md.value = post.content || ''; md.placeholder = ''; }
      updatePreview();
      if (st) st.textContent = '正文加载失败，已显示本地内容（请检查网络）';
    });
}

function bindWriteEvents() {
  var md = document.querySelector('#mdInput');
  if (md) md.addEventListener('input', function () {
    updatePreview();
    var st = document.querySelector('#saveStatus');
    if (st) st.textContent = '未保存';
  });

  // 加密开关 → 密码框显隐
  var protect = document.querySelector('#protectInput');
  if (protect) protect.addEventListener('change', function () {
    var box = document.querySelector('#protectPwdInput');
    if (box) box.style.display = protect.checked ? 'inline-block' : 'none';
  });
  // “用官方编辑器”辅助按钮：新标签打开 markdown.com.cn 编辑器（跨域无法内嵌同步）
  var btnMd = document.querySelector('#btnOpenMdEditor');
  if (btnMd) btnMd.addEventListener('click', function () {
    try {
      var mdInput = document.querySelector('#mdInput');
      var u = 'https://markdown.com.cn/editor/';
      var q = encodeURIComponent((mdInput && mdInput.value) || '');
      if (q) u += '?md=' + q;
      window.open(u, '_blank');
    } catch (e) {}
  });

  document.querySelectorAll('#toolbar [data-cmd]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cmd = btn.getAttribute('data-cmd');
      var ta = document.querySelector('#mdInput');
      if (!ta) return;
      var selStart = ta.selectionStart || 0;
      var selEnd = ta.selectionEnd || 0;
      var val = ta.value;
      var selected = val.slice(selStart, selEnd) || '文本';
      var insert = '';
      var offset = 0;
      switch (cmd) {
        case 'bold': insert = '**' + selected + '**'; offset = 2; break;
        case 'italic': insert = '*' + selected + '*'; offset = 1; break;
        case 'code': insert = '`' + selected + '`'; offset = 1; break;
        case 'h2': insert = '## ' + selected; offset = 3; break;
        case 'link': insert = '[' + selected + '](https://)'; offset = selected.length + 1; break;
        case 'img': insert = '![' + selected + '](https://)'; offset = selected.length + 2; break;
        case 'quote': insert = '> ' + selected; offset = 2; break;
        case 'ul': insert = '- ' + selected; offset = 2; break;
        case 'ol': insert = '1. ' + selected; offset = 3; break;
        case 'fence': insert = '\n```\n' + selected + '\n```\n'; offset = 4; break;
        default: insert = selected;
      }
      var newVal = val.slice(0, selStart) + insert + val.slice(selEnd);
      ta.value = newVal;
      ta.focus();
      var pos = selStart + offset;
      ta.setSelectionRange(pos, pos + selected.length);
      updatePreview();
      var st = document.querySelector('#saveStatus');
      if (st) st.textContent = '未保存';
    });
  });

  var btnSave = document.querySelector('#btnSave');
  if (btnSave) btnSave.addEventListener('click', function () { saveStaticArticle(); });

  var btnCloud = document.querySelector('#btnCloud');
  if (btnCloud) btnCloud.addEventListener('click', function () { cloudPublish(); });

  var btnExport = document.querySelector('#btnExport');
  if (btnExport) btnExport.addEventListener('click', function () {
    saveFileFriendly('posts.js', buildPostsJs(), '已导出 posts.js', '已下载 posts.js');
  });

  var btnRss = document.querySelector('#btnRss');
  if (btnRss) btnRss.addEventListener('click', function () {
    saveFileFriendly('feed.xml', buildFeedXmlClient(getStaticPosts(), 20), '已导出 feed.xml', '已下载 feed.xml');
  });

  var btnSitemap = document.querySelector('#btnSitemap');
  if (btnSitemap) btnSitemap.addEventListener('click', function () {
    saveFileFriendly('sitemap.xml', buildSitemapClient(), '已导出 sitemap.xml', '已下载 sitemap.xml');
  });

  // 退出登录：清除本地会话（云端同时撤销服务端 token），回到登录门
  var btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', async function () {
    await adminLogout();
    route();
  });

  var btnClearData = document.querySelector('#btnClearData');
  if (btnClearData) btnClearData.addEventListener('click', function () {
    if (!confirm('确定要清空当前编辑内容吗？（不会影响已保存的文章和草稿）')) return;
    // 仅清空编辑器表单，保留登录态和所有存储数据
    var title = document.querySelector('#titleInput');
    var date = document.querySelector('#dateInput');
    var tags = document.querySelector('#tagInput');
    var excerpt = document.querySelector('#excerptInput');
    var md = document.querySelector('#mdInput');
    var preview = document.querySelector('#previewPane');
    var wordCount = document.querySelector('#wordCount');
    var hint = document.querySelector('#writeTitleHint');
    if (title) title.value = '';
    if (date) date.value = '';
    if (tags) tags.value = '';
    if (excerpt) excerpt.value = '';
    if (md) { md.value = ''; md.dispatchEvent(new Event('input')); }
    if (preview) preview.innerHTML = '';
    if (wordCount) wordCount.textContent = '0 字';
    if (hint) hint.textContent = '新文章';
    // 清除当前编辑 id（如有），重置为新文章状态
    localStorage.removeItem('qingyu.edit.id');
  });

  var btnToday = document.querySelector('#btnToday');
  if (btnToday) {
    btnToday.addEventListener('click', function () {
      var input = document.querySelector('#dateInput');
      if (!input) return;
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, '0');
      var day = String(now.getDate()).padStart(2, '0');
      var hours = String(now.getHours()).padStart(2, '0');
      var minutes = String(now.getMinutes()).padStart(2, '0');
      input.value = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
      // 同步触发预览更新（如果有）
      if (typeof previewContent === 'function') previewContent();
    });
  }

  var btnDraft = document.querySelector('#btnSaveDraft');
  if (btnDraft) btnDraft.addEventListener('click', function () { saveDraft(); });

  var btnImport = document.querySelector('#btnImport');
  var fileInput = document.querySelector('#mdFileInput');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var parsed = parseMdFile(String(e.target.result || ''), file.name);
        var title = document.querySelector('#titleInput'); if (title) title.value = parsed.title;
        var date = document.querySelector('#dateInput'); if (date) date.value = parsed.date;
        var tags = document.querySelector('#tagInput'); if (tags) tags.value = parsed.tags.join(', ');
        var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = parsed.excerpt || '';
        var md2 = document.querySelector('#mdInput'); if (md2) md2.value = parsed.content;
        updatePreview();
      };
      reader.readAsText(file);
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveStaticArticle(); }
  });
}

/* ---------- 管理后台：侧边栏 + 文章列表 ---------- */
function renderAdmin() {
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade write-page">';
  
  if (!adminOk()) {
    // 未登录：复用 renderWrite 的登录逻辑
    renderWrite();
    return;
  }
  
  var route = adminRoute();
  var sidebar = renderAdminSidebar(route);
  html += '<div class="admin-layout">' + sidebar + '<div class="admin-content">';
  
  if (route === 'posts') {
    html += renderPostList();
  } else {
    html += renderEditorBody();
  }
  
  html += '</div></div>';
  html += '</main>' + renderFooter();
  app().innerHTML = html;
  
  // --- 绑定编辑器事件（与 renderWrite 保持一致） ---
  var btnClearData = document.querySelector('#btnClearData');
  if (btnClearData) btnClearData.addEventListener('click', function () {
    if (!confirm('确定要清空当前编辑内容吗？（不会影响已保存的文章和草稿）')) return;
    var title = document.querySelector('#titleInput');
    var date = document.querySelector('#dateInput');
    var tags = document.querySelector('#tagInput');
    var excerpt = document.querySelector('#excerptInput');
    var md = document.querySelector('#mdInput');
    var preview = document.querySelector('#previewPane');
    var wordCount = document.querySelector('#wordCount');
    var hint = document.querySelector('#writeTitleHint');
    if (title) title.value = '';
    if (date) date.value = '';
    if (tags) tags.value = '';
    if (excerpt) excerpt.value = '';
    if (md) { md.value = ''; md.dispatchEvent(new Event('input')); }
    if (preview) preview.innerHTML = '';
    if (wordCount) wordCount.textContent = '0 字';
    if (hint) hint.textContent = '新文章';
    localStorage.removeItem('qingyu.edit.id');
  });

  var btnToday = document.querySelector('#btnToday');
  if (btnToday) {
    btnToday.addEventListener('click', function () {
      var input = document.querySelector('#dateInput');
      if (!input) return;
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, '0');
      var day = String(now.getDate()).padStart(2, '0');
      var hours = String(now.getHours()).padStart(2, '0');
      var minutes = String(now.getMinutes()).padStart(2, '0');
      input.value = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
      if (typeof previewContent === 'function') previewContent();
    });
  }

  var btnDraft = document.querySelector('#btnSaveDraft');
  if (btnDraft) btnDraft.addEventListener('click', function () { saveDraft(); });

  var btnImport = document.querySelector('#btnImport');
  var fileInput = document.querySelector('#mdFileInput');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var parsed = parseMdFile(String(e.target.result || ''), file.name);
        var title = document.querySelector('#titleInput'); if (title) title.value = parsed.title;
        var date = document.querySelector('#dateInput'); if (date) date.value = parsed.date;
        var tags = document.querySelector('#tagInput'); if (tags) tags.value = parsed.tags.join(', ');
        var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = parsed.excerpt || '';
        var md2 = document.querySelector('#mdInput'); if (md2) md2.value = parsed.content;
        updatePreview();
      };
      reader.readAsText(file);
    });
  }

  var btnSave = document.querySelector('#btnSave');
  if (btnSave) btnSave.addEventListener('click', function () { saveStaticArticle(); });

  var btnCloud = document.querySelector('#btnCloud');
  if (btnCloud) btnCloud.addEventListener('click', function () { cloudPublish(); });

  var btnExport = document.querySelector('#btnExport');
  if (btnExport) btnExport.addEventListener('click', function () {
    saveFileFriendly('posts.js', buildPostsJs(), '已导出 posts.js', '已下载 posts.js');
  });

  var btnRss = document.querySelector('#btnRss');
  if (btnRss) btnRss.addEventListener('click', function () {
    saveFileFriendly('feed.xml', buildFeedXmlClient(getStaticPosts(), 20), '已导出 feed.xml', '已下载 feed.xml');
  });

  var btnSitemap = document.querySelector('#btnSitemap');
  if (btnSitemap) btnSitemap.addEventListener('click', function () {
    saveFileFriendly('sitemap.xml', buildSitemapClient(), '已导出 sitemap.xml', '已下载 sitemap.xml');
  });

  var btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', async function () {
    await adminLogout();
    route();
  });

  // 侧边栏退出按钮
  var btnLogoutSidebar = document.querySelector('#btnLogoutSidebar');
  if (btnLogoutSidebar) btnLogoutSidebar.addEventListener('click', async function () {
    await adminLogout();
    route();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveStaticArticle(); }
  });

  // 文章列表的删除按钮（事件委托）
  var content = document.querySelector('.admin-content');
  if (content) {
    content.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-danger[data-post-id]');
      if (!btn) return;
      var id = btn.dataset.postId;
      var title = btn.dataset.postTitle || '未命名';
      if (!confirm('确定要删除文章「' + title + '」吗？此操作不可恢复！')) return;
      if (_cloudOn()) {
        // 删除走 /api/posts/:id 的 DELETE（携带会话 token；旧代码误用 /api/admin/posts/:id 返回 404）
        apiFetch('api/posts/' + encodeURIComponent(id), { method: 'DELETE', body: '{}' }).then(function (res) {
          if (res && res.ok) {
            // 同步移除本地列表项，删除后列表立即生效（无需刷新）
            var arr = window.BLOG_POSTS;
            if (Array.isArray(arr)) {
              window.BLOG_POSTS = arr.filter(function (p) { return p && p.id !== id; });
            }
            alert('删除成功');
            route();
          } else {
            alert('删除失败，请重试');
          }
        }).catch(function () {
          alert('删除失败，请检查网络');
        });
      } else {
        var posts = getStaticPosts();
        var idx = posts.findIndex(function (p) { return p.id === id; });
        if (idx >= 0) {
          posts.splice(idx, 1);
          var blob = new Blob(['window.BLOG_POSTS=' + JSON.stringify(posts, null, 2) + ';'], { type: 'application/javascript' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'posts.js';
          a.click();
          // 延迟释放 URL：立即 revoke 会让部分浏览器（尤其 file://）取消下载，导致「删了却导出不了」
          setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
          alert('删除成功：请用下载的 posts.js 覆盖站点文件，刷新后删除生效');
          route();
        } else {
          alert('未找到该文章（可能已删除或不同步）');
        }
      }
    });
  }

  // 加载编辑数据（/admin/posts/:id/edit 路由下 currentEditId() 解析不到，需用 getEditIdFromRoute 兜底）
  var editId = currentEditId() || getEditIdFromRoute();
  if (editId) {
    var post = getStaticPosts().find(function (p) { return p.id === editId; });
    if (post) {
      var title = document.querySelector('#titleInput'); if (title) title.value = post.title || '';
      var date = document.querySelector('#dateInput'); if (date) date.value = toDateTimeLocal(post.date || '');
      var tags = document.querySelector('#tagInput'); if (tags) tags.value = (post.tags || []).join(', ');
      var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = post.excerpt || '';
      var pin = document.querySelector('#pinnedInput'); if (pin) pin.checked = !!post.pinned;
      var protect = document.querySelector('#protectInput'); if (protect) protect.checked = !!post.protected;
      var pwdBox = document.querySelector('#protectPwdInput');
      if (pwdBox) pwdBox.style.display = post.protected ? 'inline-block' : 'none';
      var md = document.querySelector('#mdInput');
      if (md) {
        if (post.protected) {
          md.value = _unlocked[post.id] || '';
          if (!_unlocked[post.id]) md.placeholder = '这是一篇加密文章，请先在详情页解锁后编辑';
        } else if (_cloudOn()) {
          // 云端模式：始终以云端最新正文为准，先占位再由 loadEditContent 拉取覆盖
          md.value = '';
          md.placeholder = '正在从云端加载正文…';
        } else {
          md.value = post.content || '';
        }
      }
      var st = document.querySelector('#saveStatus'); if (st) st.textContent = '正在编辑：' + (post.title || '');
      var hTitle = document.querySelector('#writeTitleHint'); if (hTitle) hTitle.textContent = '正在编辑：' + (post.title || '');
      updatePreview();
      loadEditContent(post, editId);
    }
  } else {
    var draft = loadDraftFromStore('__new');
    if (draft) {
      var title = document.querySelector('#titleInput'); if (title) title.value = draft.title || '';
      var date = document.querySelector('#dateInput'); if (date) date.value = draft.date || '';
      var tags = document.querySelector('#tagInput'); if (tags) tags.value = (draft.tags || []).join(', ');
      var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = draft.excerpt || '';
      var pin = document.querySelector('#pinnedInput'); if (pin) pin.checked = !!draft.pinned;
      var md = document.querySelector('#mdInput'); if (md) md.value = draft.content || '';
      updatePreview();
    }
  }
}

/** 把库内日期（YYYY-MM-DD 或 YYYY-MM-DD HH:mm）转为 datetime-local 值（YYYY-MM-DDTHH:mm） */
function toDateTimeLocal(v) {
  var s = String(v || '').trim();
  var m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (m) return m[1] + 'T' + (m[2] ? (m[2].length === 1 ? '0' + m[2] : m[2]) + ':' + m[3] : '00:00');
  return s;
}

function collectEditor() {
  var title = document.querySelector('#titleInput'); if (!title) return null;
  var date = document.querySelector('#dateInput');
  var tags = document.querySelector('#tagInput');
  var excerpt = document.querySelector('#excerptInput');
  var pin = document.querySelector('#pinnedInput');
  var md = document.querySelector('#mdInput');
  var protect = document.querySelector('#protectInput');
  var protectPwd = document.querySelector('#protectPwdInput');
  // 日期：datetime-local 值形如 "2025-01-01T08:30"；存库统一 "YYYY-MM-DD HH:mm"
  var dv = String((date && date.value) || '').replace('T', ' ');
  if (!dv) {
    // 未填写时用本地时间（toISOString 是 UTC，东八区凌晨会错到前一天）
    var now = new Date();
    var pad2 = function (n) { return String(n).padStart(2, '0'); };
    dv = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + ' '
      + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  }
  return {
    title: title.value || '未命名',
    date: dv,
    tags: String((tags && tags.value) || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean),
    excerpt: (excerpt && excerpt.value) || '',
    pinned: !!(pin && pin.checked),
    content: md ? md.value : '',
    // 加密意图：_wantProtect 勾选、_protectPwd 密码（异步加密在保存/发布时执行）
    _wantProtect: !!(protect && protect.checked),
    _protectPwd: String((protectPwd && protectPwd.value) || '').trim()
  };
}

/** 异步应用加密：勾选加密 + 有密码 → content 加密进 enc；否则原样返回（保留已加密状态） */
async function applyEncryption(d) {
  if (!d) return d;
  if (d._wantProtect) {
    if (d._protectPwd && d.content) {
      d.protected = true;
      d.enc = await encryptText(d.content, d._protectPwd);   // enc 是对象（含 salt/iv/data base64）
      d.content = '';
    } else if (!d.protected) {
      d._encErr = '勾选了加密但未填写文章访问密码';
    }
  } else {
    // 取消加密：解除自身加密状态（明文已在 d.content）
    d.protected = false;
    d.enc = null;
  }
  delete d._wantProtect;
  delete d._protectPwd;
  return d;
}

function saveDraft() {
  var d = collectEditor();
  if (!d) return;
  // 草稿不加密（本地明文方便找回）；仅记录加密意图开关，发布/保存时再加密
  delete d._wantProtect; delete d._protectPwd; delete d._encErr;
  var editId = currentEditId();
  var id = editId || (d.title ? slugify(d.title) : 'draft');
  saveDraftToStore(id, d);
  var st = document.querySelector('#saveStatus');
  if (st) st.textContent = '已保存草稿';
}

async function saveStaticArticle() {
  var d = await applyEncryption(collectEditor());
  if (!d) return;
  if (d._encErr) {
    var st = document.querySelector('#saveStatus');
    if (st) st.textContent = '保存失败：' + d._encErr;
    delete d._encErr;
    return;
  }
  var editId = currentEditId();
  var id = editId || (d.title ? slugify(d.title) : 'draft');
  d.id = id;
  saveDraftToStore('__new', d);
  var st2 = document.querySelector('#saveStatus');
  if (st2) st2.textContent = '已保存，点击「导出 posts.js」发布';
}

/** 云端发布（新建 POST / 编辑 PUT），成功后同步本地列表（首页无需刷新即可见）。
 *  /write、/posts/:id/edit、/admin、/admin/posts/:id/edit 共用。 */
async function cloudPublish() {
  var d = await applyEncryption(collectEditor());
  if (!d) return;
  if (d._encErr) {
    var st = document.querySelector('#saveStatus');
    if (st) st.textContent = '发布失败：' + d._encErr;
    delete d._encErr;
    return;
  }
  // /admin/posts/:id/edit 下 currentEditId() 解析不到，需 getEditIdFromRoute 兜底，否则误用 POST 报 409
  var editId = currentEditId() || getEditIdFromRoute();
  var id = editId || (d.title ? slugify(d.title) : 'draft');
  d.id = id;
  var st = document.querySelector('#saveStatus');
  if (st) st.textContent = '发布中…';
  try {
    // 新建用 POST，编辑用 PUT（幂等）
    var method = editId ? 'PUT' : 'POST';
    await apiFetch('api/posts' + (editId ? '/' + encodeURIComponent(editId) : ''), {
      method: method,
      body: JSON.stringify(d)
    });
    // 发布成功后回填文章并同步本地列表（首页立即可见）
    saveDraftToStore('__new', d);
    var arr = (Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : []).slice();
    var idx = arr.findIndex(function (p) { return p && p.id === d.id; });
    if (idx >= 0) arr[idx] = d; else arr.push(d);
    window.BLOG_POSTS = arr;
    if (st) st.textContent = '✅ 已发布到云端';
  } catch (e) {
    var em = (e && e.message) || '未知错误';
    // 会话过期/无效：清掉本地旧 token，跳回登录页重新拿新令牌
    if (/401/.test(em)) {
      _setSessionToken('');
      _setAdminSession(false);
      if (st) st.textContent = '登录已过期，正在前往重新登录…';
      setTimeout(function () { route(); }, 900);
      return;
    }
    if (st) st.textContent = '发布失败：' + em;
  }
}

function buildSitemapClient() {
  var cfg = getConfig();
  var base = cfg.siteUrl || (typeof location !== 'undefined' ? location.origin : '');
  base = String(base || '').replace(/\/+$/, '');
  var posts = sortPagePosts(getStaticPosts());
  var lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  lines.push('  <url><loc>' + esc(base + '/') + '</loc></url>');
  lines.push('  <url><loc>' + esc(base + '/about') + '</loc></url>');
  lines.push('  <url><loc>' + esc(base + '/archive') + '</loc></url>');
  posts.forEach(function (p) {
    lines.push('  <url><loc>' + esc(base + postUrl(p.id)) + '</loc><lastmod>' + esc(p.date || '') + '</lastmod></url>');
  });
  lines.push('</urlset>', '');
  return lines.join('\n');
}

/* ---------- 路由 ----------
 * 干净路径路由（history 模式，无 hash）：
 *   /                首页
 *   /archive         归档
 *   /about           关于
 *   /tags            标签
 *   /admin / /write  写作后台
 *   /posts/<别名>/    文章详情（带尾斜杠）
 *   /posts/<别名>/edit  编辑该文章（写作后台）
 * 本地 file:// 打开时退化为 hash 模式（#/…），双击 index.html 仍可用。
 */
function appRoot() {
  // 历史（干净路径）模式一律部署在站点根，返回 ''。
  // 若确实要挂在子路径（如 /blog ），请在此返回 '/blog' 并确保服务器相应回退。
  return '';
}
function useHashMode() {
  // 本地 file:// 直开 index.html 时走 hash 路由（无服务器回退干净路径）
  return typeof location !== 'undefined' && location.protocol === 'file:';
}
/** 解析当前路由：history 模式读 pathname+search，hash 模式读 location.hash */
function currentRoute() {
  var raw = '';
  if (useHashMode()) {
    var h = String(location.hash || '#/').replace(/^#/, '');
    raw = h || '/';
  } else {
    raw = ((location.pathname || '/') + (location.search || '')).slice((appRoot() || '').length) || '/';
  }
  var parts = String(raw).split('?');
  var path = parts[0] || '/';
  if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1); // 去尾斜杠
  if (!path) path = '/';
  var query = {};
  if (parts[1]) {
    parts[1].split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) { try { query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) {} }
    });
  }
  return { path: path, query: query };
}
/** 生成可放入 <a href> 的站内地址 */
function href(path, query) {
  var q = '';
  if (query) {
    var kv = Object.keys(query).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); });
    if (kv.length) q = '?' + kv.join('&');
  }
  if (useHashMode()) return '#/' + String(path).replace(/^\//, '') + q;
  return appRoot() + String(path) + q;
}
/** 文章地址：统一 /posts/<别名>/ 形式（带尾斜杠） */
function postUrl(id) {
  return '/posts/' + encodeURIComponent(id) + '/';
}
/** 跳转：history 模式用 pushState，hash 模式用 hash 赋值 */
function navigate(path, query) {
  // 去掉任何残留的 ?查询 / #片段，避免路径出现双重 ?（如 #/?page=2?）
  path = String(path || '/').replace(/[?#].*$/, '');
  if (useHashMode()) {
    location.hash = '#/' + path.replace(/^\//, '') + (query ? serializeQuery(query) : '');
  } else {
    try {
      history.pushState({}, '', appRoot() + path + (query ? serializeQuery(query) : ''));
    } catch (e) {}
  }
  route();
}
function serializeQuery(query) {
  var kv = Object.keys(query || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); });
  return kv.length ? '?' + kv.join('&') : '';
}
/** 旧 hash 里解析查询（编辑文章等），兼容两种情况 */
function parseQuery(source) {
  var q = {};
  var str = String(source != null ? source : (useHashMode() ? location.hash : location.search));
  var m = str.match(/[?&]([^=]+)=([^&]*)/g);
  if (m) m.forEach(function (kv) {
    var p = kv.replace(/^[?&]/, '').split('=');
    try { q[decodeURIComponent(p[0])] = decodeURIComponent(p[1]); } catch (e) {}
  });
  return q;
}

async function route() {
  _searchOpen = false;   // 进入新页面时收起顶部搜索
  var r = currentRoute();
  var path = r.path;
  var q = r.query;

  if (path === '/') { app().innerHTML = renderHome(); }
  else if (path.indexOf('/posts/') === 0) {
    // /posts/<别名>/  或  /posts/<别名>/edit
    var rest = path.slice('/posts/'.length); // 已去尾斜杠
    var seg = rest.split('/');
    var id = '';
    var editing = false;
    if (seg[0] === 'edit') { id = ''; editing = true; }
    else if (seg.length >= 1) {
      try { id = decodeURIComponent(seg[0] || ''); } catch (e) { id = seg[0] || ''; }
      editing = seg[1] === 'edit';
    }
    if (editing) {
      renderWrite();
    } else {
      await renderPost(id);
    }
  }
  else if (path === '/write' || path === '/admin' || path === '/admin/write' || path === '/admin/posts' || /^\/admin\/posts\/[^\/]+\/edit$/.test(path)) { renderAdmin(); }
  else if (path === '/archive') { app().innerHTML = renderArchive(); }
  else if (path === '/about') { app().innerHTML = renderAbout(); }
  else if (path === '/tags') { app().innerHTML = renderTags(); }
  else {
    app().innerHTML = renderNav(path) + '<main class="container page-fade"><div class="empty"><div class="big">' + svgIcon('question', 36) + '</div><p>内容不存在</p><p><a href="' + esc(href('/')) + '">返回首页</a></p></div></main>' + renderFooter();
  }
  bindGlobal();
}

function bindGlobal() {
  var tb = document.querySelector('#themeToggle');
  if (tb) tb.addEventListener('click', function () { toggleTheme(); });
  bindTocScroll();
  bindSearch();
  bindBackTop();
}

/* 返回顶部悬浮按钮：滚动超过一屏出现，点击平滑滚回当前页顶部（不跳转页面） */
var _backTopScrollBound = false;
function bindBackTop() {
  if (!_backTopScrollBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    _backTopScrollBound = true;
    window.addEventListener('scroll', function () { updateBackTop(); }, { passive: true });
  }
  var bt = document.querySelector('#backTop');
  if (bt && bt.addEventListener) bt.addEventListener('click', function () {
    if (typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      catch (e) { window.scrollTo(0, 0); }
    }
  });
  updateBackTop();
}
function updateBackTop() {
  var bt = document.querySelector('#backTop');
  if (!bt || !bt.classList || !bt.classList.add) return;
  var y = (typeof window !== 'undefined' && typeof window.scrollY === 'number')
    ? window.scrollY
    : ((typeof document !== 'undefined' && document.documentElement && document.documentElement.scrollTop) || 0);
  if (y > 300) bt.classList.add('show'); else bt.classList.remove('show');
}

/* 站内链接点击拦截：history 模式用 pushState，避免整页刷新 */
var _navClickBound = false;
function bindNavClicks() {
  if (_navClickBound) return;
  _navClickBound = true;
  if (typeof document === 'undefined') return;
  document.addEventListener('click', function (e) {
    try {
      var a = e.target;
      while (a && a.tagName !== 'A') a = a.parentNode;
      if (!a || !a.getAttribute) return;
      var hrefAttr = a.getAttribute('href') || '';
      if (!hrefAttr) return;
      // 外链 / 带 target / 静态资源（feed.xml 等）不拦截
      if (a.target || /^https?:|^\/\//i.test(hrefAttr)) return;
      if (/^(feed\.xml|sitemap\.xml|posts\.js|config\.js|app\.js|style\.css|favicon)/.test(hrefAttr)) return;
      // 纯 '#' 或站内锚点（#toc-1）不拦截，留给默认滚动
      if (hrefAttr.charAt(0) === '#' && hrefAttr.charAt(1) !== '/') return;
      e.preventDefault();
      var raw = hrefAttr;
      var qobj = {};
      var path = raw;
      if (raw.charAt(0) === '#') {            // hash 模式（file:// 直开）：#/posts/x → 去掉 '#'
        path = raw.slice(1);
      } else if (!useHashMode()) {            // 干净路径模式：去掉 appRoot 前缀
        var root = appRoot(); // ''（根）或 '/public'
        if (root && raw.indexOf(root) === 0) path = raw.slice(root.length);
      }
      // 注意：必须在去掉 '#' 之后的 path 上取 '?' 下标，否则与 raw 错位一位
      var qi = path.indexOf('?');
      if (qi >= 0) {
        (path.slice(qi + 1)).split('&').forEach(function (kv) {
          var p = kv.split('=');
          if (p[0]) { try { qobj[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) {} }
        });
        path = path.slice(0, qi);
      }
      navigate(path, qobj);
      }
      catch (err) {}
  }, true);
}

/* 目录点击：平滑滚动到正文对应标题，避免改变 location.hash 触发 hash 路由 */
function bindTocScroll() {
  var links = document.querySelectorAll('a[data-toc]');
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var el = (typeof document.getElementById === 'function') ? document.getElementById(id.slice(1)) : document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // 若找不到目标，则恢复 router innerHTML 的行为：不阻止默认（可能跳到 404），故此处无默认跳转
    });
  });
}

/* 顶部导航搜索：点击搜索图标 → 隐藏导航、显示搜索框；输入实时出结果下拉面板 */
function bindSearch() {
  var toggle = document.querySelector('#searchToggle');
  var close = document.querySelector('#searchClose');
  var form = document.querySelector('#topbarSearch');
  var input = document.querySelector('#globalSearchInput');
  var panel = document.querySelector('#searchPanel');

  if (toggle) toggle.addEventListener('click', function () {
    var bar = document.querySelector('.topbar');
    if (bar && bar.classList.contains('searching')) {   // 再次点击 = 收起
      if (close) close.click();
      return;
    }
    _searchOpen = true;
    if (bar) bar.classList.add('searching');
    if (input) { input.focus(); input.select && input.select(); }
  });
  if (close) close.addEventListener('click', function () {
    _searchOpen = false;
    var bar = document.querySelector('.topbar');
    if (bar) bar.classList.remove('searching');
    if (input) input.value = '';
    if (panel) { panel.innerHTML = ''; panel.classList.remove('open'); }
  });
  if (input) {
    input.addEventListener('input', function () { renderSearchPanel(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (close) close.click(); }
    });
  }
  // 点击面板内部不冒泡；点击面板外部则收起整个搜索框
  if (panel) panel.addEventListener('click', function (e) { e.stopPropagation(); });
  if (!_searchDocBound && typeof document !== 'undefined' && document.addEventListener) {
    _searchDocBound = true;
    document.addEventListener('click', function (e) {
      var bar = document.querySelector('.topbar');
      if (!bar || !bar.classList.contains('searching')) return;
      var t = e.target;
      while (t && t !== document) {
        if (t.id === 'topbarSearch' || t.id === 'searchPanel' || t.id === 'searchToggle') return;
        t = t.parentNode;
      }
      var c = document.querySelector('#searchClose');   // 每次重新查询，避免路由重渲染后引用失效
      if (c) c.click();
    });
  }
}

/* 渲染搜索结果下拉面板（跨全部文章，非当前页过滤） */
function renderSearchPanel(query) {
  var panel = document.querySelector('#searchPanel');
  if (!panel) return;
  var q = String(query || '').trim();
  if (!q) { panel.innerHTML = ''; panel.classList.remove('open'); return; }
  var hits = globalSearch(q, 20);
  if (!hits.length) {
    panel.innerHTML = '<div class="search-empty">没有匹配的文章</div>';
  } else {
    panel.innerHTML = hits.map(function (p) {
      var snip = searchSnippet(p, q);
      return '<a class="search-hit" href="' + esc(href(postUrl(p.id))) + '">'
        + '<div class="sh-title">' + esc(p.title || '') + '</div>'
        + (snip ? '<div class="sh-snip">' + esc(snip) + '</div>' : '')
        + '</a>';
    }).join('');
  }
  panel.classList.add('open');
}

/* ---------- 启动引导 ---------- */
window.__bootPromise = (async function () {
  var cfg = getConfig();
  if (cfg.mode === 'api' || cfg.mode === 'auto') {
    try {
      var resp = await apiFetch('api/posts');
      var data = resp || {};
      if (data && Array.isArray(data.posts)) {
        _cloudDetected = true;   // 云端在线：后续登录用 /api/admin/*
        if (data.posts.length) {
          var existing = (Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : []);
          var byId = {};
          existing.forEach(function (p) { byId[p.id] = p; });
          data.posts.forEach(function (p) {
            var old = byId[p.id];
            if (old) {
              // 云端列表是摘要（不含 content/enc）：仅覆盖已返回字段，保留静态正文与摘要，
              // 避免首页卡片摘要被清空、全文搜索失效
              var merged = {};
              Object.keys(p).forEach(function (k) { if (p[k] !== undefined) merged[k] = p[k]; });
              byId[p.id] = Object.assign({}, old, merged);
            } else {
              byId[p.id] = p;
            }
          });
          window.BLOG_POSTS = Object.keys(byId).map(function (k) { return byId[k]; });
        }
      }
    } catch (e) { /* fall back to static */ }
  }
  applyTheme(getTheme());
  bindNavClicks();
  route();
  window.addEventListener('hashchange', function () { route(); });
  window.addEventListener('popstate', function () { route(); });
})();
