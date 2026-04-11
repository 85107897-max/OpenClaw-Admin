/**
 * 数据导出服务
 * 负责数据备份、导出功能
 */

const db = require('../models/database');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../../data/exports');
    this.ensureExportDir();
  }

  /**
   * 确保导出目录存在
   */
  ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * 完整数据备份导出
   * @returns {object} - 导出信息
   */
  async exportFullBackup() {
    const exportId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileName = `backup_${timestamp}_${exportId.substring(0, 8)}.zip`;
    const filePath = path.join(this.exportDir, fileName);

    const zip = new AdmZip();
    const metadata = {
      export_id: exportId,
      export_type: 'full_backup',
      timestamp: new Date(timestamp).toISOString(),
      version: '1.0',
      system_info: {
        node_version: process.version,
        platform: process.platform
      },
      tables: []
    };

    try {
      // 导出所有表数据
      const tables = [
        'users', 'sessions', 'audit_logs', 'two_factor_auth',
        'waf_rules', 'waf_logs', 'cicd_scans', 'cicd_scan_results',
        'env_configs', 'crons', 'cron_runs'
      ];

      for (const table of tables) {
        try {
          const data = this.getTableData(table);
          if (data) {
            const jsonData = JSON.stringify(data, null, 2);
            zip.addFile(`${table}.json`, Buffer.from(jsonData));
            metadata.tables.push({
              name: table,
              record_count: data.length
            });
          }
        } catch (e) {
          console.error(`Failed to export table ${table}:`, e.message);
        }
      }

      // 添加元数据
      metadata.total_tables = metadata.tables.length;
      metadata.created_at = timestamp;
      zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));

      // 写入文件
      zip.writeZip(filePath);

      // 记录导出历史
      const fileInfo = fs.statSync(filePath);
      await this.recordExportHistory({
        export_type: 'full_backup',
        file_name: fileName,
        file_size: fileInfo.size,
        record_count: metadata.tables.reduce((sum, t) => sum + t.record_count, 0),
        status: 'completed',
        created_by: null
      });

      return {
        success: true,
        export_id: exportId,
        file_name: fileName,
        file_size: fileInfo.size,
        download_path: filePath,
        metadata
      };
    } catch (e) {
      console.error('Export failed:', e);
      
      // 记录失败
      await this.recordExportHistory({
        export_type: 'full_backup',
        file_name: fileName,
        file_size: 0,
        record_count: 0,
        status: 'failed',
        error_message: e.message,
        created_by: null
      });

      throw e;
    }
  }

  /**
   * 导出指定资源类型
   * @param {string} resourceType - 资源类型
   * @param {object} options - 选项
   * @returns {object} - 导出信息
   */
  async exportResource(resourceType, options = {}) {
    const { ids = [], fields = [], format = 'json' } = options;
    
    const exportId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileName = `${resourceType}_${timestamp}_${exportId.substring(0, 8)}.${format}`;
    const filePath = path.join(this.exportDir, fileName);

    try {
      const data = this.getTableData(resourceType);
      if (!data) {
        throw new Error(`Table ${resourceType} not found`);
      }

      // 过滤 ID
      let filteredData = data;
      if (ids.length > 0) {
        filteredData = data.filter(item => ids.includes(item.id));
      }

      // 过滤字段
      if (fields.length > 0 && format === 'json') {
        filteredData = filteredData.map(item => {
          const filtered = {};
          fields.forEach(field => {
            if (item[field] !== undefined) {
              filtered[field] = item[field];
            }
          });
          return filtered;
        });
      }

      // 写入文件
      let content;
      if (format === 'json') {
        content = JSON.stringify(filteredData, null, 2);
      } else if (format === 'csv') {
        content = this.jsonToCsv(filteredData);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      fs.writeFileSync(filePath, content);

      // 记录导出历史
      const fileInfo = fs.statSync(filePath);
      await this.recordExportHistory({
        export_type: `resource_${resourceType}`,
        file_name: fileName,
        file_size: fileInfo.size,
        record_count: filteredData.length,
        status: 'completed',
        created_by: null
      });

      return {
        success: true,
        export_id: exportId,
        file_name: fileName,
        file_size: fileInfo.size,
        download_path: filePath,
        record_count: filteredData.length
      };
    } catch (e) {
      console.error('Export failed:', e);
      throw e;
    }
  }

  /**
   * 获取表数据
   * @param {string} tableName - 表名
   * @returns {Array} - 表数据
   */
  getTableData(tableName) {
    try {
      const result = db.query(`SELECT * FROM ${tableName}`);
      if (result && result.length > 0) {
        return result[0].columns.map((col, i) => {
          const obj = {};
          result[0].values.forEach(row => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    } catch (e) {
      console.error(`Failed to get data from ${tableName}:`, e.message);
      return null;
    }
  }

  /**
   * JSON 转 CSV
   * @param {Array} data - 数据
   * @returns {string} - CSV 内容
   */
  jsonToCsv(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * 记录导出历史
   * @param {object} data - 导出信息
   */
  async recordExportHistory(data) {
    try {
      db.run(`
        INSERT INTO export_history (
          export_type, file_name, file_size, record_count, 
          status, error_message, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.export_type,
        data.file_name,
        data.file_size || 0,
        data.record_count || 0,
        data.status || 'pending',
        data.error_message || null,
        data.created_by || null,
        data.created_at || Date.now()
      ]);
    } catch (e) {
      console.error('Failed to record export history:', e.message);
      // 表可能不存在，忽略错误
    }
  }

  /**
   * 获取导出历史
   * @param {object} options - 选项
   * @returns {Array} - 导出历史列表
   */
  getExportHistory(options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    try {
      const result = db.query(`
        SELECT * FROM export_history 
        ORDER BY created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (result && result.length > 0) {
        return result[0].columns.map((col, i) => {
          const obj = {};
          result[0].values.forEach(row => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    } catch (e) {
      console.error('Failed to get export history:', e.message);
      return [];
    }
  }

  /**
   * 获取导出文件路径
   * @param {string} fileName - 文件名
   * @returns {string} - 文件路径
   */
  getExportFilePath(fileName) {
    return path.join(this.exportDir, fileName);
  }

  /**
   * 删除导出文件
   * @param {string} fileName - 文件名
   * @returns {boolean} - 是否成功
   */
  deleteExportFile(fileName) {
    const filePath = this.getExportFilePath(fileName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to delete export file:', e.message);
      return false;
    }
  }
}

module.exports = new ExportService();
