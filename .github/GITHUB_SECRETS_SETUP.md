# GitHub Secrets 配置指南

## 概述

本文档描述如何在 GitHub 仓库中配置 Secrets，用于 CI/CD 流水线的安全凭证管理。

## 需要配置的 Secrets

### 1. 部署相关 Secrets

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `DEPLOY_SSH_KEY` | SSH 私钥（用于部署到服务器） | 见下方生成步骤 |
| `DEPLOY_USER` | 部署用户名 | `root` 或自定义用户 |
| `DEPLOY_HOST` | 服务器 IP/域名 | 如 `192.168.1.100` |
| `DEPLOY_PORT` | SSH 端口（可选） | 默认 `22` |
| `DEPLOY_PATH` | 部署路径 | `/www/wwwroot/ai-work` |

### 2. 数据库相关 Secrets

| Secret 名称 | 说明 |
|------------|------|
| `DB_HOST` | 数据库主机地址 |
| `DB_PORT` | 数据库端口（默认 3306） |
| `DB_USER` | 数据库用户名 |
| `DB_PASSWORD` | 数据库密码 |
| `DB_NAME` | 数据库名称 |
| `DB_SSL` | 是否启用 SSL（true/false） |

### 3. Redis 缓存 Secrets

| Secret 名称 | 说明 |
|------------|------|
| `REDIS_HOST` | Redis 主机地址 |
| `REDIS_PORT` | Redis 端口（默认 6379） |
| `REDIS_PASSWORD` | Redis 密码（如有） |
| `REDIS_DB` | Redis 数据库编号（默认 0） |

### 4. API 密钥 Secrets

| Secret 名称 | 说明 |
|------------|------|
| `API_SECRET_KEY` | API 签名密钥 |
| `JWT_SECRET` | JWT 令牌密钥 |
| `ENCRYPTION_KEY` | 数据加密密钥 |

### 5. 监控告警 Secrets

| Secret 名称 | 说明 |
|------------|------|
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook URL |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL（可选） |
| `PROMETHEUS_URL` | Prometheus 访问地址 |
| `GRAFANA_URL` | Grafana 访问地址 |
| `GRAFANA_API_KEY` | Grafana API 密钥 |

### 6. 其他 Secrets

| Secret 名称 | 说明 |
|------------|------|
| `NODE_ENV` | 运行环境（production/development） |
| `LOG_LEVEL` | 日志级别（info/warn/error/debug） |
| `APP_URL` | 应用访问 URL |

---

## SSH 密钥生成步骤

### 1. 生成 SSH 密钥对

```bash
# 在项目根目录执行
ssh-keygen -t ed25519 -C "github-actions-deploy@ai-work" -f .github/deploy_key -N ""

# 或使用 RSA（兼容性更好）
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy@ai-work" -f .github/deploy_key -N ""
```

### 2. 将公钥添加到服务器

```bash
# 方式 1: 使用 ssh-copy-id（推荐）
ssh-copy-id -i .github/deploy_key.pub root@YOUR_SERVER_IP

# 方式 2: 手动添加
cat .github/deploy_key.pub | ssh root@YOUR_SERVER_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. 将私钥添加到 GitHub Secrets

```bash
# 读取私钥内容
cat .github/deploy_key

# 复制输出内容，在 GitHub 仓库 Settings → Secrets and variables → Actions → New repository secret 中添加
# Name: DEPLOY_SSH_KEY
# Value: （粘贴私钥内容，包含 -----BEGIN OPENSSH PRIVATE KEY----- 开头和结尾）
```

---

## GitHub Secrets 配置步骤

### 方式 1: GitHub Web 界面

1. 打开 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 填写 Name 和 Value
5. 点击 **Add secret**

### 方式 2: 使用 GitHub CLI

```bash
# 安装 gh CLI（如未安装）
# macOS: brew install gh
# Linux: 参考 https://cli.github.com/

# 登录 GitHub
gh auth login

# 添加 Secret
echo "your-secret-value" | gh secret set SECRET_NAME

# 示例
echo "$SSH_PRIVATE_KEY" | gh secret set DEPLOY_SSH_KEY
echo "root" | gh secret set DEPLOY_USER
echo "192.168.1.100" | gh secret set DEPLOY_HOST
```

### 方式 3: 使用 GitHub API

```bash
# 获取公钥 ID
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/secrets/public-key

# 加密并上传 Secret（需要 libsodium）
# 参考：https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
```

---

## 验证 Secrets 配置

### 在工作流中使用 Secrets

```yaml
# .github/workflows/test-secrets.yml
name: Test Secrets

on:
  workflow_dispatch:  # 手动触发

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test SSH Key
        run: |
          echo "SSH Key configured: ${{ secrets.DEPLOY_SSH_KEY != '' }}"
          
      - name: Test Database
        run: |
          echo "DB Host: ${{ secrets.DB_HOST }}"
          echo "DB User: ${{ secrets.DB_USER }}"
          # 注意：Secrets 在日志中会自动隐藏
```

### 检查配置完整性

运行验证脚本：

```bash
./scripts/verify-secrets.sh
```

---

## 安全最佳实践

### 1. 密钥管理

- ✅ 使用强密码生成工具生成密钥
- ✅ 定期轮换 SSH 密钥（建议每 90 天）
- ✅ 不同环境使用不同密钥
- ❌ 不要将密钥提交到代码仓库
- ❌ 不要在日志中打印密钥

### 2. 权限最小化

- 创建专用的部署用户（非 root）
- 限制部署用户的目录访问权限
- 使用 SSH 密钥限制（from=,command=）

### 3. 环境隔离

```bash
# 开发环境
DEPLOY_HOST=dev.example.com
DB_HOST=dev-db.example.com

# 生产环境
DEPLOY_HOST=prod.example.com
DB_HOST=prod-db.example.com
```

### 4. 审计日志

- 记录 Secret 的创建/修改时间
- 监控异常的 Secret 访问
- 定期审查 Secret 使用情况

---

## 故障排查

### 问题 1: SSH 连接被拒绝

```bash
# 检查密钥权限
chmod 600 .github/deploy_key

# 测试连接
ssh -i .github/deploy_key -v root@YOUR_SERVER_IP
```

### 问题 2: Secret 未生效

- 检查工作流是否引用了正确的 Secret 名称
- 确认 Secret 已添加到正确的环境（Repository/Environment）
- 查看工作流日志确认 Secret 是否被正确读取

### 问题 3: 数据库连接失败

```bash
# 测试数据库连接
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD

# 检查 Redis 连接
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

---

## 附录：Secrets 模板文件

```bash
# .github/secrets-template.env
DEPLOY_SSH_KEY=
DEPLOY_USER=root
DEPLOY_HOST=
DEPLOY_PORT=22
DEPLOY_PATH=/www/wwwroot/ai-work

DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=ai_work
DB_SSL=false

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

API_SECRET_KEY=
JWT_SECRET=
ENCRYPTION_KEY=

FEISHU_WEBHOOK_URL=
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3002
GRAFANA_API_KEY=

NODE_ENV=production
LOG_LEVEL=info
APP_URL=https://ai-work.example.com
```

---

*最后更新：2026-04-12*  
*版本：1.0*
