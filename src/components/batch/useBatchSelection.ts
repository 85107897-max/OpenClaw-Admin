import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * 批量选择逻辑 Composable
 * 提供复选框选择、全选、批量操作等核心功能
 */
export interface BatchSelectionOptions<T> {
  /** 数据列表 */
  items: Ref<T[]>
  /** 唯一标识字段名，默认为 'id' */
  idKey?: string
  /** 初始选中的 ID 列表 */
  initialSelected?: string[] | number[]
}

export interface BatchSelectionReturn<T> {
  /** 当前选中的项目 ID 列表 */
  selectedIds: Ref<(string | number)[]>
  /** 当前选中的项目列表 */
  selectedItems: ComputedRef<T[]>
  /** 选中数量 */
  selectedCount: ComputedRef<number>
  /** 是否全选 */
  isAllSelected: ComputedRef<boolean>
  /** 是否部分选中 */
  isIndeterminate: ComputedRef<boolean>
  /** 选择单个项目 */
  toggleSelect: (id: string | number) => void
  /** 切换全选状态 */
  toggleSelectAll: () => void
  /** 选择全部 */
  selectAll: () => void
  /** 取消全选 */
  deselectAll: () => void
  /** 检查项目是否被选中 */
  isSelected: (id: string | number) => boolean
  /** 清空选择 */
  clearSelection: () => void
  /** 批量更新选中项 */
  selectIds: (ids: (string | number)[]) => void
}

export function useBatchSelection<T extends Record<string, unknown>>(
  options: BatchSelectionOptions<T>
): BatchSelectionReturn<T> {
  const { items, idKey = 'id', initialSelected = [] } = options
  
  const selectedIds = ref<(string | number)[]>([...initialSelected])

  const selectedItems = computed(() => {
    const selectedIdsSet = new Set(selectedIds.value)
    return items.value.filter(item => selectedIdsSet.has(item[idKey] as string | number))
  })

  const selectedCount = computed(() => selectedIds.value.length)

  const isAllSelected = computed(() => {
    if (items.value.length === 0) return false
    const itemIds = items.value.map(item => item[idKey] as string | number)
    return itemIds.every(id => selectedIds.value.includes(id))
  })

  const isIndeterminate = computed(() => {
    if (items.value.length === 0) return false
    return selectedCount.value > 0 && !isAllSelected.value
  })

  const getItemId = (item: T): string | number => { const key = item[idKey]; return key as string | number; }

  const toggleSelect = (id: string | number) => {
    const index = selectedIds.value.indexOf(id)
    if (index === -1) {
      selectedIds.value.push(id)
    } else {
      selectedIds.value.splice(index, 1)
    }
  }

  const toggleSelectAll = () => {
    if (isAllSelected.value) {
      deselectAll()
    } else {
      selectAll()
    }
  }

  const selectAll = () => {
    selectedIds.value = items.value.map(item => getItemId(item))
  }

  const deselectAll = () => {
    selectedIds.value = []
  }

  const isSelected = (id: string | number): boolean => {
    return selectedIds.value.includes(id)
  }

  const clearSelection = () => {
    selectedIds.value = []
  }

  const selectIds = (ids: (string | number)[]) => {
    selectedIds.value = [...ids]
  }

  return {
    selectedIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    toggleSelect,
    toggleSelectAll,
    selectAll,
    deselectAll,
    isSelected,
    clearSelection,
    selectIds,
  }
}

export default useBatchSelection
