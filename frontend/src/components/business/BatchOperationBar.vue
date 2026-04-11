<template>
  <div class="batch-operation-bar">
    <div v-if="selectedIds.length > 0" class="selected-info">
      <n-tag type="primary">已选择 {{ selectedIds.length }} 项</n-tag>
      <n-space class="batch-actions">
        <n-button size="small" @click="$emit('batch-export')">
          <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></n-icon>导出</n-button>
        </n-button>
        <n-popconfirm @positive-click="$emit('batch-delete')">
          <template #trigger>
            <n-button size="small" type="error">批量删除</n-button>
          </template>
          确定要删除选中的 {{ selectedIds.length }} 项吗？
        </n-popconfirm>
        <n-dropdown :options="statusOptions" @select="handleStatusChange">
          <n-button size="small">批量变更状态</n-button>
        </n-dropdown>
        <n-button size="small" @click="handleClear">清空选择</n-button>
      </n-space>
    </div>
    <div v-else class="no-selection">
      <n-text depth="3">请选择项目以启用批量操作</n-text>
      <n-space class="batch-actions">
        <n-button size="small" @click="$emit('batch-export')">导出全部</n-button>
      </n-space>
    </div>
    <div class="total-info">
      <n-text depth="3">共 {{ totalItems }} 项</n-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NTag, NSpace, NText, NIcon, NPopconfirm, NDropdown, useMessage } from 'naive-ui'

interface Props {
  selectedIds: string[]
  totalItems: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'batch-delete': []
  'batch-export': []
  'batch-status-change': [status: string]
  'update:selectedIds': [ids: string[]]
}>()

const message = useMessage()

const statusOptions = [
  { label: '待处理', value: '待处理' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
  { label: '已取消', value: '已取消' }
]

const handleStatusChange = (status: string) => {
  emit('batch-status-change', status)
}

const handleClear = () => {
  emit('update:selectedIds', [])
  message.success('已清空选择')
}
</script>

<style scoped>
.batch-operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.no-selection {
  display: flex;
  align-items: center;
  gap: 16px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.total-info {
  font-size: 14px;
}
</style>
