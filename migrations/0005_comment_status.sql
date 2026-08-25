-- 评论补充字段：审核状态(status)
-- 为已存在部署的 comments 表补列（新部署已含于 0001_init.sql，此脚本幂等）。
-- deploy.yml 中对该脚本做了「列已存在即忽略」处理（与 0003 同源）。
ALTER TABLE comments ADD COLUMN status TEXT DEFAULT 'approved';
