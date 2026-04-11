<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { NColorPicker, NCard, NForm, NFormItem, NSlider, NSwitch, NButton, NModal, NInput } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'light',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const showEditor = ref(false)
const customTheme = ref({
  primary: '#18a058',
  info: '#2080f0',
  success: '#18a058',
  warning: '#f0a023',
  error: '#d03050',
  textColor: '#1c1c1e',
  textColor2: '#666666',
  textColor3: '#999999',
  backgroundColor: '#ffffff',
  backgroundColor2: '#f5f5f7',
  cardColor: '#ffffff',
  borderColor: '#e5e5ea',
})

const themePresets = [
  { name: '经典绿', primary: '#18a058', bg: '#ffffff' },
  { name: '深海蓝', primary: '#0969da', bg: '#ffffff' },
  { name: '优雅紫', primary: '#8250df', bg: '#ffffff' },
  { name: '活力橙', primary: '#ff6b00', bg: '#ffffff' },
  { name: '暗夜黑', primary: '#58a6ff', bg: '#1c1c1e' },
  { name: '森林绿', primary: '#2ea043', bg: '#0d1117' },
]

function applyPreset(preset: typeof themePresets[0]) {
  customTheme.value.primary = preset.primary
  customTheme.value.backgroundColor = preset.bg
  applyTheme()
}

function applyTheme() {
  const html = document.documentElement
  const root = html.style
  
  root.setProperty('--n-color-primary', customTheme.value.primary)
  root.setProperty('--n-color-info', customTheme.value.info)
  root.setProperty('--n-color-success', customTheme.value.success)
  root.setProperty('--n-color-warning', customTheme.value.warning)
  root.setProperty('--n-color-error', customTheme.value.error)
  root.setProperty('--n-text-color', customTheme.value.textColor)
  root.setProperty('--n-text-color-2', customTheme.value.textColor2)
  root.setProperty('--n-text-color-3', customTheme.value.textColor3)
  root.setProperty('--n-color', customTheme.value.backgroundColor)
  root.setProperty('--n-color-2', customTheme.value.backgroundColor2)
  root.setProperty('--n-card-color', customTheme.value.cardColor)
  root.setProperty('--n-border-color', customTheme.value.borderColor)
  
  // Save to localStorage
  localStorage.setItem('custom-theme', JSON.stringify(customTheme.value))
  
  emit('update:modelValue', 'custom')
  emit('change', 'custom')
}

function resetToDefault() {
  customTheme.value = {
    primary: '#18a058',
    info: '#2080f0',
    success: '#18a058',
    warning: '#f0a023',
    error: '#d03050',
    textColor: '#1c1c1e',
    textColor2: '#666666',
    textColor3: '#999999',
    backgroundColor: '#ffffff',
    backgroundColor2: '#f5f5f7',
    cardColor: '#ffffff',
    borderColor: '#e5e5ea',
  }
  applyTheme()
}

function loadSavedTheme() {
  const saved = localStorage.getItem('custom-theme')
  if (saved) {
    try {
      customTheme.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load custom theme:', e)
    }
  }
}

onMounted(() => {
  loadSavedTheme()
})

defineExpose({
  applyTheme,
  resetToDefault,
  getTheme: () => customTheme.value,
  setTheme: (theme: typeof customTheme.value) => {
    customTheme.value = theme
    applyTheme()
  }
})
</script>

<template>
  <div class="custom-theme-editor">
    <NButton @click="showEditor = true" size="small">
      自定义主题
    </NButton>

    <NModal v-model:show="showEditor" preset="card" title="主题定制" style="width: 600px;">
      <div class="theme-presets">
        <div v-for="preset in themePresets" :key="preset.name" 
             class="preset-item"
             @click="applyPreset(preset)">
          <div class="preset-preview" :style="{ 
            background: preset.bg,
            borderColor: preset.primary 
          }">
            <div class="preset-color" :style="{ background: preset.primary }"></div>
          </div>
          <div class="preset-name">{{ preset.name }}</div>
        </div>
      </div>

      <NForm label-placement="left" label-width="120">
        <NFormItem label="主色调">
          <NColorPicker v-model:value="customTheme.primary" mode="hex" @update:value="applyTheme" />
        </NFormItem>
        <NFormItem label="背景色">
          <NColorPicker v-model:value="customTheme.backgroundColor" mode="hex" @update:value="applyTheme" />
        </NFormItem>
        <NFormItem label="卡片颜色">
          <NColorPicker v-model:value="customTheme.cardColor" mode="hex" @update:value="applyTheme" />
        </NFormItem>
        <NFormItem label="文字颜色">
          <NColorPicker v-model:value="customTheme.textColor" mode="hex" @update:value="applyTheme" />
        </NFormItem>
        <NFormItem label="边框颜色">
          <NColorPicker v-model:value="customTheme.borderColor" mode="hex" @update:value="applyTheme" />
        </NFormItem>
      </NForm>

      <div class="theme-actions">
        <NButton @click="resetToDefault" size="small">恢复默认</NButton>
        <NButton type="primary" @click="showEditor = false" size="small">完成</NButton>
      </div>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.custom-theme-editor {
  display: inline-block;
}

.theme-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f5f5f7;
  }
}

.preset-preview {
  width: 60px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.preset-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.preset-name {
  font-size: 12px;
  color: #666;
}

.theme-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}
</style>
