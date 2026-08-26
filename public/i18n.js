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

  /** 加载语言 JSON 文件 */
  async function loadLocale(lang) {
    if (!lang) lang = DEFAULT_LANG;
    try {
      var resp = await fetch('locales/' + lang + '.json');
      if (resp.ok) {
        _translations = await resp.json();
      } else {
        // 加载失败回退中文
        if (lang !== DEFAULT_LANG) {
          var fallback = await fetch('locales/' + DEFAULT_LANG + '.json');
          if (fallback.ok) _translations = await fallback.json();
        }
      }
    } catch (e) {
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

  /** 初始化（在 app.js 之前调用，同步读取语言设置） */
  function initLocale() {
    _locale = detectLang();
  }

  // 同步初始化：读取 localStorage 设置语言代码（不加载 JSON）
  initLocale();

  // 暴露到全局
  window.__i18n = {
    t: t,
    getLocale: getLocale,
    getLanguages: getLanguages,
    loadLocale: loadLocale
  };

  // 兼容别名
  window.t = t;
})();
