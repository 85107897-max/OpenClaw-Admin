<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  NCard, NTable, NTag, NButton, NSpace, NModal, NForm, NFormItem, 
  NInput, NSelect, NSwitch, NDescriptions, NDescriptionsItem,
  NLayout, NLayoutSider, NLayoutContent, NDivider, NInputNumber,
  type DataTableColumns
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRbacStore, type Role, type User, type Permission } from '@/stores/rbac'

const { t } = useI18n()
const rbacStore = useRbacStore()

const showUserModal = ref(false)
const showRoleModal = ref(false)
const editingUser = ref<Partial<User>>({})
const editingRole = ref<Role>('admin')

const users = ref<User[]>([
  { id: '1', username: 'admin', role: 'admin', avatar: '', createdAt: '2024-01-01' },
  { id: '2', username: 'operator1', role: 'operator', avatar: '', createdAt: '2024-01-02' },
  { id: '3', username: 'viewer1', role: 'readonly', avatar: '', createdAt: '2024-01-03' },
])

const roles: Role[] = ['admin', 'operator', 'readonly']

const roleDescriptions: Record<Role, { label: string; description: string }> = {
  admin: { 
    label: t('pages.rbac.roles.admin'), 
    description: '拥有所有权限，可以执行任何操作，包括删除和系统配置' 
  },
  operator: { 
    label: t('pages.rbac.roles.operator'), 
    description: '可以执行读写操作，但不能删除或修改系统配置' 
  },
  readonly: { 
    label: t('pages.rbac.roles.readonly'), 
    description: '只能查看数据，不能进行任何修改' 
  },
}

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    { action: 'read', resource: '*' },
    { action: 'write', resource: '*' },
    { action: 'delete', resource: '*' },
    { action: 'system.write', resource: '*' },
    { action: 'user.write', resource: '*' },
    { action: 'user.delete', resource: '*' },
  ],
  operator: [
    { action: 'read', resource: '*' },
    { action: 'write', resource: 'session' },
    { action: 'write', resource: 'cron' },
    { action: 'write', resource: 'chat' },
    { action: 'write', resource: 'model' },
    { action: 'write', resource: 'channel' },
    { action: 'write', resource: 'skill' },
    { action: 'write', resource: 'agent' },
    { action: 'write', resource: 'memory' },
    { action: 'write', resource: 'file' },
    { action: 'write', resource: 'terminal' },
    { action: 'write', resource: 'backup' },
  ],
  readonly: [
    { action: 'read', resource: '*' },
  ],
}

const roleColumns = computed<DataTableColumns<typeof roles>>(() => [
  {
    title: '角色',
    key: 'role',
    render: (role) => {
      const config = roleDescriptions[role]
      return h('div', [
        h(NTag, { type: role === 'admin' ? 'success' : role === 'operator' ? 'info' : 'default', size: 'small' }, { default: () => config.label }),
      ])
    }
  },
  {
    title: '描述',
    key: 'description',
    render: (role) => roleDescriptions[role].description
  },
  {
    title: '权限数量',
    key: 'permissionCount',
    render: (role) => rolePermissions[role].length
  }
])

const userColumns = computed<DataTableColumns<User>>(() => [
  {
    title: '用户名',
    key: 'username',
    render: (row) => h('strong', {}, row.username)
  },
  {
    title: '角色',
    key: 'role',
    render: (row) => {
      const config = roleDescriptions[row.role]
      return h(NTag, { 
        type: row.role === 'admin' ? 'success' : row.role === 'operator' ? 'info' : 'default',
        size: 'small'
      }, { default: () => config.label })
    }
  },
  {
    title: '创建时间',
    key: 'createdAt'
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(NSpace, {}, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => editUser(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteUser(row) }, { default: () => '删除' })
      ]
    })
  }
])

function editUser(user: User) {
  editingUser.value = { ...user }
  showUserModal.value = true
}

function saveUser() {
  if (!editingUser.value.id) {
    // 创建新用户
    const newUser: User = {
      id: Date.now().toString(),
      username: editingUser.value.username || 'new_user',
      role: (editingUser.value.role as Role) || 'readonly',
      avatar: '',
      createdAt: new Date().toISOString().split('T')[0]
    }
    users.value.push(newUser)
  } else {
    // 更新用户
    const index = users.value.findIndex(u => u.id === editingUser.value.id)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...editingUser.value }
    }
  }
  showUserModal.value = false
  editingUser.value = {}
}

function deleteUser(user: User) {
  if (confirm(`确定要删除用户 ${user.username} 吗？`)) {
    users.value = users.value.filter(u => u.id !== user.id)
  }
}

function viewRolePermissions(role: Role) {
  editingRole.value = role
  showRoleModal.value = true
}

const permissionsList = computed(() => {
  return rolePermissions[editingRole.value]
})

// 可视化权限矩阵
const permissionMatrix = computed(() => {
  const resources = ['session', 'cron', 'chat', 'model', 'channel', 'skill', 'agent', 'memory', 'file', 'terminal', 'backup', 'system', 'user']
  const actions = ['read', 'write', 'delete', 'system.write', 'user.write', 'user.delete']
  
  return {
    resources,
    actions,
    getPermission: (role: Role, action: string, resource: string) => {
      const perms = rolePermissions[role]
      // Check wildcard
      if (perms.some(p => p.action === '*' && p.resource === '*')) return true
      // Check specific
      if (perms.some(p => p.action === action && p.resource === resource)) return true
      // Check resource wildcard
      if (perms.some(p => p.action === action && p.resource === '*')) return true
      return false
    }
  }
})
</script>

<template>
  <NLayout has-sider style="height: calc(100vh - 60px);">
    <NLayoutSider 
      :width="250" 
      :bordered="true"
      show-trigger="arrow-circle"
      style="background: #fff;"
    >
      <div style="padding: 20px;">
        <h3>权限管理</h3>
        <NDivider />
        
        <div class="role-list">
          <div 
            v-for="role in roles" 
            :key="role"
            class="role-item"
            :class="{ active: editingRole === role }"
            @click="viewRolePermissions(role)"
          >
            <NTag :type="role === 'admin' ? 'success' : role === 'operator' ? 'info' : 'default'" size="small">
              {{ roleDescriptions[role].label }}
            </NTag>
            <span class="role-count">{{ rolePermissions[role].length }} 个权限</span>
          </div>
        </div>

        <NDivider />
        
        <h4>用户管理</h4>
        <NButton type="primary" @click="showUserModal = true" style="width: 100%; margin-top: 10px;">
          + 添加用户
        </NButton>
      </div>
    </NLayoutSider>

    <NLayoutContent style="background: #f5f5f7; padding: 20px;">
      <NCard :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span>角色权限配置</span>
        </template>
        
        <NDescriptions label-placement="left" :column="1" bordered>
          <NDescriptionsItem :label="roleDescriptions[editingRole].label">
            {{ roleDescriptions[editingRole].description }}
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <NCard :bordered="false" title="权限矩阵">
        <div class="permission-matrix">
          <table>
            <thead>
              <tr>
                <th>操作 / 资源</th>
                <th v-for="resource in permissionMatrix.resources" :key="resource">
                  {{ resource }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="action in permissionMatrix.actions" :key="action">
                <td>{{ action }}</td>
                <td v-for="resource in permissionMatrix.resources" :key="resource">
                  <NTag 
                    :type="permissionMatrix.getPermission(editingRole, action, resource) ? 'success' : 'default'"
                    size="small"
                  >
                    {{ permissionMatrix.getPermission(editingRole, action, resource) ? '✓' : '✗' }}
                  </NTag>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </NCard>

      <NCard :bordered="false" style="margin-top: 20px;" title="用户列表">
        <NTable :data="users" :columns="userColumns" :bordered="true" :single-line="false" />
      </NCard>
    </NLayoutContent>
  </NLayout>

  <!-- 用户编辑弹窗 -->
  <NModal v-model:show="showUserModal" preset="card" title="用户编辑" style="width: 500px;">
    <NForm label-placement="left" label-width="80">
      <NFormItem label="用户名">
        <NInput v-model:value="editingUser.username" placeholder="输入用户名" />
      </NFormItem>
      <NFormItem label="角色">
        <NSelect 
          v-model:value="editingUser.role" 
          :options="roles.map(r => ({ label: roleDescriptions[r].label, value: r }))"
        />
      </NFormItem>
    </NForm>
    <div style="text-align: right; margin-top: 20px;">
      <NButton @click="showUserModal = false">取消</NButton>
      <NButton type="primary" @click="saveUser" style="margin-left: 10px;">保存</NButton>
    </div>
  </NModal>

  <!-- 角色权限弹窗 -->
  <NModal v-model:show="showRoleModal" preset="card" :title="`${roleDescriptions[editingRole].label} 权限详情`" style="width: 700px;">
    <div class="permissions-list">
      <NTag 
        v-for="perm in permissionsList" 
        :key="`${perm.action}-${perm.resource}`"
        type="info"
        size="large"
        style="margin: 4px;"
      >
        {{ perm.action }} : {{ perm.resource }}
      </NTag>
    </div>
    <div style="text-align: right; margin-top: 20px;">
      <NButton @click="showRoleModal = false">关闭</NButton>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  
  &:hover {
    background: #f5f5f7;
  }
  
  &.active {
    background: #e6f7ff;
    border-color: #1890ff;
  }
  
  .role-count {
    font-size: 12px;
    color: #999;
  }
}

.permission-matrix {
  table {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      padding: 12px;
      text-align: center;
      border: 1px solid #e8e8e8;
    }
    
    th {
      background: #fafafa;
      font-weight: 600;
    }
    
    td:first-child {
      text-align: left;
      font-weight: 500;
      background: #fafafa;
    }
  }
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background: #fafafa;
  border-radius: 8px;
}
</style>
