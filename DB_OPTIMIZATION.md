# 数据库性能优化建议

> 作者：数据库工程师  
> 日期：2026-04-12  
> 版本：v1.0

---

## 一、已创建的索引

### 1.1 会话表索引
```sql
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
```

### 1.2 2FA 相关索引
```sql
CREATE INDEX idx_2fa_session_token ON two_factor_sessions(session_token);
CREATE INDEX idx_2fa_session_expires ON two_factor_sessions(expires_at);
```

### 1.3 登录尝试索引
```sql
CREATE INDEX idx_login_attempts_user ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
```

### 1.4 WAF 相关索引
```sql
CREATE INDEX idx_waf_rules_enabled ON waf_rules(enabled);
CREATE INDEX idx_waf_rules_type ON waf_rules(rule_type);
CREATE INDEX idx_waf_logs_ip ON waf_logs(ip_address);
CREATE INDEX idx_waf_logs_created ON waf_logs(created_at DESC);
```

### 1.5 CI/CD 扫描索引
```sql
CREATE INDEX idx_cdc_scan_status ON cdc_scan_tasks(status);
CREATE INDEX idx_cdc_scan_type ON cdc_scan_tasks(scan_type);
CREATE INDEX idx_results_task ON cdc_scan_results(task_id);
CREATE INDEX idx_results_severity ON cdc_scan_results(severity);
```

---

## 二、推荐查询优化

### 2.1 会话查询优化
```sql
-- 获取活跃会话（使用索引）
SELECT id, agent_name, started_at 
FROM sessions 
WHERE status = 'active' 
ORDER BY started_at DESC 
LIMIT 50;

-- 获取 Agent 的会话统计
SELECT agent_id, COUNT(*) as session_count, 
       SUM(input_tokens) as total_input_tokens,
       SUM(output_tokens) as total_output_tokens
FROM sessions 
GROUP BY agent_id;
```

### 2.2 安全审计查询优化
```sql
-- 获取最近失败的登录尝试（使用索引）
SELECT username, ip_address, failed_count, locked_until
FROM login_attempts 
WHERE success = 0 
ORDER BY created_at DESC 
LIMIT 100;

-- 获取 WAF 拦截统计
SELECT rule_name, COUNT(*) as hit_count
FROM waf_logs 
WHERE blocked = 1 
GROUP BY rule_name 
ORDER BY hit_count DESC;
```

### 2.3 CI/CD 扫描查询优化
```sql
-- 获取最近的扫描任务及其结果
SELECT t.task_name, t.scan_type, t.status, t.completed_at,
       COUNT(r.id) as issue_count,
       SUM(CASE WHEN r.severity = 'critical' THEN 1 ELSE 0 END) as critical_count
FROM cdc_scan_tasks t
LEFT JOIN cdc_scan_results r ON t.id = r.task_id
WHERE t.status = 'completed'
GROUP BY t.id
ORDER BY t.completed_at DESC
LIMIT 20;
```

---

## 三、数据库维护建议

### 3.1 定期清理任务
```sql
-- 清理 30 天前的登录尝试记录
DELETE FROM login_attempts WHERE created_at < (strftime('%s', 'now') * 1000 - 30*24*60*60*1000);

-- 清理 90 天前的 WAF 日志
DELETE FROM waf_logs WHERE created_at < (strftime('%s', 'now') * 1000 - 90*24*60*60*1000);

-- 清理过期的 2FA 会话
DELETE FROM two_factor_sessions WHERE expires_at < (strftime('%s', 'now') * 1000);
```

### 3.2 数据库优化命令
```bash
# 定期执行
sqlite3 wizard.db "VACUUM;"
sqlite3 wizard.db "REINDEX;"
sqlite3 wizard.db "ANALYZE;"
```

### 3.3 监控查询性能
```sql
-- 启用查询分析
EXPLAIN QUERY PLAN 
SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC;
```

---

## 四、安全建议

### 4.1 敏感数据保护
- 所有密码、密钥字段应加密存储
- 使用参数化查询防止 SQL 注入
- 定期审计数据访问日志

### 4.2 访问控制
- 实施最小权限原则
- 定期审查用户权限
- 启用审计日志记录所有敏感操作

---

## 五、备份策略

### 5.1 定期备份
```bash
# 每日备份
cp wizard.db wizard_backup_$(date +%Y%m%d).db

# 保留最近 7 天的备份
find /path/to/backups -name "wizard_backup_*.db" -mtime +7 -delete
```

### 5.2 备份验证
```bash
# 验证备份完整性
sqlite3 wizard_backup.db "PRAGMA integrity_check;"
```

---

*文档版本：v1.0 | 状态：已完成*
*最后更新：2026-04-12*
