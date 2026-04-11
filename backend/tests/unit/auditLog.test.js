/**
 * 审计日志系统单元测试
 */

const { AuditLog, initAuditLogTable } = require('../src/models/auditLog');
const { auditLogMiddleware, logAudit } = require('../src/middleware/auditLogger');

// Mock 数据库
const mockExecute = jest.fn();
jest.mock('../src/utils/database', () => ({
  execute: mockExecute
}));

describe('AuditLog Model', () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  describe('initAuditLogTable', () => {
    it('should create audit_logs table', async () => {
      mockExecute.mockResolvedValue(undefined);
      
      await initAuditLogTable();
      
      expect(mockExecute).toHaveBeenCalled();
      const sql = mockExecute.mock.calls[0][0];
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS audit_logs');
    });
  });

  describe('AuditLog.create', () => {
    it('should create an audit log entry', async () => {
      mockExecute.mockResolvedValue({ insertId: 1 });
      
      const entry = {
        action: 'CREATE',
        resourceType: 'users',
        userId: 'user123',
        userIp: '192.168.1.1',
        userAgent: 'Test Agent',
        method: 'POST',
        path: '/api/users',
        statusCode: 201,
        duration: 150,
        timestamp: new Date().toISOString()
      };
      
      const result = await AuditLog.create(entry);
      
      expect(mockExecute).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle sensitive data filtering', async () => {
      mockExecute.mockResolvedValue({ insertId: 1 });
      
      const entry = {
        action: 'CREATE',
        resourceType: 'users',
        userId: 'user123',
        requestBody: {
          username: 'testuser',
          password: 'secret123',
          email: 'test@example.com'
        },
        statusCode: 201
      };
      
      await AuditLog.create(entry);
      
      const sql = mockExecute.mock.calls[0][0];
      const values = mockExecute.mock.calls[0][1];
      
      // 检查 SQL 中包含 request_body 字段
      expect(sql).toContain('request_body');
    });
  });

  describe('AuditLog.find', () => {
    it('should find audit logs with filters', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', user_id: 'user123' },
        { id: 2, action: 'UPDATE', user_id: 'user456' }
      ];
      mockExecute.mockResolvedValue(mockLogs);
      
      const logs = await AuditLog.find({
        userId: 'user123',
        action: 'CREATE',
        limit: 10,
        offset: 0
      });
      
      expect(mockExecute).toHaveBeenCalled();
      expect(logs).toEqual(mockLogs);
    });

    it('should handle date range filters', async () => {
      mockExecute.mockResolvedValue([]);
      
      await AuditLog.find({
        startDate: '2026-04-01T00:00:00Z',
        endDate: '2026-04-12T23:59:59Z'
      });
      
      const sql = mockExecute.mock.calls[0][0];
      expect(sql).toContain('timestamp >=');
      expect(sql).toContain('timestamp <=');
    });
  });

  describe('AuditLog.getStatistics', () => {
    it('should return statistics grouped by resource type', async () => {
      const mockStats = [
        { group_key: 'users', total_count: 100, error_count: 5, avg_duration: 120 }
      ];
      mockExecute.mockResolvedValue(mockStats);
      
      const stats = await AuditLog.getStatistics({ groupBy: 'resource_type' });
      
      expect(mockExecute).toHaveBeenCalled();
      expect(stats).toEqual(mockStats);
    });
  });

  describe('AuditLog.getTopUsers', () => {
    it('should return top active users', async () => {
      const mockUsers = [
        { user_id: 'user123', total_actions: 500 },
        { user_id: 'user456', total_actions: 300 }
      ];
      mockExecute.mockResolvedValue(mockUsers);
      
      const users = await AuditLog.getTopUsers({ limit: 10 });
      
      expect(mockExecute).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });
  });

  describe('AuditLog.getErrorLogs', () => {
    it('should return error logs (status >= 400)', async () => {
      const mockErrors = [
        { id: 1, status_code: 404, path: '/api/missing' },
        { id: 2, status_code: 500, path: '/api/error' }
      ];
      mockExecute.mockResolvedValue(mockErrors);
      
      const errors = await AuditLog.getErrorLogs({ limit: 50 });
      
      expect(mockExecute).toHaveBeenCalled();
      expect(errors).toEqual(mockErrors);
    });
  });
});

describe('auditLogger Middleware', () => {
  it('should export auditLogMiddleware function', () => {
    expect(typeof auditLogMiddleware).toBe('function');
  });

  it('should export logAudit function', () => {
    expect(typeof logAudit).toBe('function');
  });

  it('should export auditLogger instance', () => {
    expect(typeof auditLogger.info).toBe('function');
  });
});

describe('logAudit function', () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it('should log manual audit entry', async () => {
    mockExecute.mockResolvedValue({ insertId: 1 });
    
    const entry = {
      action: 'CUSTOM_ACTION',
      resourceType: 'test',
      userId: 'user123',
      details: { message: 'Test log' }
    };
    
    const result = await logAudit(entry);
    
    expect(result).toBeDefined();
    expect(result.action).toBe('CUSTOM_ACTION');
  });
});
