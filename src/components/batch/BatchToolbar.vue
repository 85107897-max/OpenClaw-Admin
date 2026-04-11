<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCheckbox, NDropdown } from 'naive-ui'
import type { BatchOperation, BatchStatus } from './types'

interface Props {
  selectedCount: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'statusChange', status: BatchStatus): void
  (e: 'export'): void
  (e: 'assign', assigneeId: string): void
  (e: 'selectAll'): void
  (e: 'deselectAll'): void
}>()

const isDisabled = computed(() => props.selectedCount === 0)

const statusOptions = [
  { label: '待处理', value: 'pending' as BatchStatus },
  { label: '进行中', value: 'in_progress' as BatchStatus },
  { label: '已完成', value: 'completed' as BatchStatus },
  { label: '已取消', value: 'cancelled' as BatchStatus },
]

const handleBatchDelete = () => {
  emit('delete')
}

const handleStatusChange = (status: BatchStatus) => {
  emit('statusChange', status)
}

const handleBatchExport = () => {
  emit('export')
}

const handleSelectAll = () => {
  emit('selectAll')
}

const handleDeselectAll = () => {
  emit('deselectAll')
}
</script>

<template>
  <div class="batch-operation-bar" :class="{ 'has-selection': selectedCount > 0 }">
    <div class="selection-info">
      <NCheckbox 
        :checked="selectedCount > 0" 
        :indeterminate="selectedCount > 0 && selectedCount < 100"
        @update:checked="handleSelectAll"
      >
        全选
      </NCheckbox>
      <span class="selection-count" v-if="selectedCount > 0">
        已选择 {{ selectedCount }} 项
      </span>
    </div>

    <div class="batch-actions" :class="{ 'disabled': isDisabled }">
      <NButton 
        type="error" 
        size="small"
        :disabled="isDisabled"
        :loading="loading"
        @click="handleBatchDelete"
      >
        批量删除
      </NButton>

      <NDropdown 
        :disabled="isDisabled"
        :options="statusOptions"
        @select="handleStatusChange"
      >
        <NButton size="small">
          批量状态变更
        </NButton>
      </NDropdown>

      <NButton 
        size="small"
        :disabled="isDisabled"
        @click="handleBatchExport"
      >
        批量导出
      </NButton>

      <NButton 
        size="small"
        :disabled="isDisabled"
        @click="handleDeselectAll"
      >
        取消选择
      </NButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.batch-operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  transition: all 0.3s ease;
  
  &.has-selection {
    background-color: #f0f7ff;
    border-bottom-color: #409eff;
  }
  
  .selection-info {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .selection-count {
      font-size: 14px;
      color: #409eff;
      font-weight: 500;
    }
  }
  
  .batch-actions {
    display: flex;
    gap: 8px;
    opacity: 0.5;
    pointer-events: none;
    transition: all 0.3s ease;
    
    &.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    
    &:not(.disabled) {
      opacity: 1;
      pointer-events: auto;
    }
  }
}
</style>
