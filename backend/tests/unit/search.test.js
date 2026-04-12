const { globalSearch, filterResources, searchSuggest } = require('../../src/controllers/search.controller');

// Mock database
jest.mock('../../src/utils/database', () => ({
  query: jest.fn()
}));

const { query } = require('../../src/utils/database');

describe('Search Controller Tests', () => {
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
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('globalSearch', () => {
    it('should return search results for users, tasks, and scenarios', async () => {
      mockReq.query = { q: 'test', page: 1, pageSize: 10 };
      
      query.mockResolvedValueOnce([]); // users
      query.mockResolvedValueOnce([]); // tasks
      query.mockResolvedValueOnce([]); // scenarios

      await globalSearch(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          total: 0,
          page: 1,
          pageSize: 10
        })
      );
    });

    it('should handle empty query parameter', async () => {
      mockReq.query = { q: '', page: 1, pageSize: 10 };
      
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      await globalSearch(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('filterResources', () => {
    it('should filter users successfully', async () => {
      mockReq.params = { resource: 'users' };
      mockReq.body = {
        filters: [{ field: 'status', operator: 'eq', value: 'active' }],
        page: 1,
        pageSize: 20
      };

      query.mockResolvedValueOnce([{ total: 0 }]);
      query.mockResolvedValueOnce([]);

      await filterResources(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          total: 0
        })
      );
    });

    it('should return error for invalid resource type', async () => {
      mockReq.params = { resource: 'invalid' };
      mockReq.body = {};

      await filterResources(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '无效的资源类型'
        })
      );
    });

    it('should filter tasks with multiple conditions', async () => {
      mockReq.params = { resource: 'tasks' };
      mockReq.body = {
        filters: [
          { field: 'status', operator: 'eq', value: 'pending' },
          { field: 'priority', operator: 'gt', value: 3 }
        ],
        page: 1,
        pageSize: 20
      };

      query.mockResolvedValueOnce([{ total: 5 }]);
      query.mockResolvedValueOnce([
        { id: 1, title: 'Task 1', status: 'pending', priority: 4 },
        { id: 2, title: 'Task 2', status: 'pending', priority: 5 }
      ]);

      await filterResources(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 5,
          page: 1,
          pageSize: 20
        })
      );
    });
  });

  describe('searchSuggest', () => {
    it('should return user suggestions', async () => {
      mockReq.query = { q: 'john', type: 'user' };

      query.mockResolvedValueOnce([
        { name: 'John Doe', email: 'john@example.com' }
      ]);

      await searchSuggest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ text: 'John Doe', type: 'user' })
          ])
        })
      );
    });

    it('should return task suggestions', async () => {
      mockReq.query = { q: 'fix', type: 'task' };

      query.mockResolvedValueOnce([
        { title: 'Fix login bug' },
        { title: 'Fix navigation issue' }
      ]);

      await searchSuggest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ text: 'Fix login bug', type: 'task' })
          ])
        })
      );
    });

    it('should return suggestions for all types when type not specified', async () => {
      mockReq.query = { q: 'test' };

      query.mockResolvedValueOnce([{ name: 'Test User', email: 'test@example.com' }]);
      query.mockResolvedValueOnce([{ title: 'Test Task' }]);
      query.mockResolvedValueOnce([{ name: 'Test Scenario' }]);

      await searchSuggest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ type: 'user' }),
            expect.objectContaining({ type: 'task' }),
            expect.objectContaining({ type: 'scenario' })
          ])
        })
      );
    });
  });
});
