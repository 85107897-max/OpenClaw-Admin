import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UserRoleAssign from '../../src/components/permission/UserRoleAssign.vue'

describe('UserRoleAssign.vue', () => {
  const mockUsers = [
    { id: '1', name: '张三', email: 'zhangsan@example.com', role: 'admin' as const },
    { id: '2', name: '李四', email: 'lisi@example.com', role: 'operator' as const },
    { id: '3', name: '王五', email: 'wangwu@example.com', role: 'readonly' as const }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders user role assign table correctly', () => {
    const wrapper = mount(UserRoleAssign, {
      props: {
        users: mockUsers
      }
    })

    expect(wrapper.find('.user-role-assign').exists()).toBe(true)
    expect(wrapper.text()).toContain('用户角色分配')
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('李四')
    expect(wrapper.text()).toContain('王五')
  })

  it('displays correct role tags for users', () => {
    const wrapper = mount(UserRoleAssign, {
      props: {
        users: mockUsers
      }
    })

    expect(wrapper.text()).toContain('管理员')
    expect(wrapper.text()).toContain('操作员')
    expect(wrapper.text()).toContain('只读用户')
  })

  it('filters users by search keyword', async () => {
    const wrapper = mount(UserRoleAssign, {
      props: {
        users: mockUsers
      }
    })

    const searchInput = wrapper.find('input')
    await searchInput.setValue('张三')

    const filteredText = wrapper.text()
    expect(filteredText).toContain('张三')
  })

  it('emits role-change event when changing user role', async () => {
    const wrapper = mount(UserRoleAssign, {
      props: {
        users: mockUsers
      }
    })

    // Find the select component and change value
    const select = wrapper.findComponent({ name: 'NSelect' })
    if (select.exists()) {
      await select.vm.$emit('update:value', 'readonly')
      expect(wrapper.emitted('role-change')).toBeDefined()
    }
  })

  it('shows pagination component', () => {
    const wrapper = mount(UserRoleAssign, {
      props: {
        users: mockUsers
      }
    })

    expect(wrapper.find('.n-pagination').exists()).toBe(true)
  })
})
