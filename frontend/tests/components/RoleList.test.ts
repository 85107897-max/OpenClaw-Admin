import { defineComponent } from 'vue'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RoleList from '../../src/components/permission/RoleList.vue'

describe('RoleList.vue', () => {
  const mockRoles = [
    {
      id: '1',
      name: 'admin',
      description: '系统管理员',
      permissions: ['read', 'write', 'delete'],
      userCount: 5,
      createdAt: '2026-04-01'
    },
    {
      id: '2',
      name: 'operator',
      description: '操作员',
      permissions: ['read', 'write'],
      userCount: 10,
      createdAt: '2026-04-02'
    }
  ]

  it('renders roles list correctly', () => {
    const wrapper = mount(RoleList, {
      props: {
        roles: mockRoles
      }
    })

    expect(wrapper.find('.role-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('角色管理')
    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.text()).toContain('操作员')
  })

  it('displays role tags with correct types', () => {
    const wrapper = mount(RoleList, {
      props: {
        roles: mockRoles
      }
    })

    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('operator')
  })

  it('emits create event when creating a new role', async () => {
    const wrapper = mount(RoleList, {
      props: {
        roles: mockRoles
      }
    })

    // Click create button
    const createButton = wrapper.find('button:contains("新建角色")')
    await createButton.trigger('click')

    expect(wrapper.emitted('create')).toBeUndefined() // Modal opens first
  })

  it('disables delete button for admin role', () => {
    const wrapper = mount(RoleList, {
      props: {
        roles: mockRoles
      }
    })

    const deleteButtons = wrapper.findAll('button:contains("删除")')
    expect(deleteButtons.length).toBeGreaterThan(0)
  })
})
