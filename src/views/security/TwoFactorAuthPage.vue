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
  NSpace,
  NSwitch,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst } from 'naive-ui'
import {
  ShieldCheckmarkOutline,
  ShieldOutline,
  RefreshOutline,
  AddOutline,
  TrashOutline,
  QrCodeOutline,
  CheckmarkCircleOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

type TwoFactorMethod = {
  id: string
  type: 'totp' | 'sms' | 'email' | 'webauthn'
  name: string
  status: 'active' | 'pending' | 'inactive'
  lastUsed: string | null
  createdAt: number
  isPrimary: boolean
}

const message = useMessage()
const { t } = useI18n()

const loading = ref(false)
const showSetupModal = ref(false)
const setupMethod = ref<'totp' | 'sms' | 'email' | 'webauthn'>('totp')
const setupFormRef = ref<FormInst | null>(null)
const verifying = ref(false)
const verificationCode = ref('')

const methods = ref<TwoFactorMethod[]>([
  {
    id: 'method_001',
    type: 'totp',
    name: 'Google Authenticator',
    status: 'active',
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
    createdAt: Date.now() - 86400000 * 7,
    isPrimary: true,
  },
  {
    id: 'method_002',
    type: 'sms',
    name: '+86 138****1234',
    status: 'inactive',
    lastUsed: null,
    createdAt: Date.now() - 86400000 * 3,
    isPrimary: false,
  },
])

const setupForm = ref({
  code: '',
  phone: '',
  email: '',
})

const methodOptions = computed(() => [
  { label: t('2fa.methods.totp'), value: 'totp' },
  { label: t('2fa.methods.sms'), value: 'sms' },
  { label: t('2fa.methods.email'), value: 'email' },
  { label: t('2fa.methods.webauthn'), value: 'webauthn' },
])

const stats = computed(() => {
  const total = methods.value.length
  const active = methods.value.filter(m => m.status === 'active').length
  const primary = methods.value.find(m => m.isPrimary)
  return { total, active, primary: primary?.name || t('2fa.none') }
})

const methodColumns = computed<DataTableColumns<TwoFactorMethod>>(() => ([
  {
    title: t('2fa.columns.method'),
    key: 'type',
    width: 120,
    render(row) {
      const typeMap: Record<string, string> = {
        totp: 'TOTP',
        sms: 'SMS',
        email: 'Email',
        webauthn: 'WebAuthn',
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
    title: t('2fa.columns.name'),
    key: 'name',
    minWidth: 180,
    render(row) {
      return h(NSpace, { align: 'center' }, () => [
        h(NText, { depth: 2 }, { default: () => row.name }),
        row.isPrimary && h(NTag, {
          size: 'small',
          type: 'success',
          bordered: false,
          round: true,
        }, { default: () => t('2fa.primary') }),
      ])
    },
  },
  {
    title: t('2fa.columns.status'),
    key: 'status',
    width: 100,
    render(row) {
      return h(NTag, {
        size: 'small',
        type: row.status === 'active' ? 'success' : 'default',
        bordered: false,
        round: true,
      }, { default: () => row.status === 'active' ? t('2fa.active') : t('2fa.inactive') })
    },
  },
  {
    title: t('2fa.columns.lastUsed'),
    key: 'lastUsed',
    width: 180,
    render(row) {
      return row.lastUsed ? new Date(row.lastUsed).toLocaleString('zh-CN') : t('2fa.never')
    },
  },
  {
    title: t('2fa.columns.actions'),
    key: 'actions',
    width: 150,
    render(row) {
      return h(NSpace, { size: 8 }, () => [
        !row.isPrimary && row.status === 'active' && h(
          NPopconfirm,
          { onPositiveClick: () => handleDisable(row) },
          {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'warning',
              secondary: true,
            }, { default: () => t('2fa.disable') }),
            default: () => t('2fa.confirmDisable'),
          }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => handleDelete(row) },
          {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
              secondary: true,
            }, { default: () => t('common.delete') }),
            default: () => t('2fa.confirmDelete'),
          }
        ),
      ])
    },
  },
]))

onMounted(() => {
  loadMethods()
})

async function loadMethods() {
  loading.value = true
  try {
    // In real implementation, fetch from API
    // const response = await fetch('/api/auth/2fa/methods')
    // methods.value = await response.json()
  } catch (error) {
    message.error(t('2fa.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  await loadMethods()
  message.success(t('common.refreshSuccess'))
}

function openSetupModal(method: 'totp' | 'sms' | 'email' | 'webauthn') {
  setupMethod.value = method
  setupForm.value = { code: '', phone: '', email: '' }
  showSetupModal.value = true
}

function handleDisable(method: TwoFactorMethod) {
  // In real implementation, call API to disable
  methods.value = methods.value.filter(m => m.id !== method.id)
  message.success(t('2fa.disabled'))
}

function handleDelete(method: TwoFactorMethod) {
  methods.value = methods.value.filter(m => m.id !== method.id)
  message.success(t('2fa.deleted'))
}

async function handleSubmitSetup() {
  verifying.value = true
  try {
    // In real implementation, verify code and enable 2FA
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newMethod: TwoFactorMethod = {
      id: `method_${Date.now()}`,
      type: setupMethod.value,
      name: setupMethod.value === 'totp' ? 'TOTP App' : 
            setupMethod.value === 'sms' ? `+86 ${setupForm.value.phone.slice(-4)}` :
            setupMethod.value === 'email' ? setupForm.value.email : 'WebAuthn',
      status: 'active',
      lastUsed: null,
      createdAt: Date.now(),
      isPrimary: methods.value.filter(m => m.status === 'active').length === 0,
    }
    
    methods.value.push(newMethod)
    showSetupModal.value = false
    message.success(t('2fa.setupSuccess'))
  } catch (error) {
    message.error(t('2fa.setupFailed'))
  } finally {
    verifying.value = false
  }
}
</script>

<template>
  <div class="two-factor-auth-page">
    <NCard class="two-factor-hero" :bordered="false">
      <template #header>
        <div class="two-factor-hero-title">
          <NIcon :component="ShieldCheckmarkOutline" style="margin-right: 8px;" />
          {{ t('2fa.title') }}
        </div>
      </template>
      <template #header-extra>
        <NButton size="small" type="primary" @click="openSetupModal('totp')">
          <template #icon>
            <NIcon :component="AddOutline" />
          </template>
          {{ t('2fa.addMethod') }}
        </NButton>
      </template>

      <NAlert type="info" :bordered="false">
        {{ t('2fa.description') }}
      </NAlert>

      <NGrid cols="1 s:3" responsive="screen" :x-gap="10" :y-gap="10" style="margin-top: 12px;">
        <NGridItem>
          <NCard embedded :bordered="false" class="two-factor-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">{{ t('2fa.metrics.total') }}</NText>
              <NIcon :component="ShieldOutline" />
            </NSpace>
            <div class="two-factor-metric-value">{{ stats.total }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="two-factor-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">{{ t('2fa.metrics.active') }}</NText>
              <NIcon :component="CheckmarkCircleOutline" />
            </NSpace>
            <div class="two-factor-metric-value two-factor-metric-success">{{ stats.active }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="two-factor-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">{{ t('2fa.metrics.primary') }}</NText>
              <NIcon :component="QrCodeOutline" />
            </NSpace>
            <div class="two-factor-metric-value">{{ stats.primary }}</div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard :title="t('2fa.methodsList')" class="two-factor-card">
      <NDataTable
        :columns="methodColumns"
        :data="methods"
        :loading="loading"
        :bordered="false"
        :pagination="{ pageSize: 10 }"
        :scroll-x="800"
        :max-height="400"
        striped
      />
    </NCard>

    <NModal
      v-model:show="showSetupModal"
      preset="card"
      :title="t('2fa.setupTitle')"
      style="width: 480px; max-width: 90vw;"
      :mask-closable="false"
    >
      <NForm ref="setupFormRef" label-placement="left" label-width="100">
        <NFormItem v-if="setupMethod === 'totp'" :label="t('2fa.totpSetup')">
          <NAlert type="info" style="margin-bottom: 12px;">
            <template #icon>
              <NIcon :component="QrCodeOutline" />
            </template>
            {{ t('2fa.totpInstructions') }}
          </NAlert>
          <NInput v-model:value="setupForm.code" :placeholder="t('2fa.codePlaceholder')" maxlength="6" />
        </NFormItem>
        <NFormItem v-if="setupMethod === 'sms'" :label="t('2fa.phone')">
          <NInput v-model:value="setupForm.phone" placeholder="+86 13800138000" />
        </NFormItem>
        <NFormItem v-if="setupMethod === 'email'" :label="t('2fa.email')">
          <NInput v-model:value="setupForm.email" placeholder="user@example.com" />
        </NFormItem>
        <NFormItem v-if="setupMethod === 'webauthn'" :label="t('2fa.webauthn')">
          <NAlert type="info">
            {{ t('2fa.webauthnInstructions') }}
          </NAlert>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSetupModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="verifying" @click="handleSubmitSetup">
            {{ t('2fa.verifyAndEnable') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.two-factor-auth-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.two-factor-hero {
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 84% 16%, rgba(24, 160, 88, 0.22), transparent 36%),
    linear-gradient(120deg, var(--bg-card), rgba(24, 160, 88, 0.08));
  border: 1px solid rgba(24, 160, 88, 0.18);
}

.two-factor-hero-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: center;
}

.two-factor-metric-card {
  border-radius: 10px;
}

.two-factor-metric-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.two-factor-metric-success {
  color: var(--color-success);
}

.two-factor-card {
  border-radius: var(--radius-lg);
}
</style>
