const fs = require('fs').promises;
const path = require('path');
const { query } = require('../utils/database');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const BACKUP_DIR = path.join(__dirname, '../../data/backups');

// 确保备份目录存在
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    logger.error('创建备份目录失败:', error.message);
  }
}

// 备份配置
async function backupConfig(req, res) {
  try {
    await ensureBackupDir();
    
    const backupId = uuidv4();
    const timestamp = new Date().toISOString();
    const backupFile = path.join(BACKUP_DIR, `backup_${backupId}.json`);

    // 收集需要备份的数据
    const backupData = {
      backup_id: backupId,
      timestamp: timestamp,
      created_by: req.user.id,
      version: '1.0',
      data: {}
    };

    // 备份用户数据
    const users = await query('SELECT * FROM users');
    backupData.data.users = users;

    // 备份任务数据
    const tasks = await query('SELECT * FROM tasks');
    backupData.data.tasks = tasks;

    // 备份场景数据
    const scenarios = await query('SELECT * FROM scenarios');
    backupData.data.scenarios = scenarios;

    // 备份角色权限数据
    const roles = await query('SELECT * FROM roles');
    backupData.data.roles = roles;

    const permissions = await query('SELECT * FROM permissions');
    backupData.data.permissions = permissions;

    const rolePermissions = await query('SELECT * FROM role_permissions');
    backupData.data.rolePermissions = rolePermissions;

    // 备份 Cron 配置
    const crons = await query('SELECT * FROM crons');
    backupData.data.crons = crons;

    // 写入备份文件
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));

    logger.info(`配置备份成功：${backupId}, 文件大小：${Buffer.byteLength(JSON.stringify(backupData))} bytes`);

    res.json({
      success: true,
      backup_id: backupId,
      timestamp: timestamp,
      file_path: backupFile,
      size: Buffer.byteLength(JSON.stringify(backupData))
    });
  } catch (error) {
    logger.error('配置备份失败:', error.message);
    res.status(500).json({
      success: false,
      error: '配置备份失败',
      details: error.message
    });
  }
}

// 恢复配置
async function restoreConfig(req, res) {
  try {
    const { backup_id, confirm_override } = req.body;

    if (!backup_id) {
      return res.status(400).json({
        success: false,
        error: '备份 ID 不能为空'
      });
    }

    if (!confirm_override) {
      return res.status(400).json({
        success: false,
        error: '请确认要覆盖现有数据',
        requires_confirmation: true
      });
    }

    const backupFile = path.join(BACKUP_DIR, `backup_${backup_id}.json`);
    
    try {
      await fs.access(backupFile);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: '备份文件不存在'
      });
    }

    const backupData = JSON.parse(await fs.readFile(backupFile, 'utf-8'));

    // 开始事务恢复
    await query('START TRANSACTION');

    try {
      // 恢复用户数据
      if (backupData.data.users && backupData.data.users.length > 0) {
        await query('DELETE FROM users');
        for (const user of backupData.data.users) {
          await query(
            'INSERT INTO users (id, name, email, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user.id, user.name, user.email, user.password_hash, user.status, user.created_at, user.updated_at]
          );
        }
      }

      // 恢复任务数据
      if (backupData.data.tasks && backupData.data.tasks.length > 0) {
        await query('DELETE FROM tasks');
        for (const task of backupData.data.tasks) {
          await query(
            'INSERT INTO tasks (id, title, description, status, priority, assignee_id, created_at, updated_at, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [task.id, task.title, task.description, task.status, task.priority, task.assignee_id, task.created_at, task.updated_at, task.due_date]
          );
        }
      }

      // 恢复场景数据
      if (backupData.data.scenarios && backupData.data.scenarios.length > 0) {
        await query('DELETE FROM scenarios');
        for (const scenario of backupData.data.scenarios) {
          await query(
            'INSERT INTO scenarios (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [scenario.id, scenario.name, scenario.description, scenario.status, scenario.created_at, scenario.updated_at]
          );
        }
      }

      // 恢复角色权限数据
      if (backupData.data.roles && backupData.data.roles.length > 0) {
        await query('DELETE FROM roles');
        for (const role of backupData.data.roles) {
          await query(
            'INSERT INTO roles (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [role.id, role.name, role.description, role.created_at, role.updated_at]
          );
        }
      }

      if (backupData.data.permissions && backupData.data.permissions.length > 0) {
        await query('DELETE FROM permissions');
        for (const permission of backupData.data.permissions) {
          await query(
            'INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [permission.id, permission.name, permission.resource, permission.action, permission.description, permission.created_at]
          );
        }
      }

      if (backupData.data.rolePermissions && backupData.data.rolePermissions.length > 0) {
        await query('DELETE FROM role_permissions');
        for (const rp of backupData.data.rolePermissions) {
          await query(
            'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)',
            [rp.role_id, rp.permission_id, rp.created_at]
          );
        }
      }

      // 恢复 Cron 配置
      if (backupData.data.crons && backupData.data.crons.length > 0) {
        await query('DELETE FROM crons');
        for (const cron of backupData.data.crons) {
          await query(
            'INSERT INTO crons (id, name, schedule, command, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [cron.id, cron.name, cron.schedule, cron.command, cron.status, cron.created_at, cron.updated_at]
          );
        }
      }

      await query('COMMIT');

      logger.info(`配置恢复成功：${backup_id}, 由用户 ${req.user.id} 执行`);

      res.json({
        success: true,
        message: '配置恢复成功',
        backup_id: backup_id,
        restored_at: new Date().toISOString()
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('配置恢复失败，已回滚:', error.message);
      res.status(500).json({
        success: false,
        error: '配置恢复失败，已回滚',
        details: error.message
      });
    }
  } catch (error) {
    logger.error('配置恢复失败:', error.message);
    res.status(500).json({
      success: false,
      error: '配置恢复失败',
      details: error.message
    });
  }
}

// 获取备份列表
async function listBackups(req, res) {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        const backupId = file.replace('backup_', '').replace('.json', '');
        
        try {
          const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          backups.push({
            backup_id: backupId,
            timestamp: content.timestamp,
            size: stats.size,
            created_by: content.created_by,
            version: content.version,
            file_name: file
          });
        } catch (error) {
          logger.warn(`读取备份文件失败：${file}`, error.message);
        }
      }
    }

    // 按时间倒序排序
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: backups,
      total: backups.length
    });
  } catch (error) {
    logger.error('获取备份列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取备份列表失败',
      details: error.message
    });
  }
}

// 删除备份
async function deleteBackup(req, res) {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: '备份 ID 不能为空'
      });
    }

    const backupFile = path.join(BACKUP_DIR, `backup_${backupId}.json`);
    
    try {
      await fs.access(backupFile);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: '备份文件不存在'
      });
    }

    await fs.unlink(backupFile);
    logger.info(`备份删除成功：${backupId}`);

    res.json({
      success: true,
      message: '备份删除成功',
      backup_id: backupId
    });
  } catch (error) {
    logger.error('删除备份失败:', error.message);
    res.status(500).json({
      success: false,
      error: '删除备份失败',
      details: error.message
    });
  }
}

// 下载备份
async function downloadBackup(req, res) {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: '备份 ID 不能为空'
      });
    }

    const backupFile = path.join(BACKUP_DIR, `backup_${backupId}.json`);
    
    try {
      await fs.access(backupFile);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: '备份文件不存在'
      });
    }

    const backupData = JSON.parse(await fs.readFile(backupFile, 'utf-8'));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${backupId}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    logger.error('下载备份失败:', error.message);
    res.status(500).json({
      success: false,
      error: '下载备份失败',
      details: error.message
    });
  }
}

module.exports = {
  backupConfig,
  restoreConfig,
  listBackups,
  deleteBackup,
  downloadBackup
};
