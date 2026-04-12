<template>
  <div class="backup-restore">
    <div class="page-header">
      <h2>配置备份与恢复</h2>
      <n-space>
        <n-button type="primary" @click="handleCreateBackup">
          <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></n-icon></template>
          创建备份
        </n-button>
        <n-button type="success" @click="showRestoreDialog = true">
          <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></n-icon></template>
          恢复配置
        </n-button>
      </n-space>
    </div>

    <!-- 备份列表 -->
    <n-card title="备份列表" class="backup-list-card">
      <n-table :data="backups" :bordered="false" size="small">
        <thead>
          <tr>
            <th>备份名称</th>
            <th>备份时间</th>
            <th>备份内容</th>
            <th>文件大小</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="backup in backups" :key="backup.id">
            <td>
              <n-space align="center">
                <n-icon :component="Backup" />
                <span>{{ backup.name }}</span>
              </n-space>
            </td>
            <td>{{ backup.time }}</td>
            <td>
              <n-space>
                <n-tag v-for="item in backup.items" :key="item" size="small">{{ item }}</n-tag>
              </n-space>
            </td>
            <td>{{ backup.size }}</td>
            <td>
              <n-space>
                <n-button size="small" @click="handleDownload(backup)">下载</n-button>
                <n-button size="small" type="error" @click="handleDeleteBackup(backup)">删除</n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>
      <n-empty v-if="backups.length === 0" description="暂无备份记录" />
    </n-card>

    <!-- 创建备份对话框 -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="创建配置备份"
      style="width: 600px;"
    >
      <n-form :model="backupForm" label-placement="left" label-width="100">
        <n-form-item label="备份名称">
          <n-input v-model:value="backupForm.name" placeholder="请输入备份名称" />
        </n-form-item>
        <n-form-item label="备份内容">
          <n-checkbox-group v-model:value="backupForm.items">
            <n-space vertical>
              <n-checkbox value="config">配置文件</n-checkbox>
              <n-checkbox value="database">数据库</n-checkbox>
              <n-checkbox value="users">用户数据</n-checkbox>
              <n-checkbox value="tasks">任务数据</n-checkbox>
              <n-checkbox value="settings">系统设置</n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="压缩选项">
          <n-radio-group v-model:value="backupForm.compress">
            <n-space>
              <n-radio value="zip">ZIP</n-radio>
              <n-radio value="tar">TAR</n-radio>
              <n-radio value="none">不压缩</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleConfirmBackup">开始备份</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 恢复配置对话框 -->
    <n-modal
      v-model:show="showRestoreDialog"
      preset="card"
      title="恢复配置"
      style="width: 600px;"
    >
      <n-form :model="restoreForm" label-placement="left" label-width="100">
        <n-form-item label="选择备份">
          <n-select
            v-model:value="restoreForm.backupId"
            :options="backupOptions"
            placeholder="请选择要恢复的备份"
          />
        </n-form-item>
        <n-form-item label="恢复内容">
          <n-checkbox-group v-model:value="restoreForm.items">
            <n-space vertical>
              <n-checkbox value="config">配置文件</n-checkbox>
              <n-checkbox value="database">数据库</n-checkbox>
              <n-checkbox value="users">用户数据</n-checkbox>
              <n-checkbox value="tasks">任务数据</n-checkbox>
              <n-checkbox value="settings">系统设置</n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-alert type="warning" title="警告" show-icon>
          恢复操作将覆盖当前配置，请确保已创建新的备份。此操作不可逆！
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRestoreDialog = false">取消</n-button>
          <n-button type="error" @click="handleConfirmRestore">确认恢复</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NTable, NTag, NSpace, NButton, NIcon, NModal, NForm, NFormItem, NInput, NCheckbox, NCheckboxGroup, NRadio, NRadioGroup, NSelect, NAlert, useMessage, useDialog } from 'naive-ui'
import { Backup, Trash, Download } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()

const showCreateModal = ref(false)
const showRestoreDialog = ref(false)

const backups = ref([
  {
    id: '1',
    name: '2026-04-12 完整备份',
    time: '2026-04-12 04:30',
    items: ['config', 'database', 'users', 'tasks', 'settings'],
    size: '45.2 MB'
  },
  {
    id: '2',
    name: '2026-04-11 增量备份',
    time: '2026-04-11 23:00',
    items: ['config', 'tasks'],
    size: '12.8 MB'
  }
])

const backupForm = ref({
  name: '',
  items: [] as string[],
  compress: 'zip'
})

const restoreForm = ref({
  backupId: null as string | null,
  items: [] as string[]
})

const backupOptions = computed(() => {
  return backups.value.map(b => ({
    label: `${b.name} (${b.time}) - ${b.size}`,
    value: b.id
  }))
})

const handleCreateBackup = () => {
  backupForm.value = {
    name: `备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`,
    items: [],
    compress: 'zip'
  }
  showCreateModal.value = true
}

const handleConfirmBackup = () => {
  if (!backupForm.value.name) {
    message.warning('请输入备份名称')
    return
  }
  if (backupForm.value.items.length === 0) {
    message.warning('请选择至少一项备份内容')
    return
  }
  
  // 模拟备份过程
  message.loading('正在创建备份...')
  setTimeout(() => {
    backups.value.unshift({
      id: Date.now().toString(),
      name: backupForm.value.name,
      time: new Date().toLocaleString('zh-CN'),
      items: [...backupForm.value.items],
      size: '0 MB'
    })
    showCreateModal.value = false
    message.success('备份创建成功')
  }, 1500)
}

const handleDeleteBackup = (backup: any) => {
  dialog.warning({
    title: '删除备份',
    content: `确定要删除备份 "${backup.name}" 吗？此操作不可逆。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      backups.value = backups.value.filter(b => b.id !== backup.id)
      message.success('备份已删除')
    }
  })
}

const handleDownload = (backup: any) => {
  message.info(`正在下载备份：${backup.name}`)
}

const handleConfirmRestore = () => {
  if (!restoreForm.value.backupId) {
    message.warning('请选择要恢复的备份')
    return
  }
  if (restoreForm.value.items.length === 0) {
    message.warning('请选择至少一项恢复内容')
    return
  }
  
  dialog.warning({
    title: '确认恢复',
    content: '确定要执行恢复操作吗？当前配置将被覆盖，此操作不可逆！',
    positiveText: '确认恢复',
    negativeText: '取消',
    onPositiveClick: () => {
      message.loading('正在恢复配置...')
      setTimeout(() => {
        showRestoreDialog.value = false
        message.success('配置恢复成功，系统即将重启')
      }, 2000)
    }
  })
}
</script>

<style scoped>
.backup-restore {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.backup-list-card {
  margin-top: 20px;
}
</style>
