/**
 * 批量操作类型定义
 */

export type BatchOperation = 'delete' | 'status' | 'export' | 'assign'

export type BatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface BatchOperationConfig {
  title: string
  confirmText: string
  warning: string
  description: string
  color: string
}

export interface BatchOperationResult {
  success: boolean
  deleted_count?: number
  updated_count?: number
  assigned_count?: number
  successCount: number
  failedCount: number
  failed_ids?: string[]
  message?: string
  data?: any[]
}

export interface BatchDeleteRequest {
  resource: string
  ids: string[]
}

export interface BatchStatusUpdateRequest {
  resource: string
  ids: string[]
  status: string
}

export interface BatchExportRequest {
  resource: string
  ids: string[]
  format: 'csv' | 'json'
  fields?: string[]
}

export interface BatchAssignRequest {
  ids: string[]
  assigneeId: string
}

export const BATCH_OPERATION_CONFIGS: Record<BatchOperation, BatchOperationConfig> = {
  delete: {
    title: '批量删除确认',
    confirmText: '确认删除',
    warning: '此操作不可逆，请谨慎操作',
    description: '您确定要删除选中的记录吗？',
    color: 'error',
  },
  status: {
    title: '批量状态变更确认',
    confirmText: '确认变更',
    warning: '变更后将同步更新所有选中记录',
    description: '您确定要变更选中记录的状态吗？',
    color: 'primary',
  },
  export: {
    title: '批量导出确认',
    confirmText: '确认导出',
    warning: '导出文件将包含所有选中记录',
    description: '您确定要导出选中的记录吗？',
    color: 'success',
  },
  assign: {
    title: '批量分配确认',
    confirmText: '确认分配',
    warning: '分配后将同步更新所有选中记录',
    description: '您确定要分配选中的记录吗？',
    color: 'primary',
  },
}
