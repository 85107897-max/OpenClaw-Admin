import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Dashboard from '../../src/views/Dashboard.vue'

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    mode: 'light',
    toggle: vi.fn(),
    setMode: vi.fn(),
  }),
}))

describe('Dashboard.vue', () => {
  it('renders dashboard layout correctly', () => {
    const wrapper = mount(Dashboard)

    expect(wrapper.find('.dashboard').exists()).toBe(true)
    expect(wrapper.text()).toContain('仪表板')
  })

  it('displays data cards', () => {
    const wrapper = mount(Dashboard)

    expect(wrapper.text()).toContain('总任务数')
    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('待处理')
  })

  it('displays charts', () => {
    const wrapper = mount(Dashboard)

    expect(wrapper.text()).toContain('用户增长趋势')
    expect(wrapper.text()).toContain('任务分布')
  })

  it('displays task table', () => {
    const wrapper = mount(Dashboard)

    expect(wrapper.text()).toContain('任务列表')
    expect(wrapper.text()).toContain('任务名称')
    expect(wrapper.text()).toContain('状态')
    expect(wrapper.text()).toContain('负责人')
  })

  it('handles batch operations', async () => {
    const wrapper = mount(Dashboard)

    // Test checkbox selection
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('displays pagination', () => {
    const wrapper = mount(Dashboard)

    expect(wrapper.find('.n-pagination').exists()).toBe(true)
  })
})
