const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const winston = require('winston');

// 加载环境变量
dotenv.config();

// 导入路由
const batchRoutes = require('./routes/batch.routes');
const searchRoutes = require('./routes/search.routes');
const statsRoutes = require('./routes/stats.routes');
const rbacRoutes = require('./routes/rbac.routes');
const themesRoutes = require('./routes/themes.routes');
const authRoutes = require('./routes/auth.routes');
const wafRoutes = require('./routes/waf.routes');
const cicdScanRoutes = require('./routes/cicdScan.routes');
const configRoutes = require('./routes/config.routes');
const cronRoutes = require('./routes/cron.routes');
const cronExtendedRoutes = require('./routes/cronExtended.routes');
const auditRoutes = require('./routes/audit.routes');
const userBehaviorRoutes = require('./routes/userBehavior.routes');

// 导入中间件
const errorHandler = require('./middleware/errorHandler');
const { requestLogger, auditLogger } = require('./middleware/requestLogger');

// 初始化 Express 应用
const app = express();

// 配置 Winston 日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger(logger));

// 审计日志中间件 - 记录所有 API 请求
app.use('/api/', auditLogger());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/waf', wafRoutes);
app.use('/api/cicd', cicdScanRoutes);
app.use('/api/config', configRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/crons', cronRoutes);
app.use('/api/cron-editor', cronExtendedRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/user-behavior', userBehaviorRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Resource not found'
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 初始化 Cron 表结构
  try {
    const { initCronTables } = require('./models/cronSchema');
    await initCronTables();
    logger.info('Cron tables initialized');
  } catch (error) {
    logger.error('Failed to initialize Cron tables:', error);
  }
  
  // 初始化审计日志表
  try {
    const { initAuditLogTable } = require('./models/auditLog');
    await initAuditLogTable();
    logger.info('Audit log table initialized');
  } catch (error) {
    logger.error('Failed to initialize audit log table:', error);
  }
  
  // 初始化 Swagger 文档
  try {
    const { swaggerDocs } = require('./docs/swagger');
    swaggerDocs(app, PORT);
  } catch (error) {
    logger.error('Failed to initialize Swagger docs:', error);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const { stopScheduler } = require('./services/schedulerService');
  stopScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  const { stopScheduler } = require('./services/schedulerService');
  stopScheduler();
  process.exit(0);
});

module.exports = app;
