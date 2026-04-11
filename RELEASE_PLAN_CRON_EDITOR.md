# Cron 编辑器发布计划

**发布版本**: v0.3.0  
**计划发布日期**: 2026-04-12  
**发布经理**: 发布经理 📦  
**文档创建时间**: 2026-04-12 02:20

---

## 1. 发布策略

### 1.1 灰度发布策略

| 阶段 | 流量比例 | 用户群体 | 观察时间 | 成功标准 |
|------|---------|---------|---------|---------|
| 第一阶段 | 5% | 内部测试用户 | 2 小时 | 错误率<0.1%, 无 P0 问题 |
| 第二阶段 | 20% | 早期采用者 | 4 小时 | 错误率<0.5%, 用户反馈积极 |
| 第三阶段 | 50% | 全部用户的一半 | 8 小时 | 错误率<1%, 核心功能正常 |
| 第四阶段 | 100% | 全部用户 | 持续 | 监控指标正常 |

**灰度发布步骤**:
```bash
# 1. 部署新版本到灰度环境
git checkout v0.3.0
npm ci && npm run build
pm2 restart openclaw-admin --update-env

# 2. 配置 Nginx 灰度规则 (按用户 ID 或 Cookie)
# 在 nginx.conf 中添加:
if ($http_cookie ~* "gray_group=1") {
    set $backend gray_backend;
}

# 3. 监控关键指标
# - 错误率 (5xx)
# - 响应时间 (P95 < 1s)
# - 用户反馈
```

### 1.2 蓝绿部署方案

**环境配置**:
- **蓝色环境**: 当前生产环境 (v0.2.6)
- **绿色环境**: 新版本环境 (v0.3.0)

**切换流程**:
```bash
# 1. 准备绿色环境
cd /www/wwwroot/ai-work-green
git pull origin main
npm ci
npm run build
pm2 start openclaw-admin --name "openclaw-admin-green"

# 2. 健康检查
curl http://localhost:3001/api/health

# 3. 流量切换 (Nginx)
# 修改 nginx.conf upstream 指向绿色环境
upstream backend {
    server 127.0.0.1:3001;  # 绿色环境
}

# 4. 验证切换
curl -I https://your-domain.com/api/health

# 5. 保留蓝色环境 24 小时作为回滚备用
```

---

## 2. 回滚方案

### 2.1 快速回滚 (5 分钟内)

```bash
# 1. 立即停止新版本
pm2 stop openclaw-admin

# 2. 回滚代码
cd /www/wwwroot/ai-work
git checkout v0.2.6

# 3. 清理并重启
rm -rf dist node_modules/.vite
npm ci
npm run build
pm2 restart openclaw-admin

# 4. 验证
curl http://localhost:3000/api/health
```

### 2.2 数据库回滚

```bash
# 1. 恢复数据库备份
cp /backup/data/openclaw.db.$(date -d 'yesterday' +%Y%m%d) /www/wwwroot/ai-work/data/openclaw.db

# 2. 或执行迁移回滚
npm run migrate:rollback -- --steps=1
```

### 2.3 回滚决策矩阵

| 问题类型 | 严重程度 | 响应时间 | 行动 |
|---------|---------|---------|------|
| 服务完全不可用 | P0 | 立即 | 触发快速回滚 |
| 数据丢失/损坏 | P0 | 5 分钟内 | 回滚 + 数据恢复 |
| 核心功能失效 | P1 | 15 分钟内 | 评估后回滚 |
| 安全漏洞 | P0 | 立即 | 紧急回滚 + 安全修复 |
| 非核心功能异常 | P2 | 1 小时内 | 观察或热修复 |

---

## 3. 发布检查清单

### 3.1 发布前检查 (Pre-release)

- [x] ✅ 所有 P0/P1 功能开发完成
- [x] ✅ 代码审查通过 (2 人以上)
- [x] ✅ 单元测试覆盖率 > 80%
- [x] ✅ 集成测试全部通过
- [x] ✅ 安全测试通过 (0 高危漏洞)
- [x] ✅ 性能测试达标 (P95 < 1s)
- [ ] ⏳ GitHub Secrets 配置完成
- [ ] ⏳ 数据库备份完成
- [ ] ⏳ 通知团队准备发布

### 3.2 发布中检查 (During-release)

- [ ] ⏳ 创建 Git Tag v0.3.0
- [ ] ⏳ 更新 package.json 版本号
- [ ] ⏳ 更新 CHANGELOG.md
- [ ] ⏳ 部署到生产环境
- [ ] ⏳ 健康检查通过
- [ ] ⏳ Smoke 测试通过
- [ ] ⏳ 监控指标正常

### 3.3 发布后检查 (Post-release)

- [ ] ⏳ 监控错误日志 (24 小时)
- [ ] ⏳ 用户反馈收集
- [ ] ⏳ 性能指标监控
- [ ] ⏳ 更新飞书多维表格状态
- [ ] ⏳ 发布总结报告

---

## 4. 版本号和变更日志规范

### 4.1 版本号规则 (SemVer 2.0.0)

```
主版本号。次版本号.修订号
MAJOR.MINOR.PATCH
```

| 类型 | 触发条件 | 示例 |
|------|---------|------|
| **MAJOR** | 不兼容的 API 修改 | 0.2.6 → 1.0.0 |
| **MINOR** | 向下兼容的功能新增 | 0.2.6 → 0.3.0 |
| **PATCH** | 向下兼容的问题修正 | 0.2.6 → 0.2.7 |

**预发布版本**:
- 开发版：`0.3.0-dev`
- 测试版：`0.3.0-beta.1`
- 候选版：`0.3.0-rc.1`
- 正式版：`0.3.0`

### 4.2 变更日志格式 (CHANGELOG.md)

```markdown
## [0.3.0] - 2026-04-12

### Added
- 多用户支持和 RBAC 权限控制
- 实时通知中心
- 备份管理功能
- Cron 可视化编辑器

### Fixed
- 修复 TypeScript 构建错误
- 修复 tar 包路径遍历漏洞

### Changed
- 优化 Dashboard 性能
- 更新依赖版本

### Deprecated
- 移除旧的 Session 管理 API

### Removed
- 删除调试代码

### Security
- 修复 sqlite3 SQL 注入风险
- 添加 CORS 白名单配置
```

### 4.3 提交信息规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 列表**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:
```bash
feat(auth): 添加多用户登录功能

实现基于 JWT 的认证机制，支持多用户并发登录

Closes #123
```

---

## 5. 本次发布内容

### 5.1 新增功能

#### P0 - 核心功能
1. **Cron 可视化编辑器**
   - 可视化 Cron 表达式配置
   - 实时预览执行时间
   - 支持常用预设模板

2. **多用户支持**
   - 用户注册/登录/Session 管理
   - 密码加密存储 (PBKDF2 + SHA-512)
   - Token 认证机制 (Bearer Token)

3. **RBAC 权限控制**
   - 三种角色：admin / operator / readonly
   - 细粒度权限控制
   - 权限检查中间件

#### P1 - 重要功能
4. **通知中心**
   - 实时消息通知
   - 通知分级 (info/warn/error/success)
   - 未读计数提醒

5. **备份管理**
   - 自动备份调度
   - 备份文件管理
   - 一键恢复功能

### 5.2 修复问题

| 问题 ID | 描述 | 优先级 |
|--------|------|--------|
| TS-001 | TypeScript 构建报错 | P0 |
| TS-002 | DOMPurify SSR 兼容性问题 | P0 |
| SEC-001 | tar 包路径遍历漏洞 | 高危 |
| SEC-002 | sqlite3 SQL 注入风险 | 高危 |

---

## 6. 监控与告警

### 6.1 关键指标监控

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| 服务可用性 | < 99% | 警告 |
| 响应时间 | > 1s | 警告 |
| 错误率 | > 1% | 严重 |
| CPU 使用率 | > 80% | 警告 |
| 内存使用率 | > 85% | 警告 |

### 6.2 健康检查端点

```bash
# 健康检查
GET /api/health

# 就绪检查
GET /api/ready

# 存活检查
GET /api/live
```

---

## 7. 发布团队联系

| 角色 | 人员 | 联系方式 |
|------|------|---------|
| 发布经理 | 发布经理 | - |
| 开发负责人 | 系统架构师 | - |
| 测试负责人 | QA 工程师 | - |
| 运维支持 | 运维工程师 | - |

---

**文档版本**: 1.0  
**最后更新**: 2026-04-12 02:20  
**文档状态**: ✅ 已发布  
**发布经理**: 📦 发布经理
