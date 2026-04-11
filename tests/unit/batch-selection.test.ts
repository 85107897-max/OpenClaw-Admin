import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useBatchSelection } from '../../src/components/batch/useBatchSelection'

describe('useBatchSelection', () => {
  interface TestItem {
    id: number
    name: string
    status: string
  }

  const mockItems = ref<TestItem[]>([
    { id: 1, name: '任务 A', status: 'pending' },
    { id: 2, name: '任务 B', status: 'in_progress' },
    { id: 3, name: '任务 C', status: 'completed' },
    { id: 4, name: '任务 D', status: 'pending' },
    { id: 5, name: '任务 E', status: 'in_progress' },
  ])

  it('应该初始化空选择', () => {
    const { selectedIds, selectedCount, selectedItems } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    expect(selectedIds.value).toEqual([])
    expect(selectedCount.value).toBe(0)
    expect(selectedItems.value).toEqual([])
  })

  it('应该能够选择单个项目', () => {
    const { selectedIds, selectedCount, toggleSelect, isSelected } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    toggleSelect(1)
    expect(selectedIds.value).toEqual([1])
    expect(selectedCount.value).toBe(1)
    expect(isSelected(1)).toBe(true)
    expect(isSelected(2)).toBe(false)
  })

  it('应该能够取消选择单个项目', () => {
    const { selectedIds, toggleSelect, selectedCount } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    // 先选择
    toggleSelect(1)
    expect(selectedIds.value).toEqual([1])

    // 再取消选择
    toggleSelect(1)
    expect(selectedIds.value).toEqual([])
    expect(selectedCount.value).toBe(0)
  })

  it('应该能够选择多个项目', () => {
    const { selectedIds, selectedCount, toggleSelect } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    toggleSelect(1)
    toggleSelect(2)
    toggleSelect(3)

    expect(selectedIds.value).toEqual([1, 2, 3])
    expect(selectedCount.value).toBe(3)
  })

  it('应该能够全选', () => {
    const { selectAll, selectedCount, isAllSelected } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    selectAll()
    expect(selectedCount.value).toBe(5)
    expect(isAllSelected.value).toBe(true)
  })

  it('应该能够取消全选', () => {
    const { selectAll, deselectAll, selectedCount, isAllSelected } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    selectAll()
    expect(selectedCount.value).toBe(5)

    deselectAll()
    expect(selectedCount.value).toBe(0)
    expect(isAllSelected.value).toBe(false)
  })

  it('应该能够切换全选状态', () => {
    const { toggleSelectAll, selectedCount, isAllSelected } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    // 从未选中状态切换 -> 全选
    toggleSelectAll()
    expect(selectedCount.value).toBe(5)
    expect(isAllSelected.value).toBe(true)

    // 从全选状态切换 -> 取消全选
    toggleSelectAll()
    expect(selectedCount.value).toBe(0)
    expect(isAllSelected.value).toBe(false)
  })

  it('应该正确计算部分选中状态', () => {
    const { toggleSelect, isIndeterminate, isAllSelected } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    // 未选择
    expect(isIndeterminate.value).toBe(false)
    expect(isAllSelected.value).toBe(false)

    // 部分选择
    toggleSelect(1)
    toggleSelect(2)
    expect(isIndeterminate.value).toBe(true)
    expect(isAllSelected.value).toBe(false)

    // 全选
    toggleSelect(3)
    toggleSelect(4)
    toggleSelect(5)
    expect(isIndeterminate.value).toBe(false)
    expect(isAllSelected.value).toBe(true)
  })

  it('应该能够获取选中的项目列表', () => {
    const { selectAll, selectedItems } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    selectAll()
    expect(selectedItems.value).toHaveLength(5)
    expect(selectedItems.value[0].name).toBe('任务 A')
  })

  it('应该能够清空选择', () => {
    const { selectAll, clearSelection, selectedCount } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    selectAll()
    expect(selectedCount.value).toBe(5)

    clearSelection()
    expect(selectedCount.value).toBe(0)
  })

  it('应该能够批量设置选中项', () => {
    const { selectIds, selectedCount, selectedIds } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
    })

    selectIds([1, 3, 5])
    expect(selectedCount.value).toBe(3)
    expect(selectedIds.value).toEqual([1, 3, 5])
  })

  it('应该支持自定义 ID 字段', () => {
    const items = ref([
      { code: 'A001', name: '任务 A' },
      { code: 'A002', name: '任务 B' },
    ])

    const { toggleSelect, selectedIds, isSelected } = useBatchSelection({
      items,
      idKey: 'code',
    })

    toggleSelect('A001')
    expect(selectedIds.value).toEqual(['A001'])
    expect(isSelected('A001')).toBe(true)
    expect(isSelected('A002')).toBe(false)
  })

  it('应该支持初始选中项', () => {
    const { selectedIds, selectedCount } = useBatchSelection({
      items: mockItems,
      idKey: 'id',
      initialSelected: [1, 3],
    })

    expect(selectedIds.value).toEqual([1, 3])
    expect(selectedCount.value).toBe(2)
  })

  it('空列表时全选应该返回 false', () => {
    const emptyItems = ref<TestItem[]>([])
    const { isAllSelected } = useBatchSelection({
      items: emptyItems,
      idKey: 'id',
    })

    expect(isAllSelected.value).toBe(false)
  })
})
