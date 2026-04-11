const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { authenticate, requirePermission } = require('../middleware/auth');

// 备份配置
router.post('/backup',
  authenticate,
  requirePermission('config:backup'),
  configController.backupConfig
);

// 恢复配置
router.post('/restore',
  authenticate,
  requirePermission('config:restore'),
  configController.restoreConfig
);

// 获取配置列表
router.get('/list',
  authenticate,
  requirePermission('config:read'),
  configController.listBackups
);

// 删除备份
router.delete('/:backupId',
  authenticate,
  requirePermission('config:delete'),
  configController.deleteBackup
);

// 下载备份
router.get('/download/:backupId',
  authenticate,
  requirePermission('config:read'),
  configController.downloadBackup
);

module.exports = router;
