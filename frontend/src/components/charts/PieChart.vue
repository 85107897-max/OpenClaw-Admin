<template>
  <div ref="chartRef" class="pie-chart"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import * as ChartJS from 'chart.js'

ChartJS.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

interface Props {
  data: {
    labels: string[]
    datasets: Array<{
      data: number[]
      backgroundColor: string[]
    }>
  }
  options?: any
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({})
})

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        padding: 20,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: { size: 14 },
      bodyFont: { size: 13 },
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const label = context.label || ''
          const value = context.parsed || 0
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return `${label}: ${value} (${percentage}%)`
        }
      }
    }
  }
}

const mergedOptions = computed(() => ({
  ...defaultOptions,
  ...props.options
}))
</script>

<template>
  <Pie :data="data" :options="mergedOptions" />
</template>

<style scoped>
.pie-chart {
  height: 300px;
  width: 100%;
}
</style>
