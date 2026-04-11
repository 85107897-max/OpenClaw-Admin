# Cron 可视化编辑器测试计划

**测试工程师**: 小测  
**测试日期**: 2026-04-12  
**版本**: 2.5.0  
**测试类型**: 单元测试 + 集成测试 + E2E 测试

---

## 1. 测试范围

### 1.1 后端 API 接口 (20 个)

| # | 方法 | 路径 | 描述 | 优先级 |
|---|------|------|------|--------|
| 1 | GET | `/api/crons` | 获取 Cron 任务列表 | P0 |
| 2 | POST | `/api/crons/batch-delete` | 批量删除 Cron 任务 | P0 |
| 3 | POST | `/api/crons/batch-enable` | 批量启用 Cron 任务 | P1 |
| 4 | POST | `/api/crons/batch-disable` | 批量禁用 Cron 任务 | P1 |
| 5 | GET | `/api/crons/stats` | 获取 Cron 统计信息 | P1 |
| 6 | WS | `listCrons()` | WebSocket 获取任务列表 | P0 |
| 7 | WS | `getCronStatus()` | WebSocket 获取调度器状态 | P0 |
| 8 | WS | `createCron()` | WebSocket 创建任务 | P0 |
| 9 | WS | `updateCron()` | WebSocket 更新任务 | P0 |
| 10 | WS | `deleteCron()` | WebSocket 删除任务 | P0 |
| 11 | WS | `runCron()` | WebSocket 手动触发任务 | P1 |
| 12 | WS | `listCronRuns()` | WebSocket 获取运行日志 | P1 |
| 13 | GET | `/api/crons` (搜索) | 搜索和筛选 Cron 任务 | P1 |
| 14 | GET | `/api/crons` (分页) | 分页获取 Cron 任务 | P2 |
| 15 | GET | `/api/crons` (排序) | 排序 Cron 任务 | P2 |
| 16 | POST | `/api/crons/batch-delete` (权限) | 权限验证测试 | P0 |
| 17 | POST | `/api/crons/batch-enable` (权限) | 权限验证测试 | P1 |
| 18 | POST | `/api/crons/batch-disable` (权限) | 权限验证测试 | P1 |
| 19 | GET | `/api/crons/stats` (统计) | 统计信息准确性 | P2 |
| 20 | WS | `runCron()` (模式) | 强制触发 vs 到期触发 | P2 |

### 1.2 前端组件

- `CronPage.vue` - 主页面组件
- `useCronStore` - Pinia 状态管理
- Cron 表达式解析和中文/英文格式化
- 快速模板应用
- 批量操作功能
- 搜索、筛选、排序功能
- 模态框（创建/编辑/详情）

---

## 2. 测试用例

### 2.1 后端 API 测试用例

#### 用例 1: GET /api/crons - 获取任务列表
```javascript
// 测试数据
{
  q: 'morning',           // 搜索关键词
  enabled: 'true',        // 状态筛选
  sortBy: 'createdAt',    // 排序字段
  sortOrder: 'desc',      // 排序方向
  page: 1,
  limit: 20
}

// 预期结果
{
  ok: true,
  items: [...],
  total: 10,
  page: 1,
  limit: 20
}
```

**验证点**:
- ✅ 返回格式正确
- ✅ 搜索结果正确过滤
- ✅ 分页正确
- ✅ 排序正确

#### 用例 2: POST /api/crons/batch-delete
```javascript
// 请求体
{ jobIds: ['cron-xxx', 'cron-yyy'] }

// 预期结果
{
  ok: true,
  deletedCount: 2,
  failedCount: 0
}
```

**验证点**:
- ✅ 批量删除成功
- ✅ 审计日志记录
- ✅ 权限验证

#### 用例 3: POST /api/crons/batch-enable
**验证点**:
- ✅ 批量启用成功
- ✅ 返回启用/失败计数

#### 用例 4: POST /api/crons/batch-disable
**验证点**:
- ✅ 批量禁用成功
- ✅ 返回禁用/失败计数

#### 用例 5: GET /api/crons/stats
**预期结果**:
```javascript
{
  ok: true,
  stats: {
    total: 10,
    enabled: 6,
    disabled: 4,
    schedulerEnabled: true,
    nextWakeAtMs: 1712966400000,
    byScheduleType: { cron: 5, every: 3, at: 2 }
  }
}
```

#### 用例 6-12: WebSocket RPC 测试
**验证点**:
- ✅ listCrons() 返回正确
- ✅ getCronStatus() 返回调度器状态
- ✅ createCron() 创建成功
- ✅ updateCron() 更新成功
- ✅ deleteCron() 删除成功
- ✅ runCron() 触发成功
- ✅ listCronRuns() 返回运行日志

#### 用例 13-15: 搜索、分页、排序
**验证点**:
- ✅ 关键词搜索匹配 name/description/schedule/agentId 等
- ✅ 分页参数正确
- ✅ 排序字段支持 createdAt, name, schedule 等

#### 用例 16-18: 权限验证
**验证点**:
- ✅ 无权限用户无法执行批量删除
- ✅ 无权限用户无法执行批量启用/禁用
- ✅ 返回 403 错误

#### 用例 19: 统计信息准确性
**验证点**:
- ✅ total = enabled + disabled
- ✅ byScheduleType 统计正确

#### 用例 20: runCron 模式
**验证点**:
- ✅ mode='force' 立即触发
- ✅ mode='due' 仅触发到期的任务

---

### 2.2 前端组件测试用例

#### 用例 21: CronPage.vue - 页面加载
**验证点**:
- ✅ 加载统计卡片
- ✅ 加载任务列表
- ✅ 加载运行日志
- ✅ 快速模板显示

#### 用例 22: 创建 Cron 任务
**验证点**:
- ✅ 表单验证
- ✅ 调度类型切换 (cron/every/at)
- ✅ Payload 类型切换 (agentTurn/systemEvent)
- ✅ 交付配置
- ✅ JSON 预览

#### 用例 23: 编辑 Cron 任务
**验证点**:
- ✅ 填充表单数据
- ✅ 更新任务
- ✅ 刷新列表

#### 用例 24: 删除 Cron 任务
**验证点**:
- ✅ 确认弹窗
- ✅ 删除成功
- ✅ 列表刷新

#### 用例 25: 批量操作
**验证点**:
- ✅ 批量选择
- ✅ 批量删除/启用/禁用

#### 用例 26: 搜索和筛选
**验证点**:
- ✅ 关键词搜索
- ✅ 状态筛选
- ✅ 清除筛选

#### 用例 27: Cron 表达式格式化
**验证点**:
- ✅ 中文格式化正确
- ✅ 英文格式化正确
- ✅ 时区显示正确

#### 用例 28: 运行日志查看
**验证点**:
- ✅ 日志列表显示
- ✅ 日志详情弹窗
- ✅ 状态标签正确
- ✅ 时长显示正确

#### 用例 29: 快速模板应用
**验证点**:
- ✅ 模板选择
- ✅ 表单自动填充
- ✅ 模板参数正确

#### 用例 30: useCronStore - 状态管理
**验证点**:
- ✅ fetchJobs() 获取任务
- ✅ fetchStatus() 获取状态
- ✅ fetchRuns() 获取运行日志
- ✅ createJob() 创建任务
- ✅ updateJob() 更新任务
- ✅ deleteJob() 删除任务
- ✅ runJob() 触发任务
- ✅ batchDelete() 批量删除
- ✅ batchEnable() 批量启用
- ✅ batchDisable() 批量禁用

---

## 3. 端到端测试场景

### 场景 1: 创建晨间报告任务
1. 点击"创建任务"按钮
2. 选择"晨间报告"快速模板
3. 确认表单参数
4. 提交创建
5. 验证任务出现在列表中
6. 查看任务详情
7. 手动触发任务
8. 查看运行日志

### 场景 2: 批量管理任务
1. 创建多个测试任务
2. 使用搜索筛选任务
3. 批量禁用选中的任务
4. 验证状态更新
5. 批量删除任务
6. 验证删除成功

### 场景 3: 编辑和更新任务
1. 选择现有任务
2. 点击编辑
3. 修改调度表达式
4. 修改 Payload 内容
5. 保存更新
6. 验证更新后的任务详情

### 场景 4: 查看运行历史
1. 选择任务
2. 查看运行日志列表
3. 点击某条日志查看详情
4. 查看错误信息（如有）
5. 打开关联会话

---

## 4. 测试执行计划

### 阶段 1: 单元测试 (预计 30 分钟)
- 后端 API 单元测试
- 前端组件单元测试
- Store 方法单元测试

### 阶段 2: 集成测试 (预计 45 分钟)
- API 集成测试
- 前后端联调测试
- WebSocket 通信测试

### 阶段 3: E2E 测试 (预计 45 分钟)
- 完整用户流程测试
- 边界情况测试
- 错误处理测试

---

## 5. 测试环境

- **前端**: Vue 3.5.25 + Naive UI
- **后端**: Express 5.2.1
- **数据库**: SQLite (better-sqlite3)
- **测试框架**: Vitest + Playwright
- **时区**: Asia/Shanghai

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| WebSocket 连接不稳定 | 高 | 添加重连机制测试 |
| Cron 表达式解析错误 | 高 | 添加边界值测试 |
| 权限验证绕过 | 高 | 安全审计测试 |
| 批量操作超时 | 中 | 添加超时测试 |
| 时区处理错误 | 中 | 多时区测试 |

---

## 7. 交付物

1. 测试报告 (HEARTBEAT.md)
2. Bug 列表
3. 修复建议
4. 测试覆盖率报告

---

**测试状态**: 准备执行  
**最后更新**: 2026-04-12 00:35
