<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NPopconfirm, NDialog } from 'naive-ui'
import type { BatchOperation } from './types'

interface Props {
  visible: boolean
  operationType: BatchOperation
  selectedCount: number
  selectedItems: string[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const operationConfig = {
  delete: {
    title: '批量删除确认',
    confirmText: '确认删除',
    warning: '此操作不可逆，请谨慎操作',
    description: '您确定要删除选中的记录吗？',
    color: 'error',
  },
  status: {
    title: '批量状态变更确认',
    confirmText: '确认变更',
    warning: '变更后将同步更新所有选中记录',
    description: '您确定要变更选中记录的状态吗？',
    color: 'primary',
  },
  export: {
    title: '批量导出确认',
    confirmText: '确认导出',
    warning: '导出文件将包含所有选中记录',
    description: '您确定要导出选中的记录吗？',
    color: 'success',
  },
  assign: {
    title: '批量分配确认',
    confirmText: '确认分配',
    warning: '分配后将同步更新所有选中记录',
    description: '您确定要分配选中的记录吗？',
    color: 'primary',
  },
}

const config = operationConfig[props.operationType]

const handleClose = () => {
  emit('update:visible', false)
}

const handleConfirm = () => {
  emit('confirm')
  handleClose()
}

const handleCancel = () => {
  emit('cancel')
  handleClose()
}
</script>

<template>
  <NPopconfirm
    :show="visible"
    @update:show="handleClose"
    @positive-click="handleConfirm"
    @negative-click="handleCancel"
  >
    <template #trigger>
      <slot name="trigger" />
    </template>
    
    <div class="batch-confirm-content">
      <h3 class="confirm-title">{{ config.title }}</h3>
      <p class="description">{{ config.description }}</p>
      <p class="warning">⚠️ {{ config.warning }}</p>
      
      <div v-if="selectedItems.length > 0" class="selected-items">
        <p class="selected-count">选中的记录 ({{ selectedCount }} 项):</p>
        <ul class="items-list">
          <li v-for="(item, index) in selectedItems.slice(0, 10)" :key="index" class="item">
            {{ item }}
          </li>
          <li v-if="selectedCount > 10" class="more-items">
            ... 还有 {{ selectedCount - 10 }} 项未显示
          </li>
        </ul>
      </div>
      
      <div class="batch-confirm-actions">
        <NButton 
          size="large" 
          @click="handleCancel"
          :disabled="loading"
        >
          取消
        </NButton>
        <NButton 
          type="primary" 
          size="large" 
          :loading="loading"
          :color="config.color === 'error' ? 'red' : undefined"
          @click="handleConfirm"
        >
          {{ config.confirmText }}
        </NButton>
      </div>
    </div>
  </NPopconfirm>
</template>

<style scoped lang="scss">
.batch-confirm-content {
  padding: 16px;
  
  .confirm-title {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .description {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #666;
    line-height: 1.5;
  }
  
  .warning {
    margin: 0 0 16px 0;
    padding: 12px;
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    border-radius: 4px;
    font-size: 13px;
    color: #856404;
  }
  
  .selected-items {
    margin-top: 16px;
    padding: 12px;
    background-color: #f8f9fa;
    border-radius: 6px;
    
    .selected-count {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
    
    .items-list {
      margin: 0;
      padding: 0 0 0 20px;
      max-height: 150px;
      overflow-y: auto;
      
      .item {
        margin: 4px 0;
        font-size: 13px;
        color: #666;
        line-height: 1.4;
      }
      
      .more-items {
        margin: 8px 0 0 0;
        font-size: 12px;
        color: #999;
        font-style: italic;
      }
    }
  }
  
  .batch-confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
