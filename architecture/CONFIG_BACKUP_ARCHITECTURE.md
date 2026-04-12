# 配置备份与恢复系统 - 架构设计文档

**项目**: OpenClaw-Admin  
**文档版本**: v1.0  
**创建时间**: 2026-04-12  
**作者**: 系统架构师 Agent  
**状态**: ✅ 已完成

---

## 📋 概述

本文档定义了 OpenClaw-Admin 平台配置备份与恢复系统的完整架构方案，支持自动备份、手动备份、版本管理、一键恢复等功能。

---

## 1. 功能需求

### 1.1 核心功能
| 功能 | 描述 | 优先级 |
|------|------|--------|
| 手动备份 | 用户手动触发配置备份 | P0 |
| 自动备份 | 按策略自动执行备份 | P0 |
| 备份列表 | 查看历史备份记录 | P0 |
| 一键恢复 | 从备份恢复配置 | P0 |
| 备份下载 | 下载备份文件到本地 | P1 |
| 备份删除 | 删除历史备份记录 | P1 |
| 备份对比 | 对比不同版本配置差异 | P2 |

### 1.2 备份范围
- **数据库数据**: 所有业务表数据
- **配置文件**: `.env`, `config/*.yaml`, `ecosystem.config.js`
- **Cron 任务配置**: 所有任务配置
- **用户权限配置**: 用户、角色、权限数据
- **主题配置**: 用户主题偏好
- **系统设置**: 系统全局配置

### 1.3 备份策略
| 策略 | 频率 | 保留周期 | 优先级 |
|------|------|----------|--------|
| 每日备份 | 每天凌晨 2 点 | 7 天 | P0 |
| 每周备份 | 每周日凌晨 2 点 | 4 周 | P1 |
| 每月备份 | 每月 1 号凌晨 2 点 | 6 个月 | P2 |
| 手动备份 | 用户触发 | 永久 | P0 |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BackupManagement.vue (备份管理页面)                 │   │
│  │  - 备份列表展示                                      │   │
│  │  - 手动备份按钮                                      │   │
│  │  - 备份操作（恢复/下载/删除）                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BackupStrategyConfig.vue (备份策略配置)             │   │
│  │  - 自动备份频率配置                                  │   │
│  │  - 保留周期配置                                      │   │
│  │  - 备份范围选择                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BackupRestoreDialog.vue (恢复确认弹窗)              │   │
│  │  - 恢复前警告                                        │   │
│  │  - 备份内容预览                                      │   │
│  │  - 恢复确认                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Express.js)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  backup.routes.js (路由层)                           │   │
│  │  - POST /api/backup/create                          │   │
│  │  - GET  /api/backup/list                            │   │
│  │  - GET  /api/backup/:id/download                    │   │
│  │  - POST /api/backup/:id/restore                     │   │
│  │  - DELETE /api/backup/:id                           │   │
│  │  - GET  /api/backup/strategies                      │   │
│  │  - PUT  /api/backup/strategies                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  backup.service.js (备份服务层)                       │   │
│  │  - 备份创建逻辑                                      │   │
│  │  - 备份恢复逻辑                                      │   │
│  │  - 备份清理逻辑                                      │   │
│  │  - 压缩/解压                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  backup.scheduler.js (定时任务)                       │   │
│  │  - 自动备份调度                                      │   │
│  │  - 过期备份清理                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SQLite Database + File System                       │   │
│  │  - backup_records 表                                 │   │
│  │  - backup_files/ 目录                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 接口规范

### 3.1 创建备份

**请求**
```http
POST /api/backup/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "手动备份 -2026-04-12",
  "description": "部署前备份",
  "scope": ["database", "config", "cron_tasks"],
  "compress": true
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 备份名称，不传则自动生成 |
| description | string | 否 | 备份描述 |
| scope | array | 否 | 备份范围，默认全部 |
| compress | boolean | 否 | 是否压缩，默认 true |

**响应**
```json
{
  "success": true,
  "data": {
    "backup_id": "bkp_xxx",
    "name": "手动备份 -2026-04-12",
    "status": "completed",
    "size": 1048576,
    "created_at": "2026-04-12T10:00:00Z",
    "scope": ["database", "config", "cron_tasks"]
  }
}
```

---

### 3.2 获取备份列表

**请求**
```http
GET /api/backup/list?page=1&page_size=20
Authorization: Bearer <token>
```

**响应**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "page": 1,
    "page_size": 20,
    "backups": [
      {
        "id": "bkp_xxx",
        "name": "每日自动备份 -2026-04-12",
        "description": "自动备份",
        "status": "completed",
        "size": 1048576,
        "scope": ["database", "config"],
        "created_at": "2026-04-12T02:00:00Z",
        "created_by": "system"
      }
    ]
  }
}
```

---

### 3.3 下载备份

**请求**
```http
GET /api/backup/:id/download
Authorization: Bearer <token>
```

**响应**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="backup_xxx.zip"`

---

### 3.4 恢复备份

**请求**
```http
POST /api/backup/:id/restore
Content-Type: application/json
Authorization: Bearer <token>

{
  "confirm": true,
  "restore_scope": ["database", "config"],
  "before_restore_hook": "backup_pre_restore"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| confirm | boolean | 是 | 必须为 true，确认恢复操作 |
| restore_scope | array | 否 | 恢复范围，默认全部 |
| before_restore_hook | string | 否 | 恢复前钩子函数名 |

**响应**
```json
{
  "success": true,
  "data": {
    "restore_id": "rst_xxx",
    "status": "completed",
    "restored_at": "2026-04-12T10:30:00Z",
    "restored_items": {
      "database": true,
      "config": true
    }
  }
}
```

---

### 3.5 删除备份

**请求**
```http
DELETE /api/backup/:id
Authorization: Bearer <token>
```

**响应**
```json
{
  "success": true,
  "message": "备份已删除"
}
```

---

### 3.6 备份策略配置

**获取策略**
```http
GET /api/backup/strategies
Authorization: Bearer <token>
```

**更新策略**
```http
PUT /api/backup/strategies
Content-Type: application/json
Authorization: Bearer <token>

{
  "auto_backup": {
    "enabled": true,
    "daily_time": "02:00",
    "daily_retention": 7,
    "weekly_retention": 4,
    "monthly_retention": 6
  },
  "scope": ["database", "config", "cron_tasks"],
  "compress": true,
  "storage_path": "./backups"
}
```

---

## 4. 数据库设计

### 4.1 备份记录表

```sql
CREATE TABLE IF NOT EXISTS backup_records (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    description     TEXT,
    backup_type     TEXT    NOT NULL,  -- manual/daily/weekly/monthly
    scope           TEXT    NOT NULL,  -- JSON 数组
    file_path       TEXT    NOT NULL,
    file_size       INTEGER NOT NULL,
    checksum        TEXT,              -- MD5 校验值
    status          TEXT    NOT NULL,  -- pending/processing/completed/failed
    error_message   TEXT,
    created_by      TEXT    NOT NULL,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    restored_at     INTEGER,
    restored_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_records_type ON backup_records(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_created ON backup_records(created_at DESC);
```

### 4.2 备份策略表

```sql
CREATE TABLE IF NOT EXISTS backup_strategies (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    enabled         INTEGER DEFAULT 1,
    daily_time      TEXT    DEFAULT "02:00",
    daily_retention INTEGER DEFAULT 7,
    weekly_retention INTEGER DEFAULT 4,
    monthly_retention INTEGER DEFAULT 6,
    scope           TEXT    NOT NULL,  -- JSON 数组
    compress        INTEGER DEFAULT 1,
    storage_path    TEXT    DEFAULT "./backups",
    notify_on_success INTEGER DEFAULT 0,
    notify_on_failure INTEGER DEFAULT 1,
    updated_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_by      TEXT
);

-- 初始化默认策略
INSERT INTO backup_strategies (name, scope, compress, storage_path) VALUES
    ('默认备份策略', '["database","config","cron_tasks"]', 1, './backups');
```

### 4.3 恢复记录表

```sql
CREATE TABLE IF NOT EXISTS restore_records (
    id              TEXT    PRIMARY KEY,
    backup_id       TEXT    NOT NULL,
    restore_scope   TEXT    NOT NULL,  -- JSON 数组
    status          TEXT    NOT NULL,  -- pending/processing/completed/failed
    error_message   TEXT,
    restored_items  TEXT,              -- JSON 对象，记录各模块恢复状态
    restored_by     TEXT    NOT NULL,
    started_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    completed_at    INTEGER,
    FOREIGN KEY (backup_id) REFERENCES backup_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_restore_records_backup ON restore_records(backup_id);
CREATE INDEX IF NOT EXISTS idx_restore_records_status ON restore_records(status);
```

---

## 5. 备份服务设计

### 5.1 备份流程

```javascript
// backup.service.js
class BackupService {
  async createBackup(options) {
    const backupId = generateUUID();
    const backupRecord = {
      id: backupId,
      name: options.name || `备份-${formatDate(new Date())}`,
      status: 'pending',
      created_at: Date.now()
    };
    
    // 1. 记录备份开始
    await db.prepare('INSERT INTO backup_records ...').run(backupRecord);
    
    try {
      // 2. 创建临时目录
      const tempDir = path.join(os.tmpdir(), `backup_${backupId}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      // 3. 备份数据库
      if (options.scope.includes('database')) {
        await this.backupDatabase(tempDir);
      }
      
      // 4. 备份配置文件
      if (options.scope.includes('config')) {
        await this.backupConfigFiles(tempDir);
      }
      
      // 5. 备份 Cron 任务
      if (options.scope.includes('cron_tasks')) {
        await this.backupCronTasks(tempDir);
      }
      
      // 6. 压缩备份
      const zipPath = await this.compressBackup(tempDir, backupId);
      
      // 7. 移动备份到存储目录
      const finalPath = await this.moveToStorage(zipPath);
      
      // 8. 更新备份记录
      await db.prepare('UPDATE backup_records SET ...').run({
        status: 'completed',
        file_path: finalPath,
        file_size: fs.statSync(finalPath).size,
        checksum: this.calculateChecksum(finalPath)
      });
      
      // 9. 清理临时文件
      fs.rmSync(tempDir, { recursive: true });
      
      return { success: true, backup_id: backupId };
    } catch (error) {
      await db.prepare('UPDATE backup_records SET status=?, error_message=?').run(
        'failed', error.message
      );
      throw error;
    }
  }
  
  async backupDatabase(tempDir) {
    const dbPath = process.env.DATABASE_PATH || './data/wizard.db';
    const backupPath = path.join(tempDir, 'database', 'wizard.db');
    fs.copyFileSync(dbPath, backupPath);
  }
  
  async backupConfigFiles(tempDir) {
    const configFiles = ['.env', 'config/*.yaml', 'ecosystem.config.js'];
    for (const file of configFiles) {
      const files = glob.sync(file);
      for (const f of files) {
        const targetDir = path.join(tempDir, 'config', path.dirname(f));
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(f, path.join(targetDir, path.basename(f)));
      }
    }
  }
  
  async compressBackup(tempDir, backupId) {
    const output = path.join(os.tmpdir(), `backup_${backupId}.zip`);
    const archive = archiver('zip');
    const stream = fs.createWriteStream(output);
    
    return new Promise((resolve, reject) => {
      archive.pipe(stream);
      archive.directory(tempDir, false);
      archive.finalize();
      archive.on('end', () => resolve(output));
      archive.on('error', reject);
    });
  }
}
```

### 5.2 恢复流程

```javascript
class BackupService {
  async restoreBackup(backupId, options) {
    const backupRecord = await this.getBackupRecord(backupId);
    
    if (backupRecord.status !== 'completed') {
      throw new Error('备份文件不完整');
    }
    
    const restoreId = generateUUID();
    
    try {
      // 1. 记录恢复开始
      await this.createRestoreRecord(restoreId, backupId, options);
      
      // 2. 解压备份到临时目录
      const tempDir = path.join(os.tmpdir(), `restore_${restoreId}`);
      await this.extractBackup(backupRecord.file_path, tempDir);
      
      // 3. 执行恢复前钩子
      if (options.before_restore_hook) {
        await this.executeHook(options.before_restore_hook);
      }
      
      // 4. 恢复数据库
      if (options.restore_scope.includes('database')) {
        await this.restoreDatabase(tempDir);
      }
      
      // 5. 恢复配置文件
      if (options.restore_scope.includes('config')) {
        await this.restoreConfigFiles(tempDir);
      }
      
      // 6. 恢复 Cron 任务
      if (options.restore_scope.includes('cron_tasks')) {
        await this.restoreCronTasks(tempDir);
      }
      
      // 7. 更新恢复记录
      await this.updateRestoreRecord(restoreId, 'completed');
      
      // 8. 更新备份记录的恢复时间
      await db.prepare('UPDATE backup_records SET restored_at=?').run(Date.now());
      
      // 9. 清理临时文件
      fs.rmSync(tempDir, { recursive: true });
      
      return { success: true, restore_id: restoreId };
    } catch (error) {
      await this.updateRestoreRecord(restoreId, 'failed', error.message);
      throw error;
    }
  }
}
```

---

## 6. 定时任务调度

### 6.1 自动备份调度

```javascript
// backup.scheduler.js
const cron = require('cron-parser');

class BackupScheduler {
  start() {
    // 每日自动备份
    const dailyJob = cron.schedule('0 2 * * *', async () => {
      console.log('执行每日自动备份...');
      try {
        await backupService.createBackup({
          name: `每日自动备份-${formatDate(new Date())}`,
          backup_type: 'daily',
          scope: ['database', 'config']
        });
      } catch (error) {
        console.error('每日自动备份失败:', error);
        // 发送告警通知
        await notificationService.send({
          type: 'backup_failed',
          message: `每日自动备份失败：${error.message}`
        });
      }
    });
    
    // 每周自动备份（周日）
    const weeklyJob = cron.schedule('0 2 * * 0', async () => {
      console.log('执行每周自动备份...');
      // 类似每日备份逻辑
    });
    
    // 每月自动备份（每月 1 号）
    const monthlyJob = cron.schedule('0 2 1 * *', async () => {
      console.log('执行每月自动备份...');
      // 类似每日备份逻辑
    });
    
    // 过期备份清理（每天凌晨 3 点）
    const cleanupJob = cron.schedule('0 3 * * *', async () => {
      console.log('清理过期备份...');
      await this.cleanupExpiredBackups();
    });
  }
  
  async cleanupExpiredBackups() {
    const strategies = await this.getBackupStrategies();
    const now = Date.now();
    
    // 清理超过保留期的每日备份
    const dailyBackups = await db.prepare(`
      SELECT * FROM backup_records 
      WHERE backup_type = 'daily' 
      ORDER BY created_at DESC
    `).all();
    
    const dailyRetention = strategies.daily_retention * 24 * 60 * 60 * 1000;
    const cutoffTime = now - dailyRetention;
    
    for (const backup of dailyBackups.slice(strategies.daily_retention)) {
      if (backup.created_at < cutoffTime) {
        await this.deleteBackup(backup.id);
      }
    }
    
    // 类似清理每周、每月备份
  }
}
```

---

## 7. 前端组件设计

### 7.1 组件结构

```
src/components/backup/
├── BackupManagement.vue        # 备份管理页面
├── BackupList.vue              # 备份列表
├── BackupStrategyConfig.vue    # 备份策略配置
├── BackupRestoreDialog.vue     # 恢复确认弹窗
├── BackupCreateDialog.vue      # 创建备份弹窗
└── hooks/
    └── useBackup.ts            # 备份逻辑 Hook
```

### 7.2 状态管理

```typescript
// useBackup.ts
interface BackupState {
  backups: BackupRecord[];
  strategies: BackupStrategy;
  loading: boolean;
  creating: boolean;
  restoring: boolean;
  
  loadBackups(): Promise<void>;
  loadStrategies(): Promise<void>;
  createBackup(options: CreateBackupOptions): Promise<void>;
  restoreBackup(backupId: string, options: RestoreOptions): Promise<void>;
  deleteBackup(backupId: string): Promise<void>;
  downloadBackup(backupId: string): Promise<void>;
  updateStrategies(strategies: BackupStrategy): Promise<void>;
}
```

---

## 8. 安全设计

### 8.1 权限控制

| 操作 | 权限名称 | 说明 |
|------|----------|------|
| 创建备份 | backup:create | 创建备份权限 |
| 查看备份列表 | backup:read | 查看备份权限 |
| 恢复备份 | backup:restore | 恢复备份权限 |
| 删除备份 | backup:delete | 删除备份权限 |
| 配置策略 | backup:configure | 配置备份策略权限 |

### 8.2 数据安全

1. **备份文件加密**: 支持 AES-256 加密备份文件
2. **完整性校验**: MD5/SHA256 校验备份文件完整性
3. **访问控制**: 备份文件存储目录权限限制
4. **恢复前验证**: 恢复前验证备份文件完整性

---

## 9. 实施计划

### Phase 1: 后端实现 (待开始)
- [ ] 创建 backup.routes.js
- [ ] 实现 backup.service.js
- [ ] 实现 backup.scheduler.js
- [ ] 创建数据库表结构

### Phase 2: 前端组件 (待开始)
- [ ] BackupManagement 页面
- [ ] BackupList 组件
- [ ] BackupStrategyConfig 组件
- [ ] BackupRestoreDialog 组件

### Phase 3: 集成测试 (待开始)
- [ ] 备份功能测试
- [ ] 恢复功能测试
- [ ] 定时任务测试
- [ ] 异常场景测试

### Phase 4: 优化完善 (待开始)
- [ ] 备份加密功能
- [ ] 增量备份支持
- [ ] 远程存储支持
- [ ] 文档完善

---

## 10. 参考文档

- [Node.js archiver](https://www.npmjs.com/package/archiver)
- [Node.js cron](https://www.npmjs.com/package/cron-parser)
- [SQLite 备份最佳实践](https://www.sqlite.org/backup.html)

---

## 11. 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-04-12 | 系统架构师 | 初始版本，架构设计完成 |

---

**文档状态**: ✅ 已完成  
**评审状态**: ⏳ 待评审  
**下一步**: 传递给开发团队实施
