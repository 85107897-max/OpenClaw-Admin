# 发布执行日志 - v2.5.0

**执行时间**: 2026-04-11 15:15  
**发布经理**: 发布经理  
**项目路径**: /www/wwwroot/ai-work/

---

## 当前状态

### Git 状态
```
分支: ai
状态: 有 3 个未提交的文件变更
  - HEARTBEAT.md
  - frontend/tests/components/ThemeSwitcher.test.ts
  - vitest.config.ts
```

### 最新版本标签
```
v1.3.0 (最新)
...
v1.0.0
v0.2.6
```

### 待执行步骤

#### 步骤 1: 提交当前变更
```bash
cd /www/wwwroot/ai-work/
git add .
git commit -m "release: 准备 v2.5.0 版本发布 - 完成测试配置更新"
```

#### 步骤 2: 合并分支到 main
```bash
git checkout main
git pull origin main
git merge ai -m "merge: 合并 ai 分支到 main，准备 v2.5.0 发布"
```

#### 步骤 3: 更新版本号
需要更新 `package.json` 中的 version 字段从 `1.0.0` 到 `2.5.0`

#### 步骤 4: 创建版本标签
```bash
git tag -a v2.5.0 -m "Release v2.5.0 - Cron 编辑器与数据导入导出功能"
git push origin v2.5.0
```

#### 步骤 5: 推送 main 分支
```bash
git push origin main
```

#### 步骤 6: 执行构建验证
```bash
npm ci
npm run build
npm test
```

#### 步骤 7: 部署（如需要）
```bash
# Docker 部署
docker-compose up -d --build

# 或 PM2 部署
pm2 restart all
```

---

## 发布检查清单

- [ ] 代码提交完成
- [ ] 分支合并成功
- [ ] 版本号更新
- [ ] 标签创建成功
- [ ] 构建验证通过
- [ ] 测试通过
- [ ] 部署成功
- [ ] 健康检查通过

---

## 注意事项

1. **数据库备份**: 部署前务必备份数据库
2. **依赖检查**: 确保所有依赖已正确安装
3. **配置检查**: 确认生产环境配置正确
4. **回滚准备**: 准备好回滚方案和备份

---

**最后更新**: 2026-04-11 15:15  
**下一步**: 等待人工确认或自动执行发布流程
