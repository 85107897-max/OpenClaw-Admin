<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst } from 'naive-ui'
import {
  ShieldCheckmarkOutline,
  RefreshOutline,
  AddOutline,
  TrashOutline,
  WarningOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

type WAFRule = {
  id: string
  name: string
  type: 'sql_injection' | 'xss' | 'rce' | 'path_traversal' | 'rate_limit' | 'ip_block'
  pattern: string
  action: 'block' | 'warn' | 'log'
  enabled: boolean
  priority: number
  hitCount: number
  lastHit: string | null
  createdAt: number
}

const message = useMessage()
const { t } = useI18n()

const loading = ref(false)
const showAddModal = ref(false)
const formRef = ref<FormInst | null>(null)
const editingRule = ref<WAFRule | null>(null)

const rules = ref<WAFRule[]>([
  {
    id: 'rule_001',
    name: 'SQL Injection Protection',
    type: 'sql_injection',
    pattern: "(?i)(union|select|insert|delete|drop|update).*?from|where",
    action: 'block',
    enabled: true,
    priority: 1,
    hitCount: 1247,
    lastHit: new Date(Date.now() - 3600000).toISOString(),
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'rule_002',
    name: 'XSS Attack Prevention',
    type: 'xss',
    pattern: "<script|javascript:|on\\w+\\s*=",
    action: 'block',
    enabled: true,
    priority: 2,
    hitCount: 892,
    lastHit: new Date(Date.now() - 7200000).toISOString(),
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'rule_003',
    name: 'Rate Limit - Login',
    type: 'rate_limit',
    pattern: "^/api/auth/login$",
    action: 'warn',
    enabled: true,
    priority: 10,
    hitCount: 45,
    lastHit: new Date(Date.now() - 1800000).toISOString(),
    createdAt: Date.now() - 86400000 * 15,
  },
])

const form = ref({
  name: '',
  type: 'sql_injection',
  pattern: '',
  action: 'block',
  priority: 5,
})

const typeOptions = computed(() => [
  { label: 'SQL Injection', value: 'sql_injection' },
  { label: 'XSS Attack', value: 'xss' },
  { label: 'RCE', value: 'rce' },
  { label: 'Path Traversal', value: 'path_traversal' },
  { label: 'Rate Limit', value: 'rate_limit' },
  { label: 'IP Block', value: 'ip_block' },
])

const actionOptions = computed(() => [
  { label: 'Block', value: 'block' },
  { label: 'Warn', value: 'warn' },
  { label: 'Log Only', value: 'log' },
])

const stats = computed(() => {
  const total = rules.value.length
  const enabled = rules.value.filter(r => r.enabled).length
  const totalHits = rules.value.reduce((sum, r) => sum + r.hitCount, 0)
  return { total, enabled, totalHits }
})

const ruleColumns = computed<DataTableColumns<WAFRule>>(() => ([
  {
    title: 'Name',
    key: 'name',
    minWidth: 200,
    render(row) {
      return h(NText, { depth: 2 }, { default: () => row.name })
    },
  },
  {
    title: 'Type',
    key: 'type',
    width: 140,
    render(row) {
      const typeMap: Record<string, string> = {
        sql_injection: 'SQL Injection',
        xss: 'XSS',
        rce: 'RCE',
        path_traversal: 'Path Traversal',
        rate_limit: 'Rate Limit',
        ip_block: 'IP Block',
      }
      return h(NTag, {
        size: 'small',
        type: 'primary',
        bordered: false,
        round: true,
      }, { default: () => typeMap[row.type] || row.type })
    },
  },
  {
    title: 'Pattern',
    key: 'pattern',
    minWidth: 250,
    ellipsis: { tooltip: true },
    render(row) {
      return h(NText, { depth: 3, style: 'font-family: monospace; font-size: 12px;' }, {
        default: () => row.pattern
      })
    },
  },
  {
    title: 'Action',
    key: 'action',
    width: 100,
    render(row) {
      const actionMap: Record<string, string> = { block: 'Block', warn: 'Warn', log: 'Log' }
      const actionType: Record<string, 'error' | 'warning' | 'info'> = { block: 'error', warn: 'warning', log: 'info' }
      return h(NTag, {
        size: 'small',
        type: actionType[row.action],
        bordered: false,
        round: true,
      }, { default: () => actionMap[row.action] || row.action })
    },
  },
  {
    title: 'Status',
    key: 'enabled',
    width: 100,
    render(row) {
      return h(NTag, {
        size: 'small',
        type: row.enabled ? 'success' : 'default',
        bordered: false,
        round: true,
      }, { default: () => row.enabled ? 'Active' : 'Disabled' })
    },
  },
  {
    title: 'Hits',
    key: 'hitCount',
    width: 100,
    render(row) {
      return h(NText, { depth: 2 }, { default: () => row.hitCount.toLocaleString() })
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    render(row) {
      return h(NSpace, { size: 8 }, () => [
        h(NSwitch, {
          size: 'small',
          value: row.enabled,
          onUpdateValue: (v: boolean) => handleToggleRule(row, v),
        }),
        h(
          NPopconfirm,
          { onPositiveClick: () => handleDelete(row) },
          {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
              secondary: true,
            }, { default: () => 'Delete' }),
            default: () => 'Confirm delete this rule?',
          }
        ),
      ])
    },
  },
]))

onMounted(() => {
  loadRules()
})

async function loadRules() {
  loading.value = true
  try {
    rules.value = rules.value
  } catch (error) {
    message.error('Failed to load rules')
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  await loadRules()
  message.success('Rules refreshed')
}

function openAddModal() {
  editingRule.value = null
  form.value = {
    name: '',
    type: 'sql_injection',
    pattern: '',
    action: 'block',
    priority: 5,
  }
  showAddModal.value = true
}

function handleToggleRule(rule: WAFRule, enabled: boolean) {
  rule.enabled = enabled
  message.success(`Rule ${enabled ? 'enabled' : 'disabled'}`)
}

function handleDelete(rule: WAFRule) {
  rules.value = rules.value.filter(r => r.id !== rule.id)
  message.success('Rule deleted')
}

function handleSubmit() {
  if (editingRule.value) {
    const index = rules.value.findIndex(r => r.id === editingRule.value!.id)
    if (index !== -1) {
      rules.value[index] = { ...rules.value[index], ...form.value }
    }
  } else {
    const newRule: WAFRule = {
      id: `rule_${Date.now()}`,
      ...form.value,
      hitCount: 0,
      lastHit: null,
      createdAt: Date.now(),
      enabled: true,
    }
    rules.value.push(newRule)
  }
  showAddModal.value = false
  message.success('Rule saved')
}
</script>

<template>
  <div class="waf-rules-page">
    <NCard class="waf-hero" :bordered="false">
      <template #header>
        <div class="waf-hero-title">
          <NIcon :component="ShieldCheckmarkOutline" style="margin-right: 8px;" />
          WAF Rules Management
        </div>
      </template>
      <template #header-extra>
        <NSpace :size="8">
          <NButton size="small" @click="handleRefresh">
            <template #icon>
              <NIcon :component="RefreshOutline" />
            </template>
            Refresh
          </NButton>
          <NButton size="small" type="primary" @click="openAddModal">
            <template #icon>
              <NIcon :component="AddOutline" />
            </template>
            Add Rule
          </NButton>
        </NSpace>
      </template>

      <NAlert type="warning" :bordered="false">
        <template #icon>
          <NIcon :component="WarningOutline" />
        </template>
        WAF rules protect against common web attacks. Be careful when modifying patterns.
      </NAlert>

      <NGrid cols="1 s:3" responsive="screen" :x-gap="10" :y-gap="10" style="margin-top: 12px;">
        <NGridItem>
          <NCard embedded :bordered="false" class="waf-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Total Rules</NText>
              <NIcon :component="ShieldCheckmarkOutline" />
            </NSpace>
            <div class="waf-metric-value">{{ stats.total }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="waf-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Active Rules</NText>
              <NIcon :component="ShieldCheckmarkOutline" />
            </NSpace>
            <div class="waf-metric-value waf-metric-success">{{ stats.enabled }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="waf-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Total Hits</NText>
              <NIcon :component="WarningOutline" />
            </NSpace>
            <div class="waf-metric-value">{{ stats.totalHits.toLocaleString() }}</div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard title="WAF Rules" class="waf-card">
      <NDataTable
        :columns="ruleColumns"
        :data="rules"
        :loading="loading"
        :bordered="false"
        :pagination="{ pageSize: 15 }"
        :scroll-x="1200"
        :max-height="500"
        striped
      />
    </NCard>

    <NModal
      v-model:show="showAddModal"
      preset="card"
      :title="editingRule ? 'Edit Rule' : 'Add Rule'"
      style="width: 600px; max-width: 90vw;"
      :mask-closable="false"
    >
      <NForm ref="formRef" label-placement="left" label-width="100">
        <NFormItem label="Rule Name">
          <NInput v-model:value="form.name" placeholder="e.g., SQL Injection Protection" />
        </NFormItem>
        <NFormItem label="Type">
          <NSelect v-model:value="form.type" :options="typeOptions" />
        </NFormItem>
        <NFormItem label="Pattern">
          <NInput v-model:value="form.pattern" type="textarea" :rows="3" placeholder="Regex pattern" />
        </NFormItem>
        <NFormItem label="Action">
          <NSelect v-model:value="form.action" :options="actionOptions" />
        </NFormItem>
        <NFormItem label="Priority">
          <NInput v-model:value="form.priority" type="number" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAddModal = false">Cancel</NButton>
          <NButton type="primary" @click="handleSubmit">Save</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.waf-rules-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.waf-hero {
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 84% 16%, rgba(24, 160, 88, 0.22), transparent 36%),
    linear-gradient(120deg, var(--bg-card), rgba(24, 160, 88, 0.08));
  border: 1px solid rgba(24, 160, 88, 0.18);
}

.waf-hero-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: center;
}

.waf-metric-card {
  border-radius: 10px;
}

.waf-metric-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.waf-metric-success {
  color: var(--color-success);
}

.waf-card {
  border-radius: var(--radius-lg);
}
</style>
