/* ============================================================
 * Qingyu'Blog · i18n 国际化模块
 * 支持语言：zh-CN（默认）、en、ja、ko、hi
 * ============================================================ */
(function () {
  'use strict';

  var LANGUAGES = [
    { code: 'zh-CN', name: '中文',   flag: '🇨🇳' },
    { code: 'en',    name: 'English', flag: '🇬🇧' },
    { code: 'ja',    name: '日本語',  flag: '🇯🇵' },
    { code: 'ko',    name: '한국어',  flag: '🇰🇷' },
    { code: 'hi',    name: 'हिन्दी',  flag: '🇮🇳' }
  ];

  var DEFAULT_LANG = 'zh-CN';
  var _locale = DEFAULT_LANG;
  var _translations = {};

  /**
   * 确定 locale JSON 的基础路径。
   * 策略：从 <base href> 或当前脚本 src 推断，确保在子页面也能正确加载。
   */
  function _baseDir() {
    // 优先使用 <base href>
    try {
      var base = document.querySelector('base');
      if (base && base.href) {
        var u = new URL(base.href, location.href);
        return u.href.replace(/\/+$/, '');
      }
    } catch (e) {}
    // 回退：从 i18n.js 自身的 src 推断（如 /i18n.js → ''）
    try {
      var scripts = document.querySelectorAll('script[src]');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src') || '';
        if (/i18n\.js$/.test(src)) {
          var url = new URL(src, location.href);
          return url.href.replace(/\/[^\/]*$/, '');
        }
      }
    } catch (e) {}
    // 最终回退
    return location.origin || '';
  }

  /** 检测浏览器首选语言 → 映射到支持的语言 */
  function detectLang() {
    try {
      var saved = localStorage.getItem('blog.locale');
      if (saved && LANGUAGES.some(function (l) { return l.code === saved; })) return saved;
    } catch (e) {}
    var raw = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (/^zh/.test(raw)) return 'zh-CN';
    if (/^ja/.test(raw)) return 'ja';
    if (/^ko/.test(raw)) return 'ko';
    if (/^hi/.test(raw)) return 'hi';
    if (/^en/.test(raw)) return 'en';
    return DEFAULT_LANG;
  }

  /** 加载语言 JSON 文件（使用绝对路径） */
  async function loadLocale(lang) {
    if (!lang) lang = DEFAULT_LANG;
    var base = _baseDir();
    var url = base + '/locales/' + lang + '.json';
    try {
      var resp = await fetch(url);
      if (resp.ok) {
        _translations = await resp.json();
      } else {
        // 加载失败回退中文
        if (lang !== DEFAULT_LANG) {
          var fallbackUrl = base + '/locales/' + DEFAULT_LANG + '.json';
          var fallback = await fetch(fallbackUrl);
          if (fallback.ok) _translations = await fallback.json();
        }
      }
    } catch (e) {
      console.warn('[i18n] Failed to load locale:', lang, e);
      _translations = {};
    }
    _locale = lang;
    try { localStorage.setItem('blog.locale', lang); } catch (e) {}
    // 更新 <html lang="...">
    document.documentElement.setAttribute('lang', lang === 'zh-CN' ? 'zh-CN' : lang);
  }

  /** 翻译函数：t('key') 或 t('key', { var: value }) */
  function t(key, vars) {
    var str = _translations[key];
    if (str === undefined || str === null) str = key;
    if (vars && typeof str === 'string') {
      Object.keys(vars).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return str;
  }

  /** 获取当前语言代码 */
  function getLocale() { return _locale; }

  /** 获取支持的语言列表 */
  function getLanguages() { return LANGUAGES.slice(); }

  /** 是否已加载翻译数据 */
  function isReady() { return Object.keys(_translations).length > 0; }

  /** 初始化（同步读取 localStorage 设置语言代码，不加载 JSON） */
  function initLocale() { _locale = detectLang(); }

  // 同步初始化
  initLocale();

  // 暴露到全局
  window.__i18n = {
    t: t,
    getLocale: getLocale,
    getLanguages: getLanguages,
    loadLocale: loadLocale,
    isReady: isReady
  };

  // 兼容别名
  window.t = t;
})();
