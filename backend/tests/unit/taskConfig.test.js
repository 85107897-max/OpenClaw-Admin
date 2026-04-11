/**
 * 任务配置管理单元测试
 */

const taskConfigService = require('../../src/services/taskConfig.service');

describe('Task Config Service Unit Tests', () => {
  describe('getAllTasks', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.getAllTasks).toBe('function');
    });

    it('should accept filters parameter', async () => {
      expect(taskConfigService.getAllTasks.length).toBe(1);
    });
  });

  describe('getTaskById', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.getTaskById).toBe('function');
    });
  });

  describe('createTask', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.createTask).toBe('function');
    });
  });

  describe('updateTask', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.updateTask).toBe('function');
    });
  });

  describe('deleteTask', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.deleteTask).toBe('function');
    });
  });

  describe('batchDelete', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.batchDelete).toBe('function');
    });
  });

  describe('batchEnable', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.batchEnable).toBe('function');
    });
  });

  describe('batchDisable', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.batchDisable).toBe('function');
    });
  });

  describe('runTask', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.runTask).toBe('function');
    });
  });

  describe('getTaskStats', () => {
    it('should be a function', () => {
      expect(typeof taskConfigService.getTaskStats).toBe('function');
    });
  });
});

describe('Task Config Controller Unit Tests', () => {
  const taskConfigController = require('../../src/controllers/taskConfig.controller');

  describe('getAll', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.getAll).toBe('function');
    });
  });

  describe('getById', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.getById).toBe('function');
    });
  });

  describe('create', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.create).toBe('function');
    });
  });

  describe('update', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.update).toBe('function');
    });
  });

  describe('delete', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.delete).toBe('function');
    });
  });

  describe('batchDelete', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.batchDelete).toBe('function');
    });
  });

  describe('batchEnable', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.batchEnable).toBe('function');
    });
  });

  describe('batchDisable', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.batchDisable).toBe('function');
    });
  });

  describe('run', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.run).toBe('function');
    });
  });

  describe('getStats', () => {
    it('should be a function', () => {
      expect(typeof taskConfigController.getStats).toBe('function');
    });
  });
});
