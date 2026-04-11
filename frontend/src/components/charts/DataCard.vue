<template>
  <div class="data-card">
    <div class="card-header">
      <span class="card-icon">{{ icon }}</span>
      <span class="card-title">{{ title }}</span>
    </div>
    <div class="card-body">
      <div class="card-value">{{ formatValue(value) }}</div>
      <div class="card-trend" :class="trendClass">
        <n-icon :component="trendIcon" />
        <span>{{ trend }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { ArrowUp, ArrowDown } from '@vicons/ionicons5'

interface Props {
  title: string
  value: number | string
  trend?: number
  icon?: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  trend: 0,
  icon: '📊',
  color: '#18a058'
})

const trendClass = computed(() => {
  if (props.trend > 0) return 'trend-up'
  if (props.trend < 0) return 'trend-down'
  return 'trend-flat'
})

const trendIcon = computed(() => {
  if (props.trend > 0) return ArrowUp
  if (props.trend < 0) return ArrowDown
  return null
})

const formatValue = (val: number | string) => {
  if (typeof val === 'number') {
    return val.toLocaleString()
  }
  return val
}
</script>

<style scoped>
.data-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.data-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-icon {
  font-size: 24px;
}

.card-title {
  font-size: 14px;
  color: #666;
}

.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}

.trend-up {
  color: #18a058;
  background: rgba(24, 160, 88, 0.1);
}

.trend-down {
  color: #d03050;
  background: rgba(208, 48, 80, 0.1);
}

.trend-flat {
  color: #666;
  background: rgba(102, 102, 102, 0.1);
}
</style>
