const winston = require('winston');
const { AuditLog } = require('../models/auditLog');

// 配置审计日志
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/audit.log', 
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * 审计日志中间件
 * 记录所有关键操作
 */
const auditLogMiddleware = (action, resourceType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // 响应结束时的处理
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      
      // 只记录关键操作（状态码 != 200 或特定资源类型）
      if (res.statusCode >= 400 || resourceType) {
        try {
          const auditEntry = {
            action: action || req.method,
            resourceType: resourceType || get ResourceType(req.path),
            userId: req.user?.id || 'anonymous',
            userIp: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || '',
            method: req.method,
            path: req.path,
            query: req.query,
            requestBody: req.body && Object.keys(req.body).length > 0 ? 
              filterSensitiveData(req.body) : null,
            responseBody: res.statusCode >= 400 ? 
              res.locals.errorResponse : null,
            statusCode: res.statusCode,
            duration: duration,
            timestamp: new Date().toISOString()
          };
          
          // 记录到日志文件
          auditLogger.info('Audit Log', auditEntry);
          
          // 异步保存到数据库
          if (process.env.ENABLE_DB_AUDIT === 'true') {
            await AuditLog.create(auditEntry).catch(err => {
              auditLogger.error('Failed to save audit log to DB:', err);
            });
          }
        } catch (error) {
          auditLogger.error('Audit logging error:', error);
        }
      }
    });
    
    next();
  };
};

/**
 * 从路径提取资源类型
 */
function getResourceType(path) {
  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments.length >= 2) {
    return pathSegments[1]; // 例如 /api/users/1 -> users
  }
  return 'unknown';
}

/**
 * 过滤敏感数据
 */
function filterSensitiveData(data) {
  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'creditCard', 'ssn'];
  const filtered = { ...data };
  
  Object.keys(filtered).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      filtered[key] = '[REDACTED]';
    }
  });
  
  return filtered;
}

/**
 * 手动记录审计日志
 */
const logAudit = async (entry) => {
  const auditEntry = {
    action: entry.action,
    resourceType: entry.resourceType,
    userId: entry.userId || 'anonymous',
    userIp: entry.userIp || 'unknown',
    userAgent: entry.userAgent || '',
    details: entry.details || {},
    timestamp: new Date().toISOString(),
    metadata: entry.metadata || {}
  };
  
  auditLogger.info('Manual Audit Log', auditEntry);
  
  if (process.env.ENABLE_DB_AUDIT === 'true') {
    try {
      await AuditLog.create(auditEntry);
    } catch (err) {
      auditLogger.error('Failed to save manual audit log:', err);
    }
  }
  
  return auditEntry;
};

module.exports = {
  auditLogMiddleware,
  logAudit,
  auditLogger
};
