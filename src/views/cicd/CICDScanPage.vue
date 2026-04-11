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
  NProgress,
  NSpace,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  RefreshOutline,
  ShieldCheckmarkOutline,
  WarningOutline,
  CheckmarkCircleOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

type ScanResult = {
  id: string
  pipeline_id: string
  branch: string
  commit: string
  status: 'success' | 'failed' | 'running' | 'pending'
  security_score: number
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
  }
  duration: number
  started_at: string
  completed_at: string | null
  artifacts: string[]
}

type VulnerabilityDetail = {
  id: string
  scan_id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  location: string
  description: string
  fix_suggestion: string
  detected_at: string
}

const message = useMessage()
const { t } = useI18n()

const loading = ref(false)
const scanResults = ref<ScanResult[]>([])
const selectedScan = ref<ScanResult | null>(null)
const vulnerabilities = ref<VulnerabilityDetail[]>([])
const showVulnDetail = ref(false)
const currentVuln = ref<VulnerabilityDetail | null>(null)

const mockScanResults: ScanResult[] = [
  {
    id: 'scan_001',
    pipeline_id: 'pipe_123',
    branch: 'main',
    commit: 'a1b2c3d',
    status: 'success',
    security_score: 92,
    vulnerabilities: { critical: 0, high: 1, medium: 3, low: 5 },
    duration: 180,
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 3580000).toISOString(),
    artifacts: ['report.html', 'sast.json', 'dependency-report.xml'],
  },
  {
    id: 'scan_002',
    pipeline_id: 'pipe_122',
    branch: 'develop',
    commit: 'e4f5g6h',
    status: 'success',
    security_score: 78,
    vulnerabilities: { critical: 1, high: 4, medium: 8, low: 12 },
    duration: 210,
    started_at: new Date(Date.now() - 7200000).toISOString(),
    completed_at: new Date(Date.now() - 7170000).toISOString(),
    artifacts: ['report.html', 'sast.json'],
  },
  {
    id: 'scan_003',
    pipeline_id: 'pipe_121',
    branch: 'feature/auth',
    commit: 'i7j8k9l',
    status: 'running',
    security_score: 0,
    vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
    duration: 0,
    started_at: new Date(Date.now() - 300000).toISOString(),
    completed_at: null,
    artifacts: [],
  },
]

const mockVulnerabilities: VulnerabilityDetail[] = [
  {
    id: 'vuln_001',
    scan_id: 'scan_001',
    severity: 'high',
    type: 'SQL Injection',
    location: 'src/api/user.js:45',
    description: 'User input not sanitized before SQL query',
    fix_suggestion: 'Use parameterized queries',
    detected_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'vuln_002',
    scan_id: 'scan_001',
    severity: 'medium',
    type: 'XSS',
    location: 'src/components/UserProfile.vue:78',
    description: 'innerHTML used with user data',
    fix_suggestion: 'Use textContent or DOMPurify',
    detected_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

const stats = computed(() => {
  const total = scanResults.value.length
  const success = scanResults.value.filter(s => s.status === 'success').length
  const avgScore = success > 0 
    ? Math.round(scanResults.value.filter(s => s.status === 'success').reduce((sum, s) => sum + s.security_score, 0) / success)
    : 0
  const totalVulns = scanResults.value.reduce((sum, s) => 
    sum + s.vulnerabilities.critical + s.vulnerabilities.high + 
    s.vulnerabilities.medium + s.vulnerabilities.low, 0
  )
  return { total, success, avgScore, totalVulns }
})

const scanColumns = computed<DataTableColumns<ScanResult>>(() => ([
  {
    title: 'Pipeline',
    key: 'pipeline_id',
    width: 100,
    render(row) {
      return h(NText, { depth: 3, style: 'font-size: 12px;' }, { default: () => row.pipeline_id })
    },
  },
  {
    title: 'Branch',
    key: 'branch',
    width: 120,
    render(row) {
      return h(NTag, { size: 'small', bordered: false, round: true }, { default: () => row.branch })
    },
  },
  {
    title: 'Commit',
    key: 'commit',
    width: 100,
    render(row) {
      return h(NText, { depth: 3, style: 'font-size: 12px; font-family: monospace;' }, { default: () => row.commit })
    },
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
    render(row) {
      const statusMap: Record<string, { type: 'success' | 'error' | 'warning' | 'default', label: string }> = {
        success: { type: 'success', label: 'Success' },
        failed: { type: 'error', label: 'Failed' },
        running: { type: 'warning', label: 'Running' },
        pending: { type: 'default', label: 'Pending' },
      }
      const status = statusMap[row.status]
      return h(NTag, {
        size: 'small',
        type: status.type,
        bordered: false,
        round: true,
      }, { default: () => status.label })
    },
  },
  {
    title: 'Security Score',
    key: 'security_score',
    width: 140,
    render(row) {
      if (row.status === 'running' || row.status === 'pending') {
        return h(NText, { depth: 3 }, { default: (): string => '-' })
      }
      const score = row.security_score
      const type = score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error'
      return h(NSpace, { align: 'center' }, () => [
        h(NProgress, {
          type: 'line',
          percentage: score,
          status: type,
          showText: false,
          style: 'width: 80px; height: 6px;',
        }),
        h(NText, { depth: 2 }, { default: () => `${score}` }),
      ])
    },
  },
  {
    title: 'Vulnerabilities',
    key: 'vulnerabilities',
    width: 200,
    render(row) {
      const v = row.vulnerabilities
      if (row.status === 'running' || row.status === 'pending') {
        return h(NText, { depth: 3 }, { default: (): string => '-' })
      }
      return h(NSpace, { size: 4 }, () => [
        v.critical > 0 && h(NTag, { size: 'small', type: 'error', bordered: false }, { default: (): string => `! ${v.critical}` }),
        v.high > 0 && h(NTag, { size: 'small', type: 'warning', bordered: false }, { default: (): string => `H ${v.high}` }),
        v.medium > 0 && h(NTag, { size: 'small', type: 'info', bordered: false }, { default: (): string => `M ${v.medium}` }),
        v.low > 0 && h(NTag, { size: 'small', type: 'default', bordered: false }, { default: (): string => `L ${v.low}` }),
      ])
    },
  },
  {
    title: 'Duration',
    key: 'duration',
    width: 100,
    render(row) {
      if (row.status === 'running') {
        return h(NText, { depth: 3 }, { default: (): string => '...' })
      }
      const mins = Math.floor(row.duration / 60)
      const secs = row.duration % 60
      return h(NText, { depth: 2 }, { default: (): string => `${mins}m ${secs}s` })
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    render(row) {
      if (row.status !== 'success') {
        return null
      }
      return h(NButton, {
        size: 'small',
        type: 'primary',
        secondary: true,
        onClick: () => handleViewDetails(row),
      }, { default: (): string => 'Details' })
    },
  },
]))

onMounted(() => {
  loadScans()
})

async function loadScans() {
  loading.value = true
  try {
    scanResults.value = mockScanResults
  } catch (error) {
    message.error('Failed to load scan results')
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  await loadScans()
  message.success('Scan results refreshed')
}

function handleViewDetails(scan: ScanResult) {
  selectedScan.value = scan
  vulnerabilities.value = mockVulnerabilities.filter(v => v.scan_id === scan.id)
  showVulnDetail.value = true
}

function handleViewVulnDetail(vuln: VulnerabilityDetail) {
  currentVuln.value = vuln
}
</script>

<template>
  <div class="cicd-scan-page">
    <NCard class="cicd-hero" :bordered="false">
      <template #header>
        <div class="cicd-hero-title">
          <NIcon :component="ShieldCheckmarkOutline" style="margin-right: 8px;" />
          CI/CD Security Scanning
        </div>
      </template>
      <template #header-extra>
        <NButton size="small" @click="handleRefresh">
          <template #icon>
            <NIcon :component="RefreshOutline" />
          </template>
          Refresh
        </NButton>
      </template>

      <NAlert type="info" :bordered="false">
        Security scans run automatically on each pipeline. Review results and fix vulnerabilities before merging.
      </NAlert>

      <NGrid cols="1 s:2 m:4" responsive="screen" :x-gap="10" :y-gap="10" style="margin-top: 12px;">
        <NGridItem>
          <NCard embedded :bordered="false" class="cicd-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Total Scans</NText>
              <NIcon :component="TimeOutline" />
            </NSpace>
            <div class="cicd-metric-value">{{ stats.total }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="cicd-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Success Rate</NText>
              <NIcon :component="CheckmarkCircleOutline" />
            </NSpace>
            <div class="cicd-metric-value cicd-metric-success">{{ stats.success }}/{{ stats.total }}</div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="cicd-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Avg Security Score</NText>
              <NIcon :component="ShieldCheckmarkOutline" />
            </NSpace>
            <div class="cicd-metric-value" :class="stats.avgScore >= 80 ? 'cicd-metric-success' : 'cicd-metric-warning'">
              {{ stats.avgScore }}
            </div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard embedded :bordered="false" class="cicd-metric-card">
            <NSpace justify="space-between" align="center">
              <NText depth="3">Total Vulnerabilities</NText>
              <NIcon :component="WarningOutline" />
            </NSpace>
            <div class="cicd-metric-value cicd-metric-error">{{ stats.totalVulns }}</div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard title="Scan Results" class="cicd-card">
      <NDataTable
        :columns="scanColumns"
        :data="scanResults"
        :loading="loading"
        :bordered="false"
        :pagination="{ pageSize: 10 }"
        :scroll-x="1000"
        :max-height="400"
        striped
      />
    </NCard>

    <NModal
      v-model:show="showVulnDetail"
      preset="card"
      title="Vulnerability Details"
      style="width: 800px; max-width: 90vw;"
    >
      <NAlert v-if="selectedScan" type="info" style="margin-bottom: 16px;">
        Scan: {{ selectedScan.pipeline_id }} | Branch: {{ selectedScan.branch }} | Commit: {{ selectedScan.commit }}
      </NAlert>

      <NDataTable
        :columns="[
          { title: 'Severity', key: 'severity', width: 100, render: (row: VulnerabilityDetail) => h(NTag, { size: 'small', type: row.severity === 'critical' ? 'error' : row.severity === 'high' ? 'warning' : row.severity === 'medium' ? 'info' : 'default', bordered: false }, { default: () => row.severity.toUpperCase() }) },
          { title: 'Type', key: 'type', width: 150 },
          { title: 'Location', key: 'location', width: 200, render: (row: VulnerabilityDetail) => h(NText, { depth: 2, style: 'font-family: monospace; font-size: 12px;' }, { default: () => row.location }) },
          { title: 'Description', key: 'description', minWidth: 250 },
          { title: 'Fix Suggestion', key: 'fix_suggestion', minWidth: 200 },
        ]"
        :data="vulnerabilities"
        :bordered="false"
        :pagination="false"
        :max-height="300"
        striped
      />
    </NModal>

    <NModal
      v-model:show="!!currentVuln"
      preset="card"
      title="Vulnerability Detail"
      style="width: 600px; max-width: 90vw;"
    >
      <div v-if="currentVuln">
        <NSpace vertical>
          <NTag :type="currentVuln.severity === 'critical' ? 'error' : currentVuln.severity === 'high' ? 'warning' : 'info'" size="large">
            {{ currentVuln.severity.toUpperCase() }} - {{ currentVuln.type }}
          </NTag>
          <NText><strong>Location:</strong> {{ currentVuln.location }}</NText>
          <NText><strong>Description:</strong> {{ currentVuln.description }}</NText>
          <NText><strong>Fix Suggestion:</strong> {{ currentVuln.fix_suggestion }}</NText>
          <NText depth="3"><strong>Detected:</strong> {{ new Date(currentVuln.detected_at).toLocaleString() }}</NText>
        </NSpace>
      </div>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="currentVuln = null">Close</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.cicd-scan-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cicd-hero {
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 84% 16%, rgba(24, 160, 88, 0.22), transparent 36%),
    linear-gradient(120deg, var(--bg-card), rgba(24, 160, 88, 0.08));
  border: 1px solid rgba(24, 160, 88, 0.18);
}

.cicd-hero-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: center;
}

.cicd-metric-card {
  border-radius: 10px;
}

.cicd-metric-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.cicd-metric-success {
  color: var(--color-success);
}

.cicd-metric-warning {
  color: var(--color-warning);
}

.cicd-metric-error {
  color: var(--color-error);
}

.cicd-card {
  border-radius: var(--radius-lg);
}
</style>
