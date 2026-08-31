# 安全策略 Security Policy

## 报告漏洞

如果你发现了安全漏洞，请**不要**通过公开的 GitHub Issue 报告。

请通过以下方式私信联系维护者，我们会尽快处理：

- GitHub: [@kejiland](https://github.com/kejiland)

## 安全措施

本项目内置多层安全防护：

| 层 | 机制 |
|---|---|
| 密码存储 | PBKDF2-SHA256 加盐哈希（100,000 次迭代） |
| 会话管理 | 随机 Token，7 天有效期 |
| 限流 | 同一 IP 连续失败 5 次锁定 15 分钟 |
| 文章加密 | PBKDF2 + AES-GCM 端到端加密 |
| 评论安全 | XSS 转义 + SQL 注入参数化 + 频率限制 |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please contact the maintainer directly via GitHub: [@kejiland](https://github.com/kejiland).

We will respond as quickly as possible and coordinate a fix before public disclosure.
