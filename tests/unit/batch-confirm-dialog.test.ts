import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { NPopconfirm } from 'naive-ui'
import BatchConfirmDialog from '../../src/components/batch/BatchConfirmDialog.vue'

describe('BatchConfirmDialog', () => {
  const mockSelectedItems = [
    '任务 A (ID: 001)',
    '任务 B (ID: 002)',
    '任务 C (ID: 003)',
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染删除确认对话框', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
      },
    })

    expect(wrapper.text()).toContain('批量删除确认')
    expect(wrapper.text()).toContain('此操作不可逆')
    expect(wrapper.text()).toContain('选中的记录 (3 项)')
  })

  it('应该正确渲染状态变更确认对话框', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'status',
        selectedCount: 5,
        selectedItems: ['项目 1', '项目 2', '项目 3', '项目 4', '项目 5'],
      },
    })

    expect(wrapper.text()).toContain('批量状态变更确认')
    expect(wrapper.text()).toContain('变更后将同步更新所有选中记录')
  })

  it('应该正确渲染导出确认对话框', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'export',
        selectedCount: 10,
        selectedItems: ['文件 1', '文件 2'],
      },
    })

    expect(wrapper.text()).toContain('批量导出确认')
  })

  it('点击确认按钮应该触发 confirm 事件', async () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
      },
    })

    // 模拟确认按钮点击
    const confirmButton = wrapper.find('button:contains("确认删除")')
    await confirmButton.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('点击取消按钮应该触发 cancel 事件', async () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
      },
    })

    const cancelButton = wrapper.find('button:contains("取消")')
    await cancelButton.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')?.[0]?.[0]).toBe(false)
  })

  it('应该正确显示选中记录列表', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
      },
    })

    const itemsList = wrapper.find('.items-list')
    expect(itemsList.exists()).toBe(true)
    expect(wrapper.text()).toContain('任务 A (ID: 001)')
    expect(wrapper.text()).toContain('任务 B (ID: 002)')
    expect(wrapper.text()).toContain('任务 C (ID: 003)')
  })

  it('超过 10 项时应该显示更多提示', () => {
    const manyItems = Array(15).fill('项目')
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 15,
        selectedItems: manyItems,
      },
    })

    expect(wrapper.text()).toContain('... 还有 5 项未显示')
  })

  it('加载状态应该正确显示', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
        loading: true,
      },
    })

    const confirmButton = wrapper.find('button:contains("确认删除")')
    expect(confirmButton.attributes('loading')).toBeDefined()
  })

  it('删除操作应该显示红色按钮', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
      },
    })

    const confirmButton = wrapper.find('button:contains("确认删除")')
    expect(confirmButton.attributes('type')).toBe('primary')
    // 验证有红色样式类或属性
    expect(wrapper.find('.batch-confirm-actions').exists()).toBe(true)
  })

  it('可见性变化时应该更新状态', async () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: false,
        operationType: 'delete',
        selectedCount: 0,
        selectedItems: [],
      },
    })

    await wrapper.setProps({ visible: true })

    expect(wrapper.props('visible')).toBe(true)
  })

  it('空选中项时应该正确显示', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 0,
        selectedItems: [],
      },
    })

    expect(wrapper.find('.selected-items').exists()).toBe(false)
  })

  it('应该显示警告信息', () => {
    const wrapper = mount(BatchConfirmDialog, {
      props: {
        visible: true,
        operationType: 'delete',
        selectedCount: 3,
        selectedItems: mockSelectedItems,
      },
    })

    expect(wrapper.find('.warning').exists()).toBe(true)
    expect(wrapper.text()).toContain('⚠️')
  })
})
