<script setup lang="ts">
/**
 * RoleTag - Displays user role badge
 */
import { computed } from 'vue'
import { NTag } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRbacStore, type Role } from '@/stores/rbac'

const { t } = useI18n()
const rbacStore = useRbacStore()

const roleConfig = computed(() => {
  const role = rbacStore.role
  const config: Record<Role, { label: string; type: 'success' | 'info' | 'default' }> = {
    admin: { label: t('rbac.roles.admin'), type: 'success' },
    operator: { label: t('rbac.roles.operator'), type: 'info' },
    readonly: { label: t('rbac.roles.readonly'), type: 'default' },
    viewer: { label: t('rbac.roles.readonly'), type: 'default' },
  }
  return role ? config[role] : null
})
</script>

<template>
  <NTag v-if="roleConfig" :type="roleConfig.type" size="small" round :bordered="false">
    {{ roleConfig.label }}
  </NTag>
</template>
