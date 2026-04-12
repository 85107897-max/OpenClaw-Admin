<template>
  <div class="smart-search">
    <div class="search-header">
      <h3>智能搜索</h3>
      <n-tag type="info">AI 驱动</n-tag>
    </div>
    
    <div class="search-box">
      <n-input
        v-model:value="searchQuery"
        placeholder="输入关键词搜索任务、配置、文档..."
        size="large"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <n-icon :component="Search" size="18" />
        </template>
        <template #suffix>
          <n-button type="primary" @click="handleSearch">搜索</n-button>
        </template>
      </n-input>
    </div>

    <!-- 高级筛选 -->
    <div class="advanced-filters">
      <n-collapse :default-expanded-names="['filters']">
        <template #header-extra>
          <n-tag type="success">高级筛选</n-tag>
        </template>
        <n-collapse-item name="filters">
          <n-grid :cols="3" :x-gap="16">
            <n-gi>
              <n-select
                v-model:value="filterStatus"
                :options="statusOptions"
                placeholder="状态筛选"
                clearable
              />
            </n-gi>
            <n-gi>
              <n-select
                v-model:value="filterPriority"
                :options="priorityOptions"
                placeholder="优先级筛选"
                clearable
              />
            </n-gi>
            <n-gi>
              <n-date-picker
                v-model:value="dateRange"
                type="daterange"
                placeholder="日期范围"
                clearable
              />
            </n-gi>
          </n-grid>
          <n-space class="filter-actions">
            <n-button @click="handleResetFilters">重置筛选</n-button>
            <n-button type="primary" @click="handleSearch">应用筛选</n-button>
          </n-space>
        </n-collapse-item>
      </n-collapse>
    </div>

    <!-- 搜索历史 -->
    <div class="search-history" v-if="searchHistory.length > 0">
      <div class="history-header">
        <span>搜索历史</span>
        <n-button size="small" quaternary @click="clearHistory">清空</n-button>
      </div>
      <n-space class="history-tags">
        <n-tag
          v-for="(item, index) in searchHistory"
          :key="index"
          closable
          @click="loadSearch(item)"
          @close="removeHistory(index)"
        >
          {{ item }}
        </n-tag>
      </n-space>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="searchResults.length > 0">
      <div class="results-header">
        <span>搜索结果：{{ searchResults.length }} 条</span>
        <n-space>
          <n-button size="small" @click="handleExportResults">导出结果</n-button>
        </n-space>
      </div>
      <n-card
        v-for="result in searchResults"
        :key="result.id"
        class="result-card"
        hoverable
        @click="handleViewResult(result)"
      >
        <template #header>
          <span class="result-title">{{ result.title }}</span>
          <n-tag :type="getResultType(result.type)" size="small">{{ result.type }}</n-tag>
        </template>
        <div class="result-content">
          <n-ellipsis :line-clamp="2">
            {{ result.content }}
          </n-ellipsis>
        </div>
        <template #footer>
          <div class="result-meta">
            <span class="result-author">👤 {{ result.author }}</span>
            <span class="result-time">🕐 {{ result.time }}</span>
          </div>
        </template>
      </n-card>
    </div>

    <!-- 无结果提示 -->
    <div class="no-results" v-if="hasSearched && searchResults.length === 0">
      <n-empty description="没有找到相关结果，请尝试其他关键词">
        <template #icon>
          <n-icon :component="SearchOff" size="48" />
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NInput, NButton, NIcon, NTag, NSpace, NSelect, NDatePicker, NCollapse, NCollapseItem, NGrid, NGi, NCard, NEllipsis, NEmpty, useMessage } from 'naue-ui'
import { Search, SearchOff } from '@vicons/ionicons5'

const message = useMessage()

const searchQuery = ref('')
const filterStatus = ref<string | null>(null)
const filterPriority = ref<string | null>(null)
const dateRange = ref<[number, number] | null>(null)
const searchHistory = ref<string[]>(['前端开发', 'API 接口', '数据库优化'])
const hasSearched = ref(false)

const statusOptions = [
  { label: '待处理', value: '待处理' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
  { label: '已取消', value: '已取消' }
]

const priorityOptions = [
  { label: '高', value: '高' },
  { label: '中', value: '中' },
  { label: '低', value: '低' }
]

const searchResults = ref([
  {
    id: '1',
    title: '前端页面开发任务',
    type: '任务',
    content: '负责前端页面的开发和优化，包括批量操作 UI、智能搜索 UI 等功能模块的实现',
    author: '张三',
    time: '2026-04-12'
  },
  {
    id: '2',
    title: 'API 接口设计规范',
    type: '文档',
    content: 'RESTful API 接口设计规范，包含认证、授权、限流等安全策略',
    author: '李四',
    time: '2026-04-11'
  },
  {
    id: '3',
    title: '数据库性能优化方案',
    type: '配置',
    content: '针对 MySQL 数据库的性能优化方案，包括索引优化、查询优化等',
    author: '王五',
    time: '2026-04-10'
  }
])

const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }
  
  hasSearched.value = true
  
  // 添加到搜索历史
  if (!searchHistory.value.includes(searchQuery.value)) {
    searchHistory.value.unshift(searchQuery.value)
    if (searchHistory.value.length > 10) {
      searchHistory.value.pop()
    }
  }
  
  message.success(`搜索到 ${searchResults.value.length} 条结果`)
}

const handleResetFilters = () => {
  filterStatus.value = null
  filterPriority.value = null
  dateRange.value = null
  message.success('已重置筛选条件')
}

const loadSearch = (query: string) => {
  searchQuery.value = query
  handleSearch()
}

const removeHistory = (index: number) => {
  searchHistory.value.splice(index, 1)
}

const clearHistory = () => {
  searchHistory.value = []
  message.success('已清空搜索历史')
}

const getResultType = (type: string) => {
  const typeMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    '任务': 'primary',
    '文档': 'success',
    '配置': 'warning'
  }
  return typeMap[type] || 'default'
}

const handleViewResult = (result: any) => {
  message.info(`查看详情：${result.title}`)
}

const handleExportResults = () => {
  message.success('导出搜索结果...')
}
</script>

<style scoped>
.smart-search {
  padding: 20px;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.search-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.search-box {
  margin-bottom: 20px;
}

.advanced-filters {
  margin-bottom: 20px;
}

.filter-actions {
  margin-top: 16px;
  justify-content: flex-end;
}

.search-history {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
}

.history-tags {
  flex-wrap: wrap;
}

.search-results {
  margin-top: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
}

.result-card {
  margin-bottom: 12px;
  cursor: pointer;
}

.result-card:hover {
  border-color: #18a058;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
}

.result-content {
  color: #666;
  margin: 12px 0;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.no-results {
  padding: 48px 0;
  text-align: center;
}
</style>
