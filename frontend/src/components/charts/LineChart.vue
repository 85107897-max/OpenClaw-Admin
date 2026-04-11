<template>
  <div ref="chartRef" class="line-chart"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as ChartJS from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

interface Props {
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
    }>
  }
  options?: any
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({})
})

const chartRef = ref<HTMLElement>()

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
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
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: { size: 12 }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: { size: 12 }
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
  <Line :data="data" :options="mergedOptions" />
</template>

<style scoped>
.line-chart {
  height: 300px;
  width: 100%;
}
</style>
