const { backupConfig, restoreConfig, listBackups, deleteBackup, downloadBackup } = require('../../src/controllers/config.controller');
const fs = require('fs').promises;
const path = require('path');

// Mock database
jest.mock('../../src/utils/database', () => ({
  query: jest.fn()
}));

// Mock fs
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  access: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345')
}));

const { query } = require('../../src/utils/database');

describe('Config Controller Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 1 }
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('backupConfig', () => {
    it('should create a backup successfully', async () => {
      mockReq.user = { id: 1 };
      
      query.mockResolvedValueOnce([]); // users
      query.mockResolvedValueOnce([]); // tasks
      query.mockResolvedValueOnce([]); // scenarios
      query.mockResolvedValueOnce([]); // roles
      query.mockResolvedValueOnce([]); // permissions
      query.mockResolvedValueOnce([]); // rolePermissions
      query.mockResolvedValueOnce([]); // crons

      fs.mkdir.mockResolvedValueOnce();
      fs.writeFile.mockResolvedValueOnce();

      await backupConfig(mockReq, mockRes);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          backup_id: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle database query errors', async () => {
      mockReq.user = { id: 1 };
      query.mockRejectedValueOnce(new Error('Database error'));

      await backupConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '配置备份失败'
        })
      );
    });
  });

  describe('restoreConfig', () => {
    it('should return error if backup_id is missing', async () => {
      mockReq.body = { confirm_override: true };

      await restoreConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '备份 ID 不能为空'
        })
      );
    });

    it('should return error if confirmation is not provided', async () => {
      mockReq.body = { backup_id: 'test-uuid', confirm_override: false };

      await restoreConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '请确认要覆盖现有数据',
          requires_confirmation: true
        })
      );
    });

    it('should return error if backup file does not exist', async () => {
      mockReq.body = { backup_id: 'test-uuid', confirm_override: true };
      fs.access.mockRejectedValueOnce(new Error('File not found'));

      await restoreConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '备份文件不存在'
        })
      );
    });

    it('should rollback on restore failure', async () => {
      mockReq.body = { backup_id: 'test-uuid', confirm_override: true };
      fs.access.mockResolvedValueOnce();
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          users: [],
          tasks: [],
          scenarios: [],
          roles: [],
          permissions: [],
          rolePermissions: [],
          crons: []
        }
      }));

      query.mockResolvedValueOnce(); // START TRANSACTION
      query.mockRejectedValueOnce(new Error('Restore error')); // DELETE FROM users

      await restoreConfig(mockReq, mockRes);

      expect(query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('listBackups', () => {
    it('should list all backup files', async () => {
      fs.mkdir.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['backup_123.json', 'backup_456.json']);
      fs.stat.mockResolvedValueOnce({ size: 1024 });
      fs.stat.mockResolvedValueOnce({ size: 2048 });
      fs.readFile.mockResolvedValueOnce(JSON.stringify({ timestamp: '2024-01-01T00:00:00.000Z', created_by: 1, version: '1.0' }));
      fs.readFile.mockResolvedValueOnce(JSON.stringify({ timestamp: '2024-01-02T00:00:00.000Z', created_by: 1, version: '1.0' }));

      await listBackups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ backup_id: '123' }),
            expect.objectContaining({ backup_id: '456' })
          ]),
          total: 2
        })
      );
    });

    it('should handle directory read errors', async () => {
      fs.mkdir.mockResolvedValueOnce();
      fs.readdir.mockRejectedValueOnce(new Error('Directory error'));

      await listBackups(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '获取备份列表失败'
        })
      );
    });
  });

  describe('deleteBackup', () => {
    it('should return error if backupId is missing', async () => {
      mockReq.params = {};

      await deleteBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '备份 ID 不能为空'
        })
      );
    });

    it('should return error if backup file does not exist', async () => {
      mockReq.params = { backupId: 'test-uuid' };
      fs.access.mockRejectedValueOnce(new Error('File not found'));

      await deleteBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '备份文件不存在'
        })
      );
    });

    it('should delete backup successfully', async () => {
      mockReq.params = { backupId: 'test-uuid' };
      fs.access.mockResolvedValueOnce();
      fs.unlink.mockResolvedValueOnce();

      await deleteBackup(mockReq, mockRes);

      expect(fs.unlink).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '备份删除成功',
          backup_id: 'test-uuid'
        })
      );
    });
  });

  describe('downloadBackup', () => {
    it('should return error if backupId is missing', async () => {
      mockReq.params = {};

      await downloadBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '备份 ID 不能为空'
        })
      );
    });

    it('should return error if backup file does not exist', async () => {
      mockReq.params = { backupId: 'test-uuid' };
      fs.access.mockRejectedValueOnce(new Error('File not found'));

      await downloadBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '备份文件不存在'
        })
      );
    });

    it('should download backup successfully', async () => {
      mockReq.params = { backupId: 'test-uuid' };
      fs.access.mockResolvedValueOnce();
      fs.readFile.mockResolvedValueOnce(JSON.stringify({ timestamp: '2024-01-01T00:00:00.000Z', data: {} }));

      await downloadBackup(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});
