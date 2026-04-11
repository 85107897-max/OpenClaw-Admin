import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { 
  BatchOperationResult, 
  BatchDeleteRequest, 
  BatchStatusUpdateRequest,
  BatchExportRequest,
  BatchAssignRequest,
  BatchStatus 
} from '../components/batch/types'

/**
 * 批量操作 Store
 * 管理批量操作的状态和 API 调用
 */
export const useBatchStore = defineStore('batch', () => {
  const loading = ref(false)
  const lastResult = ref<BatchOperationResult | null>(null)

  /**
   * 批量删除
   */
  async function batchDelete(request: BatchDeleteRequest): Promise<BatchOperationResult> {
    loading.value = true
    try {
      // TODO: 调用实际 API
      const response = await fetch('/api/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new Error('批量删除失败')
      }
      
      const result = await response.json()
      lastResult.value = result
      return result
    } catch (error) {
      const errorResult: BatchOperationResult = {
        success: false,
        successCount: 0,
        failedCount: request.ids.length,
        message: error instanceof Error ? error.message : '未知错误',
      }
      lastResult.value = errorResult
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量更新状态
   */
  async function batchUpdateStatus(request: BatchStatusUpdateRequest): Promise<BatchOperationResult> {
    loading.value = true
    try {
      const response = await fetch('/api/batch/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new Error('批量状态更新失败')
      }
      
      const result = await response.json()
      lastResult.value = result
      return result
    } catch (error) {
      const errorResult: BatchOperationResult = {
        success: false,
        successCount: 0,
        failedCount: request.ids.length,
        message: error instanceof Error ? error.message : '未知错误',
      }
      lastResult.value = errorResult
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量导出
   */
  async function batchExport(request: BatchExportRequest): Promise<Blob> {
    loading.value = true
    try {
      const response = await fetch('/api/batch/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new Error('批量导出失败')
      }
      
      const blob = await response.blob()
      return blob
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量分配
   */
  async function batchAssign(request: BatchAssignRequest): Promise<BatchOperationResult> {
    loading.value = true
    try {
      const response = await fetch('/api/batch/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new Error('批量分配失败')
      }
      
      const result = await response.json()
      lastResult.value = result
      return result
    } catch (error) {
      const errorResult: BatchOperationResult = {
        success: false,
        successCount: 0,
        failedCount: request.ids.length,
        message: error instanceof Error ? error.message : '未知错误',
      }
      lastResult.value = errorResult
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空上次结果
   */
  function clearLastResult() {
    lastResult.value = null
  }

  return {
    loading,
    lastResult,
    batchDelete,
    batchUpdateStatus,
    batchExport,
    batchAssign,
    clearLastResult,
  }
})

export default useBatchStore
