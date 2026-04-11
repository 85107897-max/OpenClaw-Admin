/**
 * 批量操作工具函数
 * 提供批量操作的 API 调用和状态管理
 */

import { batchDeleteCrons, batchEnableCrons, batchDisableCrons, type BatchDeleteResponse, type BatchEnableResponse, type BatchDisableResponse } from '@/api/cron-api'

export interface BatchOperationResult {
  success: boolean
  totalCount: number
  successCount: number
  failedCount: number
  failedIds?: string[]
  message?: string
}

/**
 * 批量删除 Cron 任务
 */
export async function performBatchDelete(jobIds: string[]): Promise<BatchOperationResult> {
  if (!jobIds || jobIds.length === 0) {
    return {
      success: false,
      totalCount: 0,
      successCount: 0,
      failedCount: 0,
      message: '没有选中的任务',
    }
  }

  try {
    const response: BatchDeleteResponse = await batchDeleteCrons(jobIds)
    
    return {
      success: response.ok,
      totalCount: jobIds.length,
      successCount: response.deletedCount,
      failedCount: response.failedCount || 0,
      message: response.ok 
        ? `成功删除 ${response.deletedCount} 个任务`
        : '删除操作失败',
    }
  } catch (error) {
    return {
      success: false,
      totalCount: jobIds.length,
      successCount: 0,
      failedCount: jobIds.length,
      message: error instanceof Error ? error.message : '删除操作异常',
    }
  }
}

/**
 * 批量启用 Cron 任务
 */
export async function performBatchEnable(jobIds: string[]): Promise<BatchOperationResult> {
  if (!jobIds || jobIds.length === 0) {
    return {
      success: false,
      totalCount: 0,
      successCount: 0,
      failedCount: 0,
      message: '没有选中的任务',
    }
  }

  try {
    const response: BatchEnableResponse = await batchEnableCrons(jobIds)
    
    return {
      success: response.ok,
      totalCount: jobIds.length,
      successCount: response.enabledCount,
      failedCount: response.failedCount || 0,
      message: response.ok 
        ? `成功启用 ${response.enabledCount} 个任务`
        : '启用操作失败',
    }
  } catch (error) {
    return {
      success: false,
      totalCount: jobIds.length,
      successCount: 0,
      failedCount: jobIds.length,
      message: error instanceof Error ? error.message : '启用操作异常',
    }
  }
}

/**
 * 批量禁用 Cron 任务
 */
export async function performBatchDisable(jobIds: string[]): Promise<BatchOperationResult> {
  if (!jobIds || jobIds.length === 0) {
    return {
      success: false,
      totalCount: 0,
      successCount: 0,
      failedCount: 0,
      message: '没有选中的任务',
    }
  }

  try {
    const response: BatchDisableResponse = await batchDisableCrons(jobIds)
    
    return {
      success: response.ok,
      totalCount: jobIds.length,
      successCount: response.disabledCount,
      failedCount: response.failedCount || 0,
      message: response.ok 
        ? `成功禁用 ${response.disabledCount} 个任务`
        : '禁用操作失败',
    }
  } catch (error) {
    return {
      success: false,
      totalCount: jobIds.length,
      successCount: 0,
      failedCount: jobIds.length,
      message: error instanceof Error ? error.message : '禁用操作异常',
    }
  }
}

/**
 * 批量操作状态管理
 */
export class BatchOperationManager {
  private static instance: BatchOperationManager
  private isProcessing: boolean = false
  private progress: number = 0

  private constructor() {}

  static getInstance(): BatchOperationManager {
    if (!BatchOperationManager.instance) {
      BatchOperationManager.instance = new BatchOperationManager()
    }
    return BatchOperationManager.instance
  }

  isBusy(): boolean {
    return this.isProcessing
  }

  getProgress(): number {
    return this.progress
  }

  async executeBatchOperation(
    operation: 'delete' | 'enable' | 'disable',
    jobIds: string[]
  ): Promise<BatchOperationResult> {
    if (this.isProcessing) {
      return {
        success: false,
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        message: '已有批量操作正在进行中',
      }
    }

    this.isProcessing = true
    this.progress = 0

    try {
      let result: BatchOperationResult

      switch (operation) {
        case 'delete':
          result = await performBatchDelete(jobIds)
          break
        case 'enable':
          result = await performBatchEnable(jobIds)
          break
        case 'disable':
          result = await performBatchDisable(jobIds)
          break
        default:
          throw new Error('未知的批量操作类型')
      }

      this.progress = 100
      return result
    } finally {
      this.isProcessing = false
      this.progress = 0
    }
  }
}

export default BatchOperationManager
