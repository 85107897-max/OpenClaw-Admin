const winston = require('winston');
const { auditLogMiddleware } = require('./auditLogger');

// 请求日志中间件
function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    });
    
    next();
  };
}

// 审计日志中间件包装器
function auditLogger() {
  return auditLogMiddleware();
}

module.exports = {
  requestLogger,
  auditLogger
};
