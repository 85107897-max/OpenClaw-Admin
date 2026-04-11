/**
 * 用户行为分析 API 单元测试
 */

const request = require('supertest');
const app = require('../src/index');

// Mock 数据库
const mockExecute = jest.fn();
jest.mock('../src/utils/database', () => ({
  execute: mockExecute
}));

// Mock AuditLog
jest.mock('../src/models/auditLog', () => ({
  AuditLog: {
    find: jest.fn(),
    getStatistics: jest.fn(),
    getTopUsers: jest.fn(),
    getErrorLogs: jest.fn()
  },
  initAuditLogTable: jest.fn()
}));

const { AuditLog } = require('../src/models/auditLog');

describe('User Behavior API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user-behavior/overview/:userId', () => {
    it('should return user behavior overview', async () => {
      const mockLogs = [
        { action: 'GET', resource_type: 'users', status_code: 200, duration: 50 },
        { action: 'POST', resource_type: 'users', status_code: 201, duration: 100 },
        { action: 'GET', resource_type: 'users', status_code: 404, duration: 30 }
      ];
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/user-behavior/overview/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user123');
      expect(response.body.data.totalActions).toBe(3);
    });
  });

  describe('GET /api/user-behavior/timeline/:userId', () => {
    it('should return user behavior timeline', async () => {
      const mockLogs = [
        { timestamp: '2026-04-12T10:00:00Z', action: 'GET', resource_type: 'users', path: '/api/users', status_code: 200, duration: 50 }
      ];
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/user-behavior/timeline/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].action).toBe('GET');
    });
  });

  describe('GET /api/user-behavior/resource-pattern/:userId', () => {
    it('should return resource access pattern', async () => {
      const mockLogs = [
        { action: 'GET', resource_type: 'users', status_code: 200, duration: 50 },
        { action: 'GET', resource_type: 'users', status_code: 200, duration: 60 },
        { action: 'POST', resource_type: 'orders', status_code: 201, duration: 100 }
      ];
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/user-behavior/resource-pattern/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      const usersPattern = response.body.data.find(p => p.resource === 'users');
      expect(usersPattern).toBeDefined();
      expect(usersPattern.count).toBe(2);
    });
  });

  describe('GET /api/user-behavior/anomalies/:userId', () => {
    it('should detect high frequency anomalies', async () => {
      const mockLogs = Array(150).fill({
        action: 'GET',
        resource_type: 'users',
        status_code: 200,
        duration: 50
      });
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/user-behavior/anomalies/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAnomalies).toBeGreaterThan(0);
    });

    it('should detect high error rate anomalies', async () => {
      const mockLogs = Array(20).fill({
        action: 'GET',
        resource_type: 'users',
        status_code: 500,
        duration: 100
      });
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/user-behavior/anomalies/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      const anomaly = response.body.data.anomalies.find(a => a.type === 'high_error_rate');
      expect(anomaly).toBeDefined();
    });
  });

  describe('GET /api/user-behavior/global-stats', () => {
    it('should return global user behavior statistics', async () => {
      AuditLog.getTopUsers.mockResolvedValue([
        { user_id: 'user123', total_actions: 500 }
      ]);
      AuditLog.getStatistics.mockResolvedValue([
        { group_key: 'users', total_count: 1000 }
      ]);
      AuditLog.getErrorLogs.mockResolvedValue([
        { id: 1, status_code: 500, path: '/api/error' }
      ]);

      const response = await request(app)
        .get('/api/user-behavior/global-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topUsers).toBeDefined();
      expect(response.body.data.resourceStatistics).toBeDefined();
    });
  });
});

describe('Audit Log API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/audit-logs', () => {
    it('should return audit logs list', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', user_id: 'user123', status_code: 201 }
      ];
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/audit-logs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter audit logs by userId', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', user_id: 'user123' }
      ];
      AuditLog.find.mockResolvedValue(mockLogs);

      await request(app)
        .get('/api/audit-logs?userId=user123')
        .expect(200);

      expect(AuditLog.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123'
      }));
    });
  });

  describe('GET /api/audit-logs/statistics', () => {
    it('should return audit statistics', async () => {
      const mockStats = [
        { group_key: 'users', total_count: 100, error_count: 5 }
      ];
      AuditLog.getStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/audit-logs/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('GET /api/audit-logs/top-users', () => {
    it('should return top users by activity', async () => {
      const mockUsers = [
        { user_id: 'user123', total_actions: 500 }
      ];
      AuditLog.getTopUsers.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/audit-logs/top-users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
    });
  });

  describe('GET /api/audit-logs/errors', () => {
    it('should return error logs', async () => {
      const mockErrors = [
        { id: 1, status_code: 500, path: '/api/error' }
      ];
      AuditLog.getErrorLogs.mockResolvedValue(mockErrors);

      const response = await request(app)
        .get('/api/audit-logs/errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockErrors);
    });
  });

  describe('GET /api/audit-logs/:id', () => {
    it('should return single audit log by id', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', user_id: 'user123' },
        { id: 2, action: 'UPDATE', user_id: 'user456' }
      ];
      AuditLog.find.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/audit-logs/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 for non-existent log', async () => {
      AuditLog.find.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/audit-logs/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
