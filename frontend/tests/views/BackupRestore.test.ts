import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BackupRestore from '../src/views/BackupRestore.vue'

// Mock naive-ui components
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    useMessage: () => ({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }),
    useDialog: () => ({
      warning: vi.fn(),
      success: vi.fn()
    })
  }
})

describe('BackupRestore.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders backup restore page correctly', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.find('.backup-restore').exists()).toBe(true)
    expect(wrapper.text()).toContain('配置备份与恢复')
  })

  it('displays backup list', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.find('.backup-list-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('备份列表')
  })

  it('displays backup items with correct columns', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.text()).toContain('备份名称')
    expect(wrapper.text()).toContain('备份时间')
    expect(wrapper.text()).toContain('备份内容')
    expect(wrapper.text()).toContain('文件大小')
    expect(wrapper.text()).toContain('操作')
  })

  it('displays create backup button', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.text()).toContain('创建备份')
  })

  it('displays restore backup button', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.text()).toContain('恢复配置')
  })

  it('shows backup items in table', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    // Check that backup data is displayed
    expect(wrapper.text()).toContain('2026-04-12 完整备份')
    expect(wrapper.text()).toContain('2026-04-11 增量备份')
  })

  it('displays backup content tags', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.text()).toContain('配置文件')
    expect(wrapper.text()).toContain('数据库')
  })

  it('has download and delete buttons for each backup', () => {
    const wrapper = mount(BackupRestore, {
      global: {
        stubs: {
          NCard: true,
          NTable: true,
          NTag: true,
          NSpace: true,
          NButton: true,
          NIcon: true,
          NModal: true,
          NForm: true,
          NFormItem: true,
          NInput: true,
          NCheckbox: true,
          NCheckboxGroup: true,
          NRadio: true,
          NRadioGroup: true,
          NSelect: true,
          NAlert: true
        }
      }
    })

    expect(wrapper.text()).toContain('下载')
    expect(wrapper.text()).toContain('删除')
  })
})
