# OpenClaw-Admin 项目架构设计报告

**项目**: OpenClaw-Admin Cron 可视化编辑器  
**设计阶段**: 系统架构设计  
**报告时间**: 2026-04-12  
**作者**: 系统架构师 Agent  
**版本**: v2.0 (完整架构设计版)

---

## 📊 执行摘要

本文档完成了 OpenClaw-Admin 项目的完整架构设计，涵盖以下核心模块：

1. ✅ **批量操作模块** - 支持多选、批量删除/更新/导出/分配
2. ✅ **智能搜索模块** - 全局搜索、高级筛选、搜索历史
3. ✅ **配置备份模块** - 自动/手动备份、一键恢复、版本管理

所有模块已完成架构设计、接口规范、数据库设计和实施计划。

---

## 1. 项目整体架构

### 1.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端** | Vue 3 + Naive UI + TypeScript | 现代化前端框架 |
| **后端** | Express.js + JavaScript | 轻量级 REST API |
| **数据库** | SQLite (better-sqlite3) | 嵌入式数据库 |
| **状态管理** | Pinia | Vue 3 官方状态管理 |
| **构建工具** | Vite | 快速开发构建 |
| **测试框架** | Vitest + Playwright | 单元测试+E2E 测试 |
| **定时任务** | cron-parser | Cron 表达式解析 |
| **文件压缩** | archiver | ZIP 压缩/解压 |

### 1.2 项目结构

```
/www/wwwroot/ai-work/
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/       # 组件
│   │   │   ├── batch/        # 批量操作组件
│   │   │   ├── search/       # 搜索组件
│   │   │   └── backup/       # 备份组件
│   │   ├── views/            # 页面
│   │   ├── stores/           # 状态管理
│   │   └── composables/      # 组合式函数
│   └── ...
├── backend/                  # 后端代码
│   ├── src/
│   │   ├── routes/           # 路由
│   │   │   ├── batch.routes.js
│   │   │   ├── search.routes.js
│   │   │   └── backup.routes.js
│   │   ├── services/         # 服务层
│   │   ├── controllers/      # 控制器
│   │   └── middleware/       # 中间件
│   └── ...
├── architecture/             # 架构设计文档
│   ├── BATCH_OPERATION_ARCHITECTURE.md
│   ├── SMART_SEARCH_ARCHITECTURE.md
│   └── CONFIG_BACKUP_ARCHITECTURE.md
├── docs/                     # 文档
├── tests/                    # 测试
└── ...
```

---

## 2. 模块详细设计

### 2.1 批量操作模块

**设计文档**: `architecture/BATCH_OPERATION_ARCHITECTURE.md`

**核心功能**:
- 多选记录（复选框）
- 批量删除/状态变更/导出/分配
- 二次确认机制
- 操作上限 100 条
- 操作日志记录

**API 接口**:
```
DELETE   /api/batch/:resource          - 批量删除
PATCH    /api/batch/:resource/status   - 批量更新状态
POST     /api/batch/:resource/export   - 批量导出
PATCH    /api/batch/:resource/assign   - 批量分配
```

**状态**: ✅ 后端 API 已完成，前端组件待开发

---

### 2.2 智能搜索模块

**设计文档**: `architecture/SMART_SEARCH_ARCHITECTURE.md`

**核心功能**:
- 全局搜索（跨资源类型）
- 高级筛选（多条件组合）
- 搜索结果高亮
- 搜索历史保存
- 搜索建议

**技术实现**:
- SQLite FTS5 全文索引
- BM25 相关性评分
- 关键词高亮

**API 接口**:
```
POST /api/search/global          - 全局搜索
POST /api/search/advanced        - 高级搜索
GET  /api/search/suggestions     - 搜索建议
GET/POST/DELETE /api/search/history - 搜索历史
```

**状态**: ⏳ 待开发

---

### 2.3 配置备份模块

**设计文档**: `architecture/CONFIG_BACKUP_ARCHITECTURE.md`

**核心功能**:
- 手动备份
- 自动备份（每日/每周/每月）
- 一键恢复
- 备份下载/删除
- 备份策略配置

**备份范围**:
- 数据库数据
- 配置文件（.env, config/*.yaml）
- Cron 任务配置
- 用户权限配置

**API 接口**:
```
POST /api/backup/create          - 创建备份
GET  /api/backup/list            - 备份列表
GET  /api/backup/:id/download    - 下载备份
POST /api/backup/:id/restore     - 恢复备份
DELETE /api/backup/:id           - 删除备份
GET/PUT /api/backup/strategies   - 备份策略
```

**状态**: ⏳ 待开发

---

## 3. 数据库设计

### 3.1 核心表结构

| 表名 | 用途 | 状态 |
|------|------|------|
| `tasks` | 任务配置 | ✅ 已存在 |
| `users` | 用户管理 | ✅ 已存在 |
| `audit_logs` | 审计日志 | ✅ 已存在 |
| `sessions` | 会话管理 | ✅ 已存在 |
| `backup_records` | 备份记录 | ⏳ 待创建 |
| `backup_strategies` | 备份策略 | ⏳ 待创建 |
| `restore_records` | 恢复记录 | ⏳ 待创建 |
| `search_history` | 搜索历史 | ⏳ 待创建 |
| `batch_operation_logs` | 批量操作日志 | ⏳ 建议创建 |
| `search_index` (FTS5) | 全文索引 | ⏳ 待创建 |

### 3.2 新增表 SQL

详见各模块架构设计文档。

---

## 4. 安全设计

### 4.1 权限控制 (RBAC)

| 模块 | 操作 | 权限名称 |
|------|------|----------|
| 批量操作 | 删除 | `*:delete` |
| 批量操作 | 更新状态 | `*:update` |
| 批量操作 | 导出 | `*:export` |
| 批量操作 | 分配 | `tasks:assign` |
| 搜索 | 搜索 | `search:read` |
| 备份 | 创建 | `backup:create` |
| 备份 | 恢复 | `backup:restore` |
| 备份 | 删除 | `backup:delete` |
| 备份 | 配置 | `backup:configure` |

### 4.2 安全措施

1. **输入验证**: 所有 API 参数使用 express-validator
2. **SQL 注入防护**: 参数化查询
3. **XSS 防护**: 输出转义，DOMPurify 清理
4. **CSRF 防护**: Token 验证
5. **速率限制**: express-rate-limit
6. **日志审计**: 所有关键操作记录审计日志

---

## 5. 性能优化

### 5.1 数据库优化

- FTS5 全文索引提升搜索性能
- 复合索引优化筛选查询
- 分页查询避免全表扫描

### 5.2 前端优化

- 虚拟滚动支持大量数据展示
- 搜索/备份结果懒加载
- 组件按需加载

### 5.3 后端优化

- 批量操作事务保证
- 大文件流式处理
- 缓存热点数据

---

## 6. 实施计划

### Phase 1: 批量操作前端 (本周)
- [ ] BatchOperationBar 组件
- [ ] BatchConfirmDialog 组件
- [ ] useBatchSelection Hook
- [ ] 集成到现有页面

### Phase 2: 智能搜索 (下周)
- [ ] 后端 search.routes.js
- [ ] 后端 search.service.js
- [ ] FTS5 索引创建
- [ ] 前端搜索组件

### Phase 3: 配置备份 (下下周)
- [ ] 后端 backup.routes.js
- [ ] 后端 backup.service.js
- [ ] 定时任务调度
- [ ] 前端备份管理页面

### Phase 4: 联调测试 (后续)
- [ ] 模块间联调
- [ ] E2E 测试
- [ ] 性能测试
- [ ] 安全测试

---

## 7. 风险评估

| 风险项 | 等级 | 影响 | 缓解措施 |
|--------|------|------|----------|
| 批量操作性能 | 中 | 大批量操作超时 | 异步任务队列，操作上限 |
| 搜索性能 | 中 | 大数据量搜索慢 | FTS5 索引，定期优化 |
| 备份恢复风险 | 高 | 恢复失败导致数据丢失 | 恢复前验证，恢复点备份 |
| 权限漏洞 | 高 | 越权操作 | 严格 RBAC，审计日志 |

---

## 8. 架构决策记录

### ADR-001: 批量操作同步/异步策略

**决策**: 小于 50 条同步处理，超过 50 条提示确认，超过 100 条建议使用异步

### ADR-002: 搜索技术选型

**决策**: 使用 SQLite FTS5 而非 Elasticsearch，降低部署复杂度

### ADR-003: 备份存储方案

**决策**: 本地文件存储 + 数据库元数据，支持未来扩展远程存储

---

## 9. 文档清单

| 文档 | 路径 | 状态 |
|------|------|------|
| 批量操作架构 | `architecture/BATCH_OPERATION_ARCHITECTURE.md` | ✅ 完成 |
| 智能搜索架构 | `architecture/SMART_SEARCH_ARCHITECTURE.md` | ✅ 完成 |
| 配置备份架构 | `architecture/CONFIG_BACKUP_ARCHITECTURE.md` | ✅ 完成 |
| 数据库设计 | `DB_SCHEMA.md` | ✅ 完成 |
| 架构设计报告 | `ARCHITECTURE_DESIGN_REPORT.md` | ✅ 完成 |

---

## 10. 下一步行动

1. ✅ 架构设计文档已完成
2. ⏳ 更新 HEARTBEAT.md 文件
3. ⏳ 更新飞书多维表格状态
4. ⏳ 传递给开发团队实施

---

**报告人**: 系统架构师 Agent  
**报告日期**: 2026-04-12  
**下次评审**: 批量操作前端完成后

---

> ✅ **架构设计阶段完成!**
> 
> 📊 **设计模块**: 批量操作、智能搜索、配置备份
> 
> 📄 **输出文档**: 4 份架构设计文档 + 1 份设计报告
> 
> 🎯 **下一步**: 开发团队启动实施
