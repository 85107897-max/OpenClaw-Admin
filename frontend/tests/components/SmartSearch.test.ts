import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SmartSearch from '../../src/views/SmartSearch.vue'

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
    })
  }
})

describe('SmartSearch.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders search page correctly', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.find('.smart-search').exists()).toBe(true)
    expect(wrapper.text()).toContain('智能搜索')
  })

  it('displays search box', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.find('.search-box').exists()).toBe(true)
  })

  it('displays advanced filters', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.find('.advanced-filters').exists()).toBe(true)
    expect(wrapper.text()).toContain('高级筛选')
  })

  it('displays search history when available', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.find('.search-history').exists()).toBe(true)
    expect(wrapper.text()).toContain('搜索历史')
  })

  it('displays search results', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.find('.search-results').exists()).toBe(true)
    expect(wrapper.text()).toContain('搜索结果')
  })

  it('shows result cards', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    const resultCards = wrapper.findAll('.result-card')
    expect(resultCards.length).toBeGreaterThan(0)
  })

  it('has status filter options', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.text()).toContain('待处理')
    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.text()).toContain('已完成')
  })

  it('has priority filter options', () => {
    const wrapper = mount(SmartSearch, {
      global: {
        stubs: {
          NInput: true,
          NButton: true,
          NIcon: true,
          NTag: true,
          NSpace: true,
          NSelect: true,
          NDatePicker: true,
          NCollapse: true,
          NCollapseItem: true,
          NGrid: true,
          NGi: true,
          NCard: true,
          NEllipsis: true,
          NEmpty: true
        }
      }
    })

    expect(wrapper.text()).toContain('高')
    expect(wrapper.text()).toContain('中')
    expect(wrapper.text()).toContain('低')
  })
})
