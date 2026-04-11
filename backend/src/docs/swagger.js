const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Work Backend API',
      version: '1.0.0',
      description: 'AI Work 平台后端 API 文档 - 自动化开发全流程系统',
      contact: {
        name: 'AI Work Team',
        email: 'support@aiwork.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.aiwork.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email'],
          properties: {
            id: { type: 'integer', description: '用户 ID' },
            username: { type: 'string', description: '用户名' },
            email: { type: 'string', description: '邮箱' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '日志 ID' },
            action: { type: 'string', description: '操作类型' },
            resourceType: { type: 'string', description: '资源类型' },
            userId: { type: 'string', description: '用户 ID' },
            statusCode: { type: 'integer', description: 'HTTP 状态码' },
            duration: { type: 'integer', description: '请求耗时 (ms)' },
            timestamp: { type: 'string', format: 'date-time', description: '时间戳' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', description: '错误信息' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: '认证相关接口' },
      { name: 'WAF', description: 'Web 应用防火墙' },
      { name: 'CI/CD', description: '持续集成/持续部署' },
      { name: 'Batch', description: '批量操作' },
      { name: 'Search', description: '搜索功能' },
      { name: 'Stats', description: '统计信息' },
      { name: 'RBAC', description: '基于角色的访问控制' },
      { name: 'Themes', description: '主题管理' },
      { name: 'Cron', description: '定时任务管理' },
      { name: 'Audit Logs', description: '审计日志' },
      { name: 'User Behavior', description: '用户行为分析' }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

function swaggerDocs(app, port) {
  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  console.log(`📚 Swagger UI available at http://localhost:${port}/api-docs`);
}

module.exports = { swaggerDocs, swaggerSpec };
