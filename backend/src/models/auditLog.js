const db = require('../utils/database');

/**
 * 审计日志模型
 * 用于存储所有关键操作的审计记录
 */
class AuditLog {
  static async create(entry) {
    const query = `
      INSERT INTO audit_logs (
        action, resource_type, user_id, user_ip, user_agent,
        method, path, query_params, request_body, response_body,
        status_code, duration, timestamp, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      entry.action,
      entry.resourceType,
      entry.userId,
      entry.userIp,
      entry.userAgent,
      entry.method || 'UNKNOWN',
      entry.path || '/',
      entry.query ? JSON.stringify(entry.query) : null,
      entry.requestBody ? JSON.stringify(entry.requestBody) : null,
      entry.responseBody ? JSON.stringify(entry.responseBody) : null,
      entry.statusCode || 200,
      entry.duration || 0,
      entry.timestamp || new Date().toISOString(),
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      new Date()
    ];
    
    return await db.execute(query, values);
  }
  
  static async find(options = {}) {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      statusCode,
      limit = 100,
      offset = 0
    } = options;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    if (statusCode) {
      query += ' AND status_code = ?';
      params.push(statusCode);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await db.execute(query, params);
  }
  
  static async getStatistics(options = {}) {
    const { startDate, endDate, groupBy = 'resource_type' } = options;
    
    let query = `
      SELECT 
        ${groupBy} as group_key,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
        AVG(duration) as avg_duration,
        MAX(duration) as max_duration,
        MIN(duration) as min_duration
      FROM audit_logs
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    query += ` GROUP BY ${groupBy} ORDER BY total_count DESC`;
    
    return await db.execute(query, params);
  }
  
  static async getTopUsers(options = {}) {
    const { limit = 10, startDate, endDate } = options;
    
    let query = `
      SELECT 
        user_id,
        COUNT(*) as total_actions,
        COUNT(DISTINCT resource_type) as resources_accessed,
        AVG(duration) as avg_duration
      FROM audit_logs
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    query += ` GROUP BY user_id ORDER BY total_actions DESC LIMIT ?`;
    params.push(limit);
    
    return await db.execute(query, params);
  }
  
  static async getErrorLogs(options = {}) {
    const { startDate, endDate, limit = 50 } = options;
    
    let query = `
      SELECT * FROM audit_logs
      WHERE status_code >= 400
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    return await db.execute(query, params);
  }
}

/**
 * 初始化审计日志表
 */
async function initAuditLogTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100),
      user_id VARCHAR(255),
      user_ip VARCHAR(45),
      user_agent TEXT,
      method VARCHAR(10),
      path VARCHAR(500),
      query_params TEXT,
      request_body TEXT,
      response_body TEXT,
      status_code INTEGER,
      duration INTEGER,
      timestamp DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_timestamp (timestamp),
      INDEX idx_resource_type (resource_type),
      INDEX idx_action (action),
      INDEX idx_status_code (status_code)
    )
  `;
  
  try {
    await db.execute(createTableSQL);
    console.log('Audit log table initialized successfully');
  } catch (error) {
    console.error('Failed to initialize audit log table:', error);
    throw error;
  }
}

module.exports = {
  AuditLog,
  initAuditLogTable
};
