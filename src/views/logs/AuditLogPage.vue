<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NSelect,
  NSpace,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  RefreshOutline,
  SearchOutline,
  DownloadOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import DOMPurify from 'dompurify'

type AuditLog = {
  id: string
  user_id: string | null
  username: string | null
  action: string
  resource: string | null
  resource_id: string | null
  details: string
  ip_address: string | null
  user_agent: string | null
  status: 'success' | 'error'
  error_message: string | null
  created_at: number
}

type AuditLogRow = AuditLog & {
  formattedTime: string
  sanitizedDetails: string
}

const message = useMessage()
const { t } = useI18n()

const searchQuery = ref('')
const actionFilter = ref<string>('all')
const statusFilter = ref<string>('all')
const userFilter = ref<string>('all')
const dateRange = ref<{ start: string; end: string } | null>(null)
const loading = ref(false)
const auditLogs = ref<AuditLog[]>([])
const checkedRowKeys = ref<string[]>([])

// Mock data for demonstration
const mockAuditLogs: AuditLog[] = [
  {
    id: 'log_001',
    user_id: 'user_001',
    username: 'admin',
    action: 'session.delete',
    resource: 'sessions',
    resource_id: 'sess_123',
    details: JSON.stringify({ session_key: 'main/user123', deleted_by: 'admin' }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0...',
    status: 'success',
    error_message: null,
    created_at: Date.now() - 3600000,
  },
  {
    id: 'log_002',
    user_id: 'user_002',
    username: 'operator',
    action: 'agent.spawn',
    resource: 'agents',
    resource_id: 'agent_456',
    details: JSON.stringify({ agent_id: 'backend-dev', label: 'Backend Task' }),
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0...',
    status: 'success',
    error_message: null,
    created_at: Date.now() - 7200000,
  },
  {
    id: 'log_003',
    user_id: null,
    username: null,
    action: 'auth.login',
    resource: 'auth',
    resource_id: null,
    details: JSON.stringify({ username: 'unknown', ip: '10.0.0.5' }),
    ip_address: '10.0.0.5',
    user_agent: 'curl/7.68.0',
    status: 'error',
    error_message: 'Invalid credentials',
    created_at: Date.now() - 14400000,
  },
]

const actionOptions = computed<SelectOption[]>(() => [
  { label: t('logs.filters.allActions'), value: 'all' },
  { label: 'session.delete', value: 'session.delete' },
  { label: 'agent.spawn', value: 'agent.spawn' },
  { label: 'auth.login', value: 'auth.login' },
  { label: 'user.create', value: 'user.create' },
])

const statusOptions = computed<SelectOption[]>(() => [
  { label: t('logs.filters.allStatus'), value: 'all' },
  { label: t('logs.filters.success'), value: 'success' },
  { label: t('logs.filters.error'), value: 'error' },
])

const userOptions = computed<SelectOption[]>(() => {
  const users = Array.from(new Set(mockAuditLogs.map(l => l.username || 'anonymous').filter(Boolean)))
  return [
    { label: t('logs.filters.allUsers'), value: 'all' },
    ...users.map(u => ({ label: u, value: u })),
  ]
})

const filteredLogs = computed<AuditLogRow[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  
  let list = mockAuditLogs.filter(log => {
    if (actionFilter.value !== 'all' && log.action !== actionFilter.value) return false
    if (statusFilter.value !== 'all' && log.status !== statusFilter.value) return false
    if (userFilter.value !== 'all' && (log.username || 'anonymous') !== userFilter.value) return false
    
    if (!q) return true
    return [
      log.action,
      log.resource || '',
      log.username || '',
      log.ip_address || '',
      log.details,
    ].some(field => field.toLowerCase().includes(q))
  })

  return list.map(log => ({
    ...log,
    formattedTime: new Date(log.created_at).toLocaleString('zh-CN'),
    sanitizedDetails: DOMPurify.sanitize(log.details),
  })).sort((a, b) => b.created_at - a.created_at)
})

const stats = computed(() => {
  const total = mockAuditLogs.length
  const success = mockAuditLogs.filter(l => l.status === 'success').length
  const errors = mockAuditLogs.filter(l => l.status === 'error').length
  return { total, success, errors }
})

const logColumns = computed<DataTableColumns<AuditLogRow>>(() => ([
  {
    title: t('logs.columns.time'),
    key: 'formattedTime',
    width: 180,
    sorter: (a, b) => b.created_at - a.created_at,
  },
  {
    title: t('logs.columns.user'),
    key: 'username',
    width: 120,
    render(row) {
      return h(NTag, { 
        size: 'small', 
        type: row.username ? 'primary' : 'default',
        bordered: false 
      }, { default: () => row.username || 'anonymous' })
    },
  },
  {
    title: t('logs.columns.action'),
    key: 'action',
    width: 150,
    render(row) {
      return h(NText, { depth: 2 }, { default: () => row.action })
    },
  },
  {
    title: t('logs.columns.resource'),
    key: 'resource',
    width: 120,
    render(row) {
      return row.resource || '-'
    },
  },
  {
    title: t('logs.columns.status'),
    key: 'status',
    width: 100,
    render(row) {
      return h(NTag, {
        size: 'small',
        type: row.status === 'success' ? 'success' : 'error',
        bordered: false,
        round: true,
      }, { default: () => row.status === 'success' ? t('logs.filters.success') : t('logs.filters.error') })
    },
  },
  {
    title: t('logs.columns.ip'),
    key: 'ip_address',
    width: 140,
    render(row) {
      return row.ip_address || '-'
    },
  },
  {
    title: t('logs.columns.details'),
    key: 'details',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render(row) {
      return h(NText, { depth: 3, style: 'font-size: 12px; font-family: monospace;' }, {
        default: () => row.sanitizedDetails.substring(0, 100) + (row.sanitizedDetails.length > 100 ? '...' : '')
      })
    },
  },
]))

onMounted(() => {
  loadAuditLogs()
})

async function loadAuditLogs() {
  loading.value = true
  try {
    // In real implementation, fetch from API
    // const response = await fetch('/api/audit')
    // auditLogs.value = await response.json()
    auditLogs.value = mockAuditLogs
  } catch (error) {
    message.error(t('logs.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  await loadAuditLogs()
  message.success(t('logs.refreshSuccess'))
}

function clearFilters() {
  searchQuery.value = ''
  actionFilter.value = 'all'
  statusFilter.value = 'all'
  userFilter.value = 'all'
  dateRange.value = null
}

function handleExport() {
  // In real implementation, trigger CSV export
  message.success(t('logs.exportSuccess'))
}
</script>

<template>
  <div class="audit-log-page">
    <NCard class="audit-log-hero" :bordered="false">
      <template #header>
        <div class="audit-log-hero-title">
          <NIcon :component="ShieldCheckmarkOutline" style="margin-right: 8px;" />
          {{ t('logs.title') }}
        </div>
      </template>
      <template #header-extra>
        <NSpace :size="8">
          <NButton size="small" @click="handleRefresh">
            <template #icon>
              <NIcon :component="RefreshOutline" />
            </template>
            {{ t('common.refresh') }}
          </NButton>
          <NButton size="small" type="success" @click="handleExport">
            <template #icon>
              <NIcon :component="DownloadOutline" />
            </template>
            {{ t('logs.export') }}
          </NButton>
        </NSpace>
      </template>

      <NAlert type="info" :bordered="false">
        {{ t('logs.description') }}
      </NAlert>

      <NGrid cols="1 s:2 m:3" responsive="screen" :x-gap="10" :y-gap="10" style="margin-top: 12px;">
        <NGridItem>
          <NCard embedded :bordered="false" class="audit-log-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">{{ t('logs.metrics.total') }}</NText>
              <NIcon :component="SearchOutline" />
            </NSpace>
            <div class="audit-log-metric-value">{{ stats.total }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="audit-log-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">{{ t('logs.metrics.success') }}</NText>
              <NIcon :component="ShieldCheckmarkOutline" />
            </NSpace>
            <div class="audit-log-metric-value audit-log-metric-success">{{ stats.success }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="audit-log-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">{{ t('logs.metrics.errors') }}</NText>
              <NIcon :component="ShieldCheckmarkOutline" />
            </NSpace>
            <div class="audit-log-metric-value audit-log-metric-error">{{ stats.errors }}</div>
          </NCard>
        </NGridItem>
      </NGrid>

      <div class="audit-log-filter-bar">
        <NInput v-model:value="searchQuery" clearable :placeholder="t('logs.searchPlaceholder')">
          <template #prefix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>
        <NSelect v-model:value="actionFilter" :options="actionOptions" style="width: 150px;" />
        <NSelect v-model:value="statusFilter" :options="statusOptions" style="width: 120px;" />
        <NSelect v-model:value="userFilter" :options="userOptions" style="width: 150px;" />
        <NButton @click="clearFilters">{{ t('logs.clearFilters') }}</NButton>
      </div>
    </NCard>

    <NCard :title="t('logs.listTitle')" class="audit-log-card">
      <template #header-extra>
        <NText depth="3" style="font-size: 12px;">
          {{ t('logs.listCount', { current: filteredLogs.length, total: stats.total }) }}
        </NText>
      </template>

      <NDataTable
        :columns="logColumns"
        :data="filteredLogs"
        :loading="loading"
        :bordered="false"
        :pagination="{ pageSize: 15 }"
        :scroll-x="1200"
        :max-height="500"
        striped
      />
    </NCard>
  </div>
</template>

<style scoped>
.audit-log-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-log-hero {
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 84% 16%, rgba(24, 160, 88, 0.22), transparent 36%),
    linear-gradient(120deg, var(--bg-card), rgba(24, 160, 88, 0.08));
  border: 1px solid rgba(24, 160, 88, 0.18);
}

.audit-log-hero-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: center;
}

.audit-log-metric-card {
  border-radius: 10px;
}

.audit-log-metric-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.audit-log-metric-success {
  color: var(--color-success);
}

.audit-log-metric-error {
  color: var(--color-error);
}

.audit-log-filter-bar {
  margin-top: 12px;
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr)) auto;
  gap: 8px;
}

.audit-log-card {
  border-radius: var(--radius-lg);
}

@media (max-width: 1100px) {
  .audit-log-filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
