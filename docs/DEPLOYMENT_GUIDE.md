# OpenClaw-Admin 部署指南

> **文档版本**: v1.0  
> **最后更新**: 2026-04-11  
> **维护者**: 技术文档工程师

---

## 概述

本文档介绍 OpenClaw-Admin 的部署流程，包括生产环境部署、CI/CD 配置和运维监控。

---

## 系统要求

### 硬件要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核心 | 4 核心 |
| 内存 | 2GB | 4GB |
| 磁盘 | 10GB | 50GB SSD |

### 软件要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git >= 2.0
- 操作系统：Linux (Ubuntu 20.04+ / CentOS 8+)

---

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/itq5/OpenClaw-Admin.git
cd OpenClaw-Admin
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_APP_TITLE=OpenClaw Admin
OPENCLAW_WS_URL=ws://localhost:18789
OPENCLAW_AUTH_TOKEN=your_token_here
OPENCLAW_AUTH_PASSWORD=
PORT=3000
DEV_PORT=3001
DEV_FRONTEND_URL=http://localhost:3000
AUTH_USERNAME=admin
AUTH_PASSWORD=admin
LOG_LEVEL=INFO
```

### 4. 构建项目

```bash
npm run build
```

### 5. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run start
```

---

## 生产环境部署

### Nginx 配置

创建 `/etc/nginx/sites-available/openclaw-admin`：

```nginx
server {
    listen 80;
    server_name admin.example.com;

    # 前端静态文件
    location / {
        root /var/www/openclaw-admin/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

启用配置：
```bash
ln -s /etc/nginx/sites-available/openclaw-admin /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Systemd 服务配置

创建 `/etc/systemd/system/openclaw-admin.service`：

```ini
[Unit]
Description=OpenClaw Admin Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/openclaw-admin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
systemctl daemon-reload
systemctl enable openclaw-admin
systemctl start openclaw-admin
systemctl status openclaw-admin
```

---

## Docker 部署

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "server/index.js"]
```

### Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  openclaw-admin:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENCLAW_WS_URL=ws://gateway:18789
      - AUTH_USERNAME=admin
      - AUTH_PASSWORD=${ADMIN_PASSWORD}
    volumes:
      - ./data:/app/data
    depends_on:
      - gateway
    restart: unless-stopped

  gateway:
    image: openclaw/gateway:latest
    ports:
      - "18789:18789"
    volumes:
      - ./gateway-data:/data
    restart: unless-stopped
```

启动：
```bash
docker-compose up -d
```

---

## CI/CD 部署

### GitHub Actions 配置

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /var/www/openclaw-admin
            git pull
            npm ci
            npm run build
            systemctl restart openclaw-admin
```

### 配置 Secrets

在 GitHub 仓库设置中配置以下 Secrets：
- `DEPLOY_HOST`: 服务器地址
- `DEPLOY_USER`: 部署用户名
- `DEPLOY_SSH_KEY`: SSH 私钥

---

## 监控与日志

### 日志配置

日志文件位置：`/var/log/openclaw-admin/`

查看日志：
```bash
# 实时查看
tail -f /var/log/openclaw-admin/app.log

# 查看错误日志
grep ERROR /var/log/openclaw-admin/app.log

# 查看最近 100 行
tail -n 100 /var/log/openclaw-admin/app.log
```

### 健康检查

健康检查端点：`GET /api/health`

```bash
curl http://localhost:3000/api/health
```

响应：
```json
{
  "ok": true,
  "status": "healthy",
  "uptime": 86400,
  "version": "0.2.6"
}
```

### Prometheus 监控

在 `server/index.js` 中添加监控中间件：

```javascript
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

---

## 备份与恢复

### 数据备份

重要数据目录：
- `data/` - SQLite 数据库
- `.env` - 环境变量配置

备份脚本 `scripts/backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/backup/openclaw-admin"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp data/admin.db $BACKUP_DIR/admin_$TIMESTAMP.db

# 备份配置文件
cp .env $BACKUP_DIR/env_$TIMESTAMP

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
```

### 数据恢复

```bash
# 停止服务
systemctl stop openclaw-admin

# 恢复数据库
cp /backup/openclaw-admin/admin_20260411_120000.db data/admin.db

# 恢复配置
cp /backup/openclaw-admin/env_20260411_120000 .env

# 启动服务
systemctl start openclaw-admin
```

---

## 故障排查

### 常见问题

#### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

#### 2. 数据库锁定

```bash
# 检查数据库文件
ls -la data/admin.db

# 修复数据库
sqlite3 data/admin.db "VACUUM;"
```

#### 3. WebSocket 连接失败

检查 Gateway 服务状态：
```bash
curl http://localhost:18789/health
```

#### 4. 内存不足

```bash
# 查看内存使用
free -h

# 调整 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

## 安全加固

### 1. 防火墙配置

```bash
# 只允许必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. HTTPS 配置

使用 Let's Encrypt 获取证书：

```bash
certbot --nginx -d admin.example.com
```

### 3. 定期更新

```bash
# 更新依赖
npm update

# 更新系统
apt update && apt upgrade -y
```

---

## 附录

### A. 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_APP_TITLE` | 应用标题 | OpenClaw Admin |
| `OPENCLAW_WS_URL` | Gateway WebSocket 地址 | ws://localhost:18789 |
| `OPENCLAW_AUTH_TOKEN` | Gateway 认证 Token | - |
| `PORT` | 服务端口 | 3000 |
| `AUTH_USERNAME` | 管理员用户名 | admin |
| `AUTH_PASSWORD` | 管理员密码 | admin |
| `LOG_LEVEL` | 日志级别 | INFO |

### B. 默认账号

- 用户名：`admin`
- 密码：`admin`（首次登录后请修改）

---

**文档结束**

*📝 技术文档工程师 出品*
