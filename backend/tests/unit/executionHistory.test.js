/**
 * 执行历史管理单元测试
 */

const executionHistoryService = require('../../src/services/executionHistory.service');

describe('Execution History Service Unit Tests', () => {
  describe('getExecutionHistory', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.getExecutionHistory).toBe('function');
    });

    it('should accept taskId and filters parameters', async () => {
      expect(executionHistoryService.getExecutionHistory.length).toBe(2);
    });
  });

  describe('getAllExecutionHistory', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.getAllExecutionHistory).toBe('function');
    });
  });

  describe('getExecutionById', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.getExecutionById).toBe('function');
    });
  });

  describe('updateExecutionStatus', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.updateExecutionStatus).toBe('function');
    });
  });

  describe('recordExecutionStart', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.recordExecutionStart).toBe('function');
    });
  });

  describe('recordExecutionComplete', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.recordExecutionComplete).toBe('function');
    });
  });

  describe('cleanupOldHistory', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.cleanupOldHistory).toBe('function');
    });
  });

  describe('getExecutionStats', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryService.getExecutionStats).toBe('function');
    });
  });
});

describe('Execution History Controller Unit Tests', () => {
  const executionHistoryController = require('../../src/controllers/executionHistory.controller');

  describe('getTaskRuns', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.getTaskRuns).toBe('function');
    });
  });

  describe('getAllRuns', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.getAllRuns).toBe('function');
    });
  });

  describe('getRunById', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.getRunById).toBe('function');
    });
  });

  describe('updateStatus', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.updateStatus).toBe('function');
    });
  });

  describe('recordStart', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.recordStart).toBe('function');
    });
  });

  describe('recordComplete', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.recordComplete).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.cleanup).toBe('function');
    });
  });

  describe('getStats', () => {
    it('should be a function', () => {
      expect(typeof executionHistoryController.getStats).toBe('function');
    });
  });
});
