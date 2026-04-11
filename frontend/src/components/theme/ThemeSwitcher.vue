<template>
  <div class="theme-switcher">
    <n-dropdown :options="themeOptions" @select="handleThemeChange" placement="bottom-end">
      <n-button quaternary>
        <template #icon>
          <n-icon :component="themeIcon" size="20" />
        </template>
      </n-button>
    </n-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, NDropdown, useMessage } from 'naive-ui'
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5'

interface Props {
  modelValue?: 'light' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'light'
})

const emit = defineEmits<{
  'update:modelValue': [theme: 'light' | 'dark']
}>()

const message = useMessage()

const themeOptions = [
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' }
]

const themeIcon = computed(() => {
  return props.modelValue === 'light' ? MoonOutline : SunnyOutline
})

const handleThemeChange = (theme: 'light' | 'dark') => {
  emit('update:modelValue', theme)
  message.success(`已切换到${theme === 'light' ? '浅色' : '深色'}模式`)
}
</script>

<style scoped>
.theme-switcher {
  display: flex;
  align-items: center;
}
</style>
