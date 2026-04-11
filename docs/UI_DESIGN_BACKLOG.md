# UI 设计待办清单

**项目**: OpenClaw-Admin  
**创建时间**: 2026-04-11  
**设计师**: UI 设计师 (小 U)  
**版本**: v1.0

---

## 待设计任务 (15 个)

### P0 - 核心功能 (8 个)

#### 1. 批量操作 UI
**优先级**: P0  
**预计工时**: 4h  
**依赖**: 列表组件

**设计要点**:
- 复选框/全选功能
- 批量删除确认弹窗
- 批量状态变更
- 操作结果反馈

**组件清单**:
- BatchToolbar.vue
- BatchDeleteModal.vue
- BatchStatusChange.vue

---

#### 2. 智能搜索 UI
**优先级**: P0  
**预计工时**: 6h  
**依赖**: 后端接口

**设计要点**:
- 全局搜索输入框 (防抖)
- 高级筛选面板 (可折叠)
- 筛选条件标签
- 搜索历史

**组件清单**:
- SearchBar.vue
- AdvancedFilter.vue
- FilterTags.vue
- SearchHistory.vue

---

#### 3. Cron 任务列表页
**优先级**: P0  
**预计工时**: 3h  
**依赖**: Cron 编辑器

**设计要点**:
- 任务列表展示
- 搜索/筛选/排序
- 分页组件
- 操作按钮组 (编辑/删除/运行)

**组件清单**:
- CronList.vue
- CronItem.vue
- CronActions.vue

---

#### 4. 数据可视化卡片
**优先级**: P0  
**预计工时**: 3h  
**依赖**: 后端接口

**设计要点**:
- 统计指标展示
- 趋势箭头
- 数据卡片布局
- 点击跳转

**组件清单**:
- DataCard.vue
- TrendIndicator.vue
- Dashboard.vue

---

#### 5. 权限管理 UI
**优先级**: P0  
**预计工时**: 5h  
**依赖**: 后端接口

**设计要点**:
- 角色列表展示
- 用户角色分配
- 权限配置面板
- 权限变更审计

**组件清单**:
- RoleList.vue
- PermissionEditor.vue
- UserRoleAssign.vue
- PermissionTree.vue

---

#### 6. 主题切换器
**优先级**: P0  
**预计工时**: 2h  
**依赖**: -

**设计要点**:
- 亮色/暗色切换
- 主题预览
- 主题偏好存储
- 平滑过渡动画

**组件清单**:
- ThemeSwitcher.vue
- ThemePreview.vue

---

#### 7. 响应式布局
**优先级**: P0  
**预计工时**: 4h  
**依赖**: 所有模块

**设计要点**:
- 断点设计 (768px, 1024px)
- 移动端导航
- 触摸手势支持
- 布局自适应

**组件清单**:
- MobileNav.vue
- ResponsiveLayout.vue
- GestureHandler.vue

---

#### 8. 运行历史查看
**优先级**: P0  
**预计工时**: 2h  
**依赖**: 后端接口

**设计要点**:
- 执行日志列表
- 状态标识
- 时间范围筛选
- 详情查看

**组件清单**:
- RunHistory.vue
- RunLogItem.vue
- RunDetail.vue

---

### P1 - 重要功能 (5 个)

#### 9. 数据导入 UI
**优先级**: P1  
**预计工时**: 3h  
**依赖**: 后端接口

**设计要点**:
- 文件上传区域
- 导入模式选择 (merge/replace)
- 进度显示
- 结果报告

**组件清单**:
- ImportUpload.vue
- ImportConfig.vue
- ImportProgress.vue
- ImportResult.vue

---

#### 10. 数据导出 UI
**优先级**: P1  
**预计工时**: 3h  
**依赖**: 后端接口

**设计要点**:
- 导出配置面板
- 资源类型选择
- 历史记录列表
- 下载管理

**组件清单**:
- ExportConfig.vue
- ExportHistory.vue
- ExportDownload.vue

---

#### 11. WAF 规则管理
**优先级**: P1  
**预计工时**: 3h  
**依赖**: 后端接口

**设计要点**:
- 规则列表展示
- 规则配置表单
- 规则启用/禁用
- 日志查看

**组件清单**:
- WafRuleList.vue
- WafRuleEditor.vue
- WafLogViewer.vue

---

#### 12. CI/CD 扫描 UI
**优先级**: P1  
**预计工时**: 3h  
**依赖**: 后端接口

**设计要点**:
- 扫描配置
- 结果展示
- 报告下载
- 历史对比

**组件清单**:
- ScanConfig.vue
- ScanResult.vue
- ScanReport.vue

---

#### 13. 双因素认证 UI
**优先级**: P1  
**预计工时**: 2h  
**依赖**: 后端接口

**设计要点**:
- 2FA 配置向导
- QR 码展示
- 备份码管理
- 验证输入

**组件清单**:
- TwoFactorSetup.vue
- BackupCodeManager.vue
- TwoFactorVerify.vue

---

### P2 - 增强功能 (2 个)

#### 14. 搜索建议/自动补全
**优先级**: P2  
**预计工时**: 2h  
**依赖**: 后端接口

**设计要点**:
- 搜索建议下拉
- 热门搜索标签
- 历史搜索高亮
- 无结果提示

**组件清单**:
- SearchSuggestion.vue
- HotSearch.vue

---

#### 15. 权限层级树
**优先级**: P2  
**预计工时**: 3h  
**依赖**: 权限管理

**设计要点**:
- 树形结构展示
- 批量授权
- 权限继承
- 可视化权限关系

**组件清单**:
- PermissionTree.vue
- PermissionRelation.vue

---

## 设计进度追踪

| 任务 | 状态 | 开始时间 | 预计完成 | 实际完成 |
|-----|------|---------|---------|---------|
| Cron 编辑器 | ✅ 完成 | 2026-04-11 | 2026-04-11 | 2026-04-11 |
| 批量操作 UI | ⏳ 待开始 | - | - | - |
| 智能搜索 UI | ⏳ 待开始 | - | - | - |
| ... | ⏳ 待开始 | - | - | - |

---

## 设计资源分配

| 设计师 | 当前任务 | 负载 |
|-------|---------|------|
| 小 U | Cron 编辑器 (完成) | 低 |

---

**最后更新**: 2026-04-11 20:30
