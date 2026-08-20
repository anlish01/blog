# -*- coding: utf-8 -*-
p = 'public/app.js'
s = open(p, encoding='utf-8').read()
sun = chr(0x2600) + chr(0xFE0F)
moon = chr(0x1F319)

theme_funcs = (
"/* ---------- main theme (dark / light) ---------- */\n"
"function themeKey() { return 'qingyu.theme'; }\n"
"function getTheme() {\n"
"  try { var v = localStorage.getItem(themeKey()); if (v === 'light' || v === 'dark') return v; } catch (e) {}\n"
"  try { if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } catch (e) {}\n"
"  return 'light';\n"
"}\n"
"function applyTheme(t) {\n"
"  if (t !== 'dark') t = 'light';\n"
"  try { document.documentElement.setAttribute('data-theme', t); } catch (e) {}\n"
"}\n"
"function setTheme(t) { applyTheme(t); try { localStorage.setItem(themeKey(), t); } catch (e) {} }\n"
"function toggleTheme() { var n = getTheme() === 'dark' ? 'light' : 'dark'; setTheme(n); refreshThemeIcon(); return n; }\n"
"function themeIcon() { return getTheme() === 'dark' ? '" + sun + "' : '" + moon + "'; }\n"
"function refreshThemeIcon() {\n"
"  var b = document.querySelector('#themeToggle'); if (b) b.innerHTML = themeIcon();\n"
"}\n"
"\n"
"function esc(s) {"
)

oldA = "function esc(s) {"
assert s.count(oldA) == 1, ('A', s.count(oldA))
s = s.replace(oldA, theme_funcs, 1)

oldB = "  var sup = '<button class=\"icon-btn\" id=\"searchToggle\" aria-label=\"\u641c\u7d22\" title=\"\u641c\u7d22\">\U0001F50D</button>'"
newB = (
"  var sup = '<button class=\"icon-btn\" id=\"themeToggle\" aria-label=\"\u5207\u6362\u6df1\u8272\u6a21\u5f0f\" title=\"\u5207\u6362\u6df1\u8272/\u6d45\u8272\u6a21\u5f0f\">' + themeIcon() + '</button>'\n"
"    + '<button class=\"icon-btn\" id=\"searchToggle\" aria-label=\"\u641c\u7d22\" title=\"\u641c\u7d22\">\U0001F50D</button>'"
)
assert s.count(oldB) == 1, ('B', s.count(oldB))
s = s.replace(oldB, newB, 1)

oldC = "    }).join('');\n  });\n}\n\n/* ---------- \u542f\u52a8\u5f15\u5bfc ---------- */"
newC = (
"    }).join('');\n  });\n"
"  var tb = document.querySelector('#themeToggle');\n"
"  if (tb) tb.addEventListener('click', function () { toggleTheme(); });\n"
"}\n\n/* ---------- \u542f\u52a8\u5f15\u5bfc ---------- */"
)
assert s.count(oldC) == 1, ('C', s.count(oldC))
s = s.replace(oldC, newC, 1)

oldD = "  route();\n  window.addEventListener('hashchange', function () { route(); });"
newD = "  applyTheme(getTheme());\n  route();\n  window.addEventListener('hashchange', function () { route(); });"
assert s.count(oldD) == 1, ('D', s.count(oldD))
s = s.replace(oldD, newD, 1)

open(p, 'w', encoding='utf-8', newline='').write(s)
print('APPLIED theme patches; len', len(s))
