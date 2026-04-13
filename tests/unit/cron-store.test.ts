/**
 * Unit Tests - Cron Store
 * Tests the cron job management store logic
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCronStore } from '@/stores/cron'

const { mockRpc, mockCronApi } = vi.hoisted(() => ({
  mockRpc: {
    listCrons: vi.fn(),
    getCronStatus: vi.fn(),
    listCronRuns: vi.fn(),
    createCron: vi.fn(),
    updateCron: vi.fn(),
    deleteCron: vi.fn(),
    runCron: vi.fn(),
  },
  mockCronApi: {
    batchDeleteCrons: vi.fn(),
    batchEnableCrons: vi.fn(),
    batchDisableCrons: vi.fn(),
    getCronStats: vi.fn(),
    searchCrons: vi.fn(),
  },
}))

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: () => ({
    rpc: mockRpc,
  }),
}))

vi.mock('@/api/cron-api', () => ({
  batchDeleteCrons: mockCronApi.batchDeleteCrons,
  batchEnableCrons: mockCronApi.batchEnableCrons,
  batchDisableCrons: mockCronApi.batchDisableCrons,
  getCronStats: mockCronApi.getCronStats,
  searchCrons: mockCronApi.searchCrons,
}))

describe('Cron Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockRpc.listCrons.mockResolvedValue([])
    mockRpc.getCronStatus.mockResolvedValue(null)
    mockRpc.listCronRuns.mockResolvedValue([])
    mockRpc.createCron.mockResolvedValue(undefined)
    mockRpc.updateCron.mockResolvedValue(undefined)
    mockRpc.deleteCron.mockResolvedValue(undefined)
    mockRpc.runCron.mockResolvedValue(undefined)
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useCronStore()

      expect(store.jobs).toEqual([])
      expect(store.status).toBeNull()
      expect(store.selectedJobId).toBeNull()
      expect(store.runs).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.statusLoading).toBe(false)
      expect(store.runsLoading).toBe(false)
      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })
  })

  describe('fetchJobs', () => {
    it('should fetch jobs successfully', async () => {
      const mockJobs = [
        { id: '1', name: 'Test Job', schedule: '* * * * *', enabled: true },
      ]
      mockRpc.listCrons.mockResolvedValue(mockJobs)

      const store = useCronStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual(mockJobs)
      expect(store.loading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle fetch error', async () => {
      mockRpc.listCrons.mockRejectedValue(new Error('Network error'))

      const store = useCronStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.lastError).toBe('Network error')
    })
  })

  describe('fetchStatus', () => {
    it('should fetch status successfully', async () => {
      const mockStatus = { totalJobs: 5, runningJobs: 2, lastRun: '2026-04-10T12:00:00Z' }
      mockRpc.getCronStatus.mockResolvedValue(mockStatus)

      const store = useCronStore()
      await store.fetchStatus()

      expect(store.status).toEqual(mockStatus)
      expect(store.statusLoading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle status fetch error', async () => {
      mockRpc.getCronStatus.mockRejectedValue(new Error('Status error'))

      const store = useCronStore()
      await store.fetchStatus()

      expect(store.status).toBeNull()
      expect(store.statusLoading).toBe(false)
      expect(store.lastError).toBe('Status error')
    })
  })

  describe('fetchOverview', () => {
    it('should refresh jobs and status together', async () => {
      const mockJobs = [{ id: '1', name: 'Overview Job', schedule: '*/5 * * * *', enabled: true }]
      const mockStatus = { totalJobs: 1, runningJobs: 0 }
      mockRpc.listCrons.mockResolvedValue(mockJobs)
      mockRpc.getCronStatus.mockResolvedValue(mockStatus)

      const store = useCronStore()
      await store.fetchOverview()

      expect(store.jobs).toEqual(mockJobs)
      expect(store.status).toEqual(mockStatus)
    })
  })

  describe('fetchRuns', () => {
    it('should fetch runs for a job', async () => {
      const mockRuns = [
        { id: 'run1', jobId: '1', status: 'success', startTime: '2026-04-10T12:00:00Z' },
      ]
      mockRpc.listCronRuns.mockResolvedValue(mockRuns)

      const store = useCronStore()
      await store.fetchRuns('1', 50)

      expect(store.selectedJobId).toBe('1')
      expect(store.runs).toEqual(mockRuns)
      expect(store.runsLoading).toBe(false)
      expect(mockRpc.listCronRuns).toHaveBeenCalledWith('1', 50)
    })

    it('should clear runs when fetch fails', async () => {
      mockRpc.listCronRuns.mockRejectedValue(new Error('Runs error'))

      const store = useCronStore()
      await store.fetchRuns('1', 10)

      expect(store.selectedJobId).toBe('1')
      expect(store.runs).toEqual([])
      expect(store.lastError).toBe('Runs error')
      expect(store.runsLoading).toBe(false)
    })
  })

  describe('createJob', () => {
    it('should create a job successfully and refresh overview', async () => {
      const store = useCronStore()
      const params = { name: 'New Job', schedule: '0 * * * *' } as any

      await store.createJob(params)

      expect(mockRpc.createCron).toHaveBeenCalledWith(params)
      expect(mockRpc.listCrons).toHaveBeenCalled()
      expect(mockRpc.getCronStatus).toHaveBeenCalled()
      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle create error', async () => {
      mockRpc.createCron.mockRejectedValue(new Error('Create failed'))

      const store = useCronStore()

      await expect(
        store.createJob({ name: 'New Job', schedule: '* * * * *' } as any),
      ).rejects.toThrow('Create failed')

      expect(store.saving).toBe(false)
      expect(store.lastError).toBe('Create failed')
    })
  })

  describe('updateJob', () => {
    it('should update a selected job and refresh its runs', async () => {
      const store = useCronStore()
      store.selectedJobId = '1'

      await store.updateJob('1', { name: 'Updated Job' } as any)

      expect(mockRpc.updateCron).toHaveBeenCalledWith('1', { name: 'Updated Job' })
      expect(mockRpc.listCrons).toHaveBeenCalled()
      expect(mockRpc.getCronStatus).toHaveBeenCalled()
      expect(mockRpc.listCronRuns).toHaveBeenCalledWith('1', 50)
      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })
  })

  describe('deleteJob', () => {
    it('should delete a selected job and clear run details', async () => {
      const store = useCronStore()
      store.selectedJobId = '1'
      store.runs = [{ id: 'run1', jobId: '1', status: 'success' }] as any

      await store.deleteJob('1')

      expect(mockRpc.deleteCron).toHaveBeenCalledWith('1')
      expect(store.selectedJobId).toBeNull()
      expect(store.runs).toEqual([])
      expect(store.saving).toBe(false)
    })
  })

  describe('runJob', () => {
    it('should run a job in force mode and refresh overview plus runs', async () => {
      const store = useCronStore()

      await store.runJob('1', 'force')

      expect(mockRpc.runCron).toHaveBeenCalledWith('1', 'force')
      expect(mockRpc.listCrons).toHaveBeenCalled()
      expect(mockRpc.getCronStatus).toHaveBeenCalled()
      expect(mockRpc.listCronRuns).toHaveBeenCalledWith('1', 50)
      expect(store.selectedJobId).toBe('1')
      expect(store.saving).toBe(false)
    })

    it('should run a job in due mode', async () => {
      const store = useCronStore()

      await store.runJob('1', 'due')

      expect(mockRpc.runCron).toHaveBeenCalledWith('1', 'due')
    })
  })

  describe('clearRuns', () => {
    it('should clear selected job and runs', () => {
      const store = useCronStore()
      store.selectedJobId = '1'
      store.runs = [{ id: 'run1', jobId: '1', status: 'success' }] as any

      store.clearRuns()

      expect(store.selectedJobId).toBeNull()
      expect(store.runs).toEqual([])
    })
  })
})
