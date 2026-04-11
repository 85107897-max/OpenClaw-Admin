import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { NCheckbox, NButton, NDropdown } from 'naive-ui'
import BatchToolbar from '../../src/components/batch/BatchToolbar.vue'

// Mock naive-ui 组件
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    NCheckbox: {
      name: 'NCheckbox',
      props: ['checked', 'indeterminate', 'onUpdate:checked'],
      template: '<input type="checkbox" />',
    },
    NButton: {
      name: 'NButton',
      props: ['type', 'size', 'disabled', 'loading', 'onClick'],
      template: '<button :disabled="disabled"><slot /></button>',
    },
    NDropdown: {
      name: 'NDropdown',
      props: ['disabled', 'options', 'onSelect'],
      template: '<select :disabled="disabled"><slot /></select>',
    },
  }
})

const createWrapper = (props = {}) => {
  return mount(BatchToolbar, {
    props: {
      selectedCount: 0,
      ...props,
    },
    global: {
      stubs: {
        NDialog: true,
      },
    },
  })
}

describe('BatchToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确显示未选择状态', () => {
    const wrapper = createWrapper({ selectedCount: 0 })

    expect(wrapper.text()).toContain('全选')
    expect(wrapper.find('.selection-count').exists()).toBe(false)
    expect(wrapper.find('.batch-actions').classes()).toContain('disabled')
  })

  it('应该正确显示已选择状态', () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    expect(wrapper.find('.selection-count').text()).toContain('已选择 5 项')
    expect(wrapper.find('.batch-actions').classes()).not.toContain('disabled')
  })

  it('点击全选应该触发 selectAll 事件', async () => {
    const wrapper = createWrapper({ selectedCount: 0 })

    const checkbox = wrapper.findComponent(NCheckbox)
    await checkbox.trigger('update:checked', true)

    expect(wrapper.emitted('selectAll')).toHaveLength(1)
  })

  it('点击取消选择应该触发 deselectAll 事件', async () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const cancelButton = wrapper.find('button:contains("取消选择")')
    await cancelButton.trigger('click')

    expect(wrapper.emitted('deselectAll')).toHaveLength(1)
  })

  it('批量删除按钮在未选择时应该禁用', () => {
    const wrapper = createWrapper({ selectedCount: 0 })

    const deleteButton = wrapper.find('button:contains("批量删除")')
    expect(deleteButton.attributes('disabled')).toBeDefined()
  })

  it('批量删除按钮在已选择时应该启用', () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const deleteButton = wrapper.find('button:contains("批量删除")')
    expect(deleteButton.attributes('disabled')).toBeUndefined()
  })

  it('点击批量删除应该触发 delete 事件', async () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const deleteButton = wrapper.find('button:contains("批量删除")')
    await deleteButton.trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('状态变更下拉菜单在已选择时应该可用', () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const statusDropdown = wrapper.findComponent(NDropdown)
    expect(statusDropdown.props('disabled')).toBe(false)
  })

  it('状态变更下拉菜单在未选择时应该禁用', () => {
    const wrapper = createWrapper({ selectedCount: 0 })

    const statusDropdown = wrapper.findComponent(NDropdown)
    expect(statusDropdown.props('disabled')).toBe(true)
  })

  it('选择状态变更应该触发 statusChange 事件', async () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const statusDropdown = wrapper.findComponent(NDropdown)
    await statusDropdown.emitted('select')?.[0]?.[0]

    // 验证事件被触发
    expect(wrapper.emitted('statusChange')).toBeDefined()
  })

  it('导出按钮在已选择时应该启用', () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const exportButton = wrapper.find('button:contains("批量导出")')
    expect(exportButton.attributes('disabled')).toBeUndefined()
  })

  it('导出按钮点击应该触发 export 事件', async () => {
    const wrapper = createWrapper({ selectedCount: 5 })

    const exportButton = wrapper.find('button:contains("批量导出")')
    await exportButton.trigger('click')

    expect(wrapper.emitted('export')).toHaveLength(1)
  })

  it('加载状态应该正确显示', () => {
    const wrapper = createWrapper({ selectedCount: 5, loading: true })

    const deleteButton = wrapper.find('button:contains("批量删除")')
    expect(deleteButton.attributes('loading')).toBeDefined()
  })

  it('选中数量变化时应该更新显示', async () => {
    const wrapper = createWrapper({ selectedCount: 0 })

    await wrapper.setProps({ selectedCount: 10 })

    expect(wrapper.find('.selection-count').text()).toContain('已选择 10 项')
  })
})
