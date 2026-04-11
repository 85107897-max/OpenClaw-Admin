/**
 * 智能搜索与筛选工具
 * 提供 Cron 任务的搜索和筛选功能
 */

export interface SearchParams {
  query?: string
  enabled?: 'all' | 'enabled' | 'disabled'
  sortBy?: 'name' | 'schedule' | 'createdAt' | 'lastRun'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface SearchResults<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CronJobFilter {
  name?: string
  schedule?: string
  enabled?: boolean
  sessionTarget?: string
  payloadKind?: string
}

/**
 * 搜索 Cron 任务
 */
export function searchCrons<T extends { [key: string]: any }>(
  jobs: T[],
  params: SearchParams
): SearchResults<T> {
  const { query, enabled, sortBy, sortOrder = 'asc', page = 1, limit = 10 } = params

  let filtered = [...jobs]

  // 关键词搜索
  if (query && query.trim()) {
    const searchQuery = query.toLowerCase().trim()
    filtered = filtered.filter((job) => {
      return (
        job.name?.toLowerCase().includes(searchQuery) ||
        job.description?.toLowerCase().includes(searchQuery) ||
        job.schedule?.toLowerCase().includes(searchQuery) ||
        job.agentId?.toLowerCase().includes(searchQuery) ||
        JSON.stringify(job.payload)?.toLowerCase().includes(searchQuery)
      )
    })
  }

  // 状态筛选
  if (enabled && enabled !== 'all') {
    const isEnabled = enabled === 'enabled'
    filtered = filtered.filter((job) => job.enabled === isEnabled)
  }

  // 排序
  if (sortBy) {
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'schedule':
          comparison = (a.schedule || '').localeCompare(b.schedule || '')
          break
        case 'createdAt':
          comparison = (a.createdAt || 0) - (b.createdAt || 0)
          break
        case 'lastRun':
          comparison = (a.lastRunAt || 0) - (b.lastRunAt || 0)
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // 分页
  const total = filtered.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const items = filtered.slice(startIndex, endIndex)

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  }
}

/**
 * 过滤 Cron 任务
 */
export function filterCrons<T extends { [key: string]: any }>(
  jobs: T[],
  filters: CronJobFilter
): T[] {
  let filtered = [...jobs]

  if (filters.name) {
    const nameFilter = filters.name.toLowerCase()
    filtered = filtered.filter((job) =>
      job.name?.toLowerCase().includes(nameFilter)
    )
  }

  if (filters.schedule) {
    const scheduleFilter = filters.schedule.toLowerCase()
    filtered = filtered.filter((job) =>
      job.schedule?.toLowerCase().includes(scheduleFilter)
    )
  }

  if (filters.enabled !== undefined) {
    filtered = filtered.filter((job) => job.enabled === filters.enabled)
  }

  if (filters.sessionTarget) {
    filtered = filtered.filter((job) => job.sessionTarget === filters.sessionTarget)
  }

  if (filters.payloadKind) {
    filtered = filtered.filter((job) => job.payload?.kind === filters.payloadKind)
  }

  return filtered
}

/**
 * 搜索历史管理
 */
export class SearchHistoryManager {
  private static readonly STORAGE_KEY = 'cron_search_history'
  private static readonly MAX_HISTORY = 10

  static getHistory(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static addHistory(query: string): void {
    if (!query || !query.trim()) return

    const history = this.getHistory()
    const trimmedQuery = query.trim()

    // 移除重复项
    const filtered = history.filter((q) => q !== trimmedQuery)
    
    // 添加到开头
    filtered.unshift(trimmedQuery)

    // 限制数量
    const limited = filtered.slice(0, this.MAX_HISTORY)

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limited))
    } catch {
      // 存储失败时忽略
    }
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch {
      // 清除失败时忽略
    }
  }

  static removeHistoryItem(query: string): void {
    const history = this.getHistory()
    const filtered = history.filter((q) => q !== query)
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch {
      // 更新失败时忽略
    }
  }
}

export default { searchCrons, filterCrons, SearchHistoryManager }
