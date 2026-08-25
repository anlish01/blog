-- ============================================================
-- 轻语博客 · D1 数据库结构（v1）
-- ------------------------------------------------------------
-- 用法：
--   wrangler d1 execute blog --remote --file=migrations/0001_init.sql
-- （blog 为 D1 数据库名；database_id 通过 GitHub Secret BLOG_D1_ID 注入）
--
-- 说明：索引与查询均走 D1（SQLite），取代原 KV 单 key 存储。
-- 文章表为「逐篇一行」；评论 / 统计 / 管理员认证各为其表。
-- ============================================================

-- 文章
CREATE TABLE IF NOT EXISTS posts (
  id       TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  date     TEXT DEFAULT '',
  excerpt  TEXT DEFAULT '',
  content  TEXT DEFAULT '',
  cover    TEXT DEFAULT '',       -- 封面图 URL（列表卡片右侧缩略图）
  pinned   INTEGER DEFAULT 0,
  protected INTEGER DEFAULT 0,
  enc      TEXT,            -- 加密文章：JSON({salt,iv,data})；明文文章为 NULL
  tags     TEXT,            -- JSON 数组字符串，如 '["技术","随笔"]'
  category TEXT DEFAULT '',  -- 分类（单分类，后台管理 UI 使用）
  status   TEXT DEFAULT 'published', -- 发布状态：published（已发布）/ draft（草稿）
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);

-- 评论（每篇文章多条）
CREATE TABLE IF NOT EXISTS comments (
  id      TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author  TEXT DEFAULT '',
  content TEXT DEFAULT '',
  date    TEXT DEFAULT '',
  status  TEXT DEFAULT 'approved' -- 审核状态：approved（已通过）/ pending（待审核）
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- 阅读数 / 点赞
CREATE TABLE IF NOT EXISTS stats (
  post_id TEXT PRIMARY KEY,
  likes   INTEGER DEFAULT 0,
  views   INTEGER DEFAULT 0
);

-- 管理员认证（仅一行，k='auth'）
CREATE TABLE IF NOT EXISTS admin_auth (
  k     TEXT PRIMARY KEY,
  salt  TEXT DEFAULT '',
  hash  TEXT DEFAULT '',
  iter  INTEGER DEFAULT 100000
);

-- 登录会话 token
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  exp   INTEGER DEFAULT 0
);

-- 登录失败限流（按 IP）
CREATE TABLE IF NOT EXISTS admin_fails (
  ip    TEXT PRIMARY KEY,
  n     INTEGER DEFAULT 0,
  until INTEGER DEFAULT 0
);
