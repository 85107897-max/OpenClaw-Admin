/**
 * Cron 编辑器单元测试
 */

const request = require('supertest');
const express = require('express');
const cronEditorRoutes = require('../src/routes/cronEditor.routes');
const { initCronTables } = require('../src/models/cronSchema');
const { initScheduler } = require('../src/services/schedulerService');

// 创建测试应用
const app = express();
app.use(express.json());

// 设置测试环境
process.env.NODE_ENV = 'test';

app.use('/api/cron-editor', cronEditorRoutes);

describe('Cron Editor API Tests', () => {
  beforeAll(async () => {
    // 初始化数据库和调度器
    await initCronTables();
    await initScheduler();
  });

  afterAll(async () => {
    // 清理资源
    const { stopScheduler } = require('../src/services/schedulerService');
    stopScheduler();
  });

  describe('Cron Templates API', () => {
    describe('GET /api/cron-editor/templates', () => {
      it('should return list of templates', async () => {
        const response = await request(app)
          .get('/api/cron-editor/templates')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('items');
        expect(response.body.data).toHaveProperty('total');
      });
    });

    describe('POST /api/cron-editor/templates', () => {
      it('should create a new template', async () => {
        const templateData = {
          name: 'Test Template',
          description: 'Test description',
          expression: '*/5 * * * *',
          schedule_type: 'cron',
          category: '测试'
        };

        const response = await request(app)
          .post('/api/cron-editor/templates')
          .send(templateData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe(templateData.name);
      });

      it('should fail without required fields', async () => {
        const response = await request(app)
          .post('/api/cron-editor/templates')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('GET /api/cron-editor/templates/:id', () => {
      it('should return a template by id', async () => {
        // First create a template
        const createResponse = await request(app)
          .post('/api/cron-editor/templates')
          .send({
            name: 'Template for Get Test',
            expression: '0 * * * *',
            schedule_type: 'cron'
          });

        const templateId = createResponse.body.data.id;

        const response = await request(app)
          .get(`/api/cron-editor/templates/${templateId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id', templateId);
      });

      it('should return 404 for non-existent template', async () => {
        const response = await request(app)
          .get('/api/cron-editor/templates/99999')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/cron-editor/templates/:id', () => {
      it('should update a template', async () => {
        // Create template first
        const createResponse = await request(app)
          .post('/api/cron-editor/templates')
          .send({
            name: 'Template for Update Test',
            expression: '0 * * * *',
            schedule_type: 'cron'
          });

        const templateId = createResponse.body.data.id;

        const response = await request(app)
          .put(`/api/cron-editor/templates/${templateId}`)
          .send({ name: 'Updated Template Name' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/cron-editor/templates/:id', () => {
      it('should delete a template', async () => {
        // Create template first
        const createResponse = await request(app)
          .post('/api/cron-editor/templates')
          .send({
            name: 'Template for Delete Test',
            expression: '0 * * * *',
            schedule_type: 'cron'
          });

        const templateId = createResponse.body.data.id;

        const response = await request(app)
          .delete(`/api/cron-editor/templates/${templateId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Task Configs API', () => {
    describe('GET /api/cron-editor/tasks', () => {
      it('should return list of tasks', async () => {
        const response = await request(app)
          .get('/api/cron-editor/tasks')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('items');
      });
    });

    describe('POST /api/cron-editor/tasks', () => {
      it('should create a new task', async () => {
        const taskData = {
          title: 'Test Task',
          description: 'Test task description',
          expression: '*/10 * * * *',
          command: 'echo "Hello World"',
          schedule_type: 'cron',
          timeout: 60,
          retry_count: 3
        };

        const response = await request(app)
          .post('/api/cron-editor/tasks')
          .send(taskData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.title).toBe(taskData.title);
      });

      it('should fail without required fields', async () => {
        const response = await request(app)
          .post('/api/cron-editor/tasks')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/cron-editor/tasks/:id/enable', () => {
      it('should enable a task', async () => {
        // Create task first
        const createResponse = await request(app)
          .post('/api/cron-editor/tasks')
          .send({
            title: 'Task for Enable Test',
            expression: '0 * * * *',
            command: 'echo test',
            schedule_type: 'cron'
          });

        const taskId = createResponse.body.data.id;

        const response = await request(app)
          .post(`/api/cron-editor/tasks/${taskId}/enable`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/cron-editor/tasks/:id/disable', () => {
      it('should disable a task', async () => {
        // Create task first
        const createResponse = await request(app)
          .post('/api/cron-editor/tasks')
          .send({
            title: 'Task for Disable Test',
            expression: '0 * * * *',
            command: 'echo test',
            schedule_type: 'cron'
          });

        const taskId = createResponse.body.data.id;

        const response = await request(app)
          .post(`/api/cron-editor/tasks/${taskId}/disable`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/cron-editor/tasks/batch-enable', () => {
      it('should batch enable tasks', async () => {
        // Create tasks first
        const create1 = await request(app)
          .post('/api/cron-editor/tasks')
          .send({
            title: 'Batch Enable Task 1',
            expression: '0 * * * *',
            command: 'echo test1',
            schedule_type: 'cron'
          });

        const create2 = await request(app)
          .post('/api/cron-editor/tasks')
          .send({
            title: 'Batch Enable Task 2',
            expression: '0 * * * *',
            command: 'echo test2',
            schedule_type: 'cron'
          });

        const response = await request(app)
          .post('/api/cron-editor/tasks/batch-enable')
          .send({
            taskIds: [create1.body.data.id, create2.body.data.id]
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.enabledCount).toBe(2);
      });
    });

    describe('POST /api/cron-editor/tasks/batch-disable', () => {
      it('should batch disable tasks', async () => {
        const response = await request(app)
          .post('/api/cron-editor/tasks/batch-disable')
          .send({ taskIds: [] })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Execution History API', () => {
    describe('GET /api/cron-editor/history', () => {
      it('should return list of execution history', async () => {
        const response = await request(app)
          .get('/api/cron-editor/history')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('items');
      });
    });

    describe('GET /api/cron-editor/history/stats/:taskId', () => {
      it('should return execution stats for a task', async () => {
        // Create task first
        const createResponse = await request(app)
          .post('/api/cron-editor/tasks')
          .send({
            title: 'Task for Stats Test',
            expression: '0 * * * *',
            command: 'echo test',
            schedule_type: 'cron'
          });

        const taskId = createResponse.body.data.id;

        const response = await request(app)
          .get(`/api/cron-editor/history/stats/${taskId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('byStatus');
      });
    });
  });

  describe('Cron Parser Utilities', () => {
    const { calculateNextRun, validateCronExpression } = require('../src/utils/cronParser');

    describe('calculateNextRun', () => {
      it('should calculate next run for */5 * * * *', () => {
        const nextRun = calculateNextRun('*/5 * * * *');
        expect(typeof nextRun).toBe('number');
        expect(nextRun).toBeGreaterThan(Date.now() / 1000);
      });

      it('should calculate next run for 0 0 * * *', () => {
        const nextRun = calculateNextRun('0 0 * * *');
        expect(typeof nextRun).toBe('number');
      });

      it('should return default for invalid expression', () => {
        const nextRun = calculateNextRun('invalid');
        expect(typeof nextRun).toBe('number');
      });
    });

    describe('validateCronExpression', () => {
      it('should validate valid expression', () => {
        const result = validateCronExpression('*/5 * * * *');
        expect(result.valid).toBe(true);
      });

      it('should reject invalid expression', () => {
        const result = validateCronExpression('invalid');
        expect(result.valid).toBe(false);
      });

      it('should reject expression with wrong number of fields', () => {
        const result = validateCronExpression('* * *');
        expect(result.valid).toBe(false);
      });
    });
  });
});
