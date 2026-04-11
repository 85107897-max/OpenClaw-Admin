# OpenClaw-Admin 数据库设计文档

**项目**: OpenClaw-Admin AI 智能体管理平台  
**阶段**: 数据库设计与实现  
**版本**: 1.0.0  
**创建时间**: 2026-04-11  
**负责人**: 数据库工程师 (DBA Agent)

## 一、设计概述

基于需求文档设计的数据库架构，支持：
1. 多用户 + RBAC 权限体系
2. 通知中心 + 告警渠道
3. Office 智能体工坊
4. MyWorld 虚拟公司
5. 审计日志系统
6. 定时任务管理
7. 备份与恢复

**技术选型**: SQLite (开发) / MySQL (生产), better-sqlite3, UTF-8

## 二、数据库表结构

### 核心表清单 (17 张表)

| 表名 | 模块 | 字段数 | 说明 |
|-----|------|-------|------|
| users | 用户认证 | 11 | 用户账户信息 |
| roles | RBAC | 6 | 角色定义 |
| permissions | RBAC | 5 | 权限定义 |
| user_roles | RBAC | 4 | 用户 - 角色关联 |
| role_permissions | RBAC | 4 | 角色 - 权限关联 |
| audit_logs | 审计 | 12 | 操作审计日志 |
| scenarios | 智能体工坊 | 12 | 场景定义 |
| tasks | 智能体工坊 | 13 | 任务定义 |
| companies | 虚拟公司 | 8 | 公司信息 |
| company_members | 虚拟公司 | 6 | 公司成员 |
| office_areas | 虚拟公司 | 6 | 办公区域 |
| characters | 虚拟公司 | 9 | 角色位置 |
| notifications | 通知 | 10 | 通知消息 |
| alert_rules | 告警 | 10 | 告警规则 |
| cron_jobs | 定时任务 | 16 | 定时任务 |
| backup_records | 备份 | 11 | 备份记录 |
| system_settings | 配置 | 6 | 系统设置 |

## 三、索引优化方案

已设计 30+ 索引，包括：
- 用户查询索引 (username, email, status)
- 审计日志复合索引 (user_id + created_at)
- 任务查询索引 (scenario_id + status)
- 通知未读索引 (user_id + is_read)

## 四、迁移脚本

已生成以下迁移脚本：
- 001_rbac_schema.sql (已有)
- 002_office_myworld.sql (已有)
- 003_notifications.sql (已生成)
- 004_cron_jobs.sql (已生成)
- 005_system_settings.sql (已生成)

## 五、备份方案

**备份策略**:
- 完整备份：每日凌晨 2 点，保留 30 天
- 增量备份：每小时，保留 7 天
- 配置备份：变更时触发，保留 90 天

**恢复流程**: 停止服务 → 备份当前 → 解压恢复 → 验证 → 重启

## 六、下一步

1. 执行迁移脚本
2. 实现数据库操作 API
3. 编写单元测试
4. 性能测试

---
*文档由 WinClaw AI 助手生成*
