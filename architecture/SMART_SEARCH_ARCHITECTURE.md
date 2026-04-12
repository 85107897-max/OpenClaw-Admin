# 智能搜索与筛选系统 - 架构设计文档

**项目**: OpenClaw-Admin  
**文档版本**: v1.0  
**创建时间**: 2026-04-12  
**作者**: 系统架构师 Agent  
**状态**: ✅ 已完成

---

## 📋 概述

本文档定义了 OpenClaw-Admin 平台智能搜索与筛选系统的完整架构方案，支持全局搜索、高级筛选、搜索历史等功能。

---

## 1. 功能需求

### 1.1 核心功能
| 功能 | 描述 | 优先级 |
|------|------|--------|
| 全局搜索 | 跨资源类型搜索（任务、用户、场景等） | P0 |
| 高级筛选 | 多条件组合筛选（状态、时间、负责人等） | P0 |
| 搜索结果高亮 | 关键词高亮显示 | P0 |
| 搜索历史 | 保存常用搜索条件 | P1 |
| 搜索建议 | 输入时自动提示 | P1 |
| 搜索结果排序 | 按相关性、时间、状态等排序 | P0 |

### 1.2 支持资源类型
- **tasks**: 任务管理
- **users**: 用户管理
- **scenarios**: 场景管理
- **cron-templates**: Cron 模板
- **audit-logs**: 审计日志
- **sessions**: 会话管理
- **backup-records**: 备份记录

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  GlobalSearchBar.vue (全局搜索栏)                    │   │
│  │  - 搜索输入框                                        │   │
│  │  - 搜索建议下拉                                      │   │
│  │  - 资源类型筛选                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AdvancedFilterPanel.vue (高级筛选面板)              │   │
│  │  - 多条件筛选器                                      │   │
│  │  - 日期范围选择                                      │   │
│  │  - 状态/负责人筛选                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SearchResults.vue (搜索结果列表)                    │   │
│  │  - 结果卡片展示                                      │   │
│  │  - 关键词高亮                                        │   │
│  │  - 分页加载                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Express.js)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  search.routes.js (路由层)                           │   │
│  │  - POST /api/search/global                          │   │
│  │  - POST /api/search/advanced                        │   │
│  │  - GET  /api/search/suggestions                     │   │
│  │  - GET/POST/DELETE /api/search/history              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  search.service.js (搜索服务层)                       │   │
│  │  - 全文检索逻辑                                      │   │
│  │  - 多条件筛选                                        │   │
│  │  - 结果排序与分页                                    │   │
│  │  - 关键词高亮生成                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SQLite Database (数据层)                            │   │
│  │  - 全文搜索索引 (FTS5)                               │   │
│  │  - search_history 表                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 接口规范

### 3.1 全局搜索

**请求**
```http
POST /api/search/global
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "定时任务",
  "resource_types": ["tasks", "cron-templates"],
  "page": 1,
  "page_size": 20,
  "sort_by": "relevance",
  "sort_order": "desc"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索关键词 |
| resource_types | array | 否 | 资源类型列表，不传则搜索所有类型 |
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20，最大 100 |
| sort_by | string | 否 | 排序字段 (relevance, created_at, updated_at) |
| sort_order | string | 否 | 排序方向 (asc, desc) |

**响应**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "page": 1,
    "page_size": 20,
    "results": [
      {
        "resource_type": "tasks",
        "resource_id": 123,
        "title": "定时备份任务",
        "snippet": "这是一个**定时**备份**任务**，每天执行...",
        "match_fields": ["title", "description"],
        "relevance_score": 0.95,
        "created_at": "2026-04-10T10:00:00Z",
        "status": "active"
      }
    ]
  }
}
```

---

### 3.2 高级搜索

**请求**
```http
POST /api/search/advanced
Content-Type: application/json
Authorization: Bearer <token>

{
  "filters": {
    "keyword": "备份",
    "resource_type": "tasks",
    "status": ["active", "paused"],
    "created_at": {
      "start": "2026-04-01T00:00:00Z",
      "end": "2026-04-12T23:59:59Z"
    },
    "assignee_id": "ou_xxx",
    "custom_fields": {
      "priority": "high"
    }
  },
  "page": 1,
  "page_size": 20,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| filters.keyword | string | 否 | 关键词 |
| filters.resource_type | string | 否 | 资源类型 |
| filters.status | array | 否 | 状态列表 |
| filters.created_at | object | 否 | 创建时间范围 |
| filters.assignee_id | string | 否 | 负责人 ID |
| filters.custom_fields | object | 否 | 自定义字段筛选 |

**响应**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 20,
    "results": [...]
  }
}
```

---

### 3.3 搜索建议

**请求**
```http
GET /api/search/suggestions?query=定时&resource_type=tasks
Authorization: Bearer <token>
```

**响应**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "定时任务",
      "定时备份",
      "定时清理"
    ]
  }
}
```

---

### 3.4 搜索历史

**获取搜索历史**
```http
GET /api/search/history
Authorization: Bearer <token>
```

**保存搜索历史**
```http
POST /api/search/history
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "我的高频任务搜索",
  "filters": {
    "resource_type": "tasks",
    "status": ["active"],
    "assignee_id": "ou_xxx"
  }
}
```

**删除搜索历史**
```http
DELETE /api/search/history/:id
Authorization: Bearer <token>
```

---

## 4. 数据库设计

### 4.1 全文搜索索引 (FTS5)

SQLite FTS5 用于全文检索：

```sql
-- 创建 FTS5 虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  content,
  title,
  description,
  resource_type,
  resource_id,
  tokenize='unicode61'
);

-- 创建触发器同步数据
CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO search_index (content, title, description, resource_type, resource_id)
  VALUES (NEW.description, NEW.name, NEW.description, 'tasks', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
  INSERT INTO search_index (search_index, rowid, content, title, description, resource_type, resource_id)
  VALUES ('delete', OLD.rowid, OLD.description, OLD.name, OLD.description, 'tasks', OLD.id);
END;
```

### 4.2 搜索历史表

```sql
CREATE TABLE IF NOT EXISTS search_history (
    id            TEXT    PRIMARY KEY,
    user_id       TEXT    NOT NULL,
    name          TEXT,
    query         TEXT    NOT NULL,
    filters       TEXT    NOT NULL,  -- JSON 字符串
    resource_type TEXT,
    hit_count     INTEGER DEFAULT 0,
    last_used_at  INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_last_used ON search_history(last_used_at DESC);
```

---

## 5. 搜索算法

### 5.1 相关性评分

使用 SQLite FTS5 内置的 BM25 算法：

```javascript
// 后端搜索服务
function calculateRelevance(matchInfo, query) {
  const bm25Score = matchInfo.bm25;
  const fieldBoosts = {
    title: 3.0,      // 标题权重最高
    description: 1.5, // 描述次之
    content: 1.0     // 内容基础权重
  };
  
  // 计算加权分数
  let weightedScore = 0;
  for (const [field, boost] of Object.entries(fieldBoosts)) {
    if (matchInfo[field]) {
      weightedScore += matchInfo[field] * boost;
    }
  }
  
  return Math.min(1.0, Math.abs(bm25Score) * weightedScore / 10);
}
```

### 5.2 关键词高亮

```javascript
function highlightKeywords(text, keywords, className = 'search-highlight') {
  if (!text || !keywords) return text;
  
  const escapedKeywords = keywords
    .split(' ')
    .filter(k => k.trim())
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  if (escapedKeywords.length === 0) return text;
  
  const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  return text.replace(pattern, `<span class="${className}">$1</span>`);
}
```

---

## 6. 前端组件设计

### 6.1 组件结构

```
src/components/search/
├── GlobalSearchBar.vue       # 全局搜索栏
├── AdvancedFilterPanel.vue   # 高级筛选面板
├── SearchResults.vue         # 搜索结果列表
├── SearchResultCard.vue      # 单个结果卡片
├── SearchHistory.vue         # 搜索历史面板
└── hooks/
    ├── useSearch.ts          # 搜索逻辑 Hook
    └── useSearchSuggestions.ts # 搜索建议 Hook
```

### 6.2 状态管理

```typescript
// useSearch.ts
interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  
  search(query: string, filters?: SearchFilters): Promise<void>;
  nextPage(): Promise<void>;
  clearResults(): void;
  saveHistory(name: string): Promise<void>;
  loadHistory(id: string): Promise<void>;
}
```

---

## 7. 性能优化

### 7.1 索引优化

1. **FTS5 索引**: 为常用搜索字段创建全文索引
2. **复合索引**: 为筛选字段创建复合索引
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);
   ```

### 7.2 缓存策略

1. **搜索建议缓存**: 缓存常用搜索建议（5 分钟）
2. **结果缓存**: 相同搜索条件缓存 1 分钟
3. **前端缓存**: 使用 Vue 的 computed 缓存搜索结果

### 7.3 分页优化

1. **游标分页**: 大数据量时使用游标分页而非偏移分页
2. **懒加载**: 滚动到底部自动加载下一页
3. **虚拟滚动**: 大量结果时使用虚拟滚动

---

## 8. 安全设计

### 8.1 权限控制

搜索结果自动过滤用户无权查看的数据：

```javascript
// 搜索服务中的权限过滤
function applyPermissionFilter(query, userId, userRoles) {
  const permissionConditions = getPermissionConditions(userId, userRoles);
  return {
    ...query,
    filters: {
      ...query.filters,
      $permission: permissionConditions
    }
  };
}
```

### 8.2 输入验证

1. **关键词长度**: 限制 2-100 字符
2. **SQL 注入防护**: 使用参数化查询
3. **XSS 防护**: 搜索结果转义输出

---

## 9. 实施计划

### Phase 1: 后端实现 (待开始)
- [ ] 创建 search.routes.js
- [ ] 实现 search.service.js
- [ ] 创建 FTS5 索引
- [ ] 实现搜索历史 API

### Phase 2: 前端组件 (待开始)
- [ ] GlobalSearchBar 组件
- [ ] AdvancedFilterPanel 组件
- [ ] SearchResults 组件
- [ ] useSearch Hook

### Phase 3: 集成测试 (待开始)
- [ ] API 接口测试
- [ ] 前端组件测试
- [ ] 性能测试

### Phase 4: 优化完善 (待开始)
- [ ] 搜索建议功能
- [ ] 性能优化
- [ ] 文档完善

---

## 10. 参考文档

- [SQLite FTS5 文档](https://www.sqlite.org/fts5.html)
- [BM25 算法](https://en.wikipedia.org/wiki/Okapi_BM25)
- [后端路由规划](../../server/routes/)

---

## 11. 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-04-12 | 系统架构师 | 初始版本，架构设计完成 |

---

**文档状态**: ✅ 已完成  
**评审状态**: ⏳ 待评审  
**下一步**: 传递给开发团队实施
