/* ============================================================
 * 轻语博客 · 部署配置
 * ------------------------------------------------------------
 * mode 可选：
 *   'auto'   （推荐）自动检测：请求 /api/posts 成功 → 云端模式；
 *            失败（file:// 本地打开 / 纯静态托管）→ 静态模式。
 *   'static' 强制静态模式（只用 posts.js + 导出发布）。
 *   'api'    强制云端模式（需要后端：Cloudflare Pages Functions 或 Workers）。
 * apiBase：后端 API 基础地址。留空表示同源（Cloudflare 部署默认）；
 *          也可填如 https://xxx.workers.dev（跨域时后端已带 CORS 头）。
 * siteUrl ：站点对外地址（用于生成 RSS/Sitemap 链接），如 https://blog.example.com；
 *          留空时后端自动取请求来源、前端取页面来源。
 *
 * 路由（真实路径，无 hash）：
 *   首页 / · 归档 /archive · 关于 /about · 标签 /tags · 后台 /admin 或 /write
 *   文章  /posts/<文章别名>/   编辑  /posts/<文章别名>/edit
 * 即文章地址形如 https://blog.example.com/posts/article-title/ 。
 * 部署要求：站点根目录直接服务本 public/ 内容（不要带 /public 前缀）；
 * 本地 file:// 双击 index.html 自动退化为主页可用。
 * ------------------------------------------------------------
 * writeToken：可选。若后端设置了 BLOG_WRITE_TOKEN 环境变量（写入令牌），
 *             这里填写同样的令牌，发布/更新/删除时会自动携带。
 *             也可以不填，改为在浏览器控制台执行：
 *               localStorage.setItem('qingyu.token', '你的令牌')
 * ------------------------------------------------------------
 * ads：广告位（按需启用，未启用完全不输出）。
 *   enabled: true      总开关
 *   belowSearch: ''    首页列表上方（搜索/标签下方）插入的代码
 *   between: ''        首页列表每隔 betweenEvery 篇插入一次的代码
 *   betweenEvery: 3    列表间隔篇数
 *   content: ''        文章详情底部插入的代码
 * 代码为原始 HTML/脚本（如 Google AdSense 的 <ins> 片段），自行保证安全；
 * 常见写法：<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-xxx" data-ad-slot="xxx"></ins>
 * ============================================================ */
window.BLOG_CONFIG = {
  mode: 'auto',
  apiBase: '',
  siteUrl: '',
  writeToken: '',
  /* 管理员门禁：写文章页访问密码（可选，两种模式二选一）。
   * 1) 在此填写固定密码（如 'my-secret'）：所有浏览器都用它验证；
   * 2) 留空：首次进入「写文章」会强制要求设置一个管理密码（≥4 位），
   *    密码保存在该浏览器本地；换浏览器则需重新设置。
   * 注意：这是前端门禁（防君子），真正的写权限由后端的 BLOG_WRITE_TOKEN 保证。
   *
   * 写文章入口（真实路径，无 hash）：
   *   https://blog.example.com/admin     （或 https://xxx.pages.dev/admin）
   *   https://blog.example.com/posts/<别名>/edit   （从文章页点「编辑」进入）
   * 本地双击 public/index.html 仍可用（file:// 自动退化为 #/ 内部路由）。 */
  adminPwd: '',

  /* 自定义导航（可选）：留空数组 = 默认（首页 / 标签 / 归档 / 关于）。
   * 支持二级下拉：children 数组；url 可填站内真实路径（/archive、/posts/x/ 等）
   * 或外链（https://…）；兼容旧写法 #/about。 */
  nav: [
    // { text: '首页', url: '/' },
    // { text: '更多', url: '/about', children: [
    //   { text: '写作', url: '/write' },
    //   { text: '示例外链', url: 'https://example.com' }
    // ]}
  ],

  /* 页脚（可选）：text 为自定义说明文字；links 为友情链接等（不再显示「本地/云端」标识）。
   *   icp：备案号（如 '沪ICP备12345678号'），会在页脚显示并链接到工信部备案查询。
   *   contact：联系方式一组（邮箱 / GitHub 等），显示在 RSS 后方。 */
  footer: {
    text: '',
    icp: '',
    contact: [
      // { text: 'GitHub', url: 'https://github.com/yourname' },
      // { text: '邮箱', url: 'mailto:you@example.com' }
    ],
    links: [
      // { text: '友情链接', url: 'https://example.com' }
    ]
  },

  ads: {
    enabled: false,
    belowSearch: '',
    between: '',
    betweenEvery: 3,
    content: ''
  }
};