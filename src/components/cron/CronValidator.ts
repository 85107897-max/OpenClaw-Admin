/**
 * Cron 表达式验证工具
 * 提供 Cron 表达式的验证和解析功能
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  parsed?: {
    minutes: number[]
    hours: number[]
    daysOfMonth: number[]
    months: number[]
    daysOfWeek: number[]
  }
}

export class CronValidator {
  /**
   * 验证 Cron 表达式是否有效
   */
  static validate(expression: string): ValidationResult {
    if (!expression || typeof expression !== 'string') {
      return { valid: false, error: 'Cron 表达式不能为空' }
    }

    const trimmed = expression.trim()
    const parts = trimmed.split(/\s+/)

    if (parts.length !== 5) {
      return { valid: false, error: 'Cron 表达式必须包含 5 个字段 (分 时 日 月 周)' }
    }

    const [minutes, hours, daysOfMonth, months, daysOfWeek] = parts

    // 验证每个字段
    const minutesResult = this.validateField(minutes, 0, 59)
    if (!minutesResult.valid) return minutesResult

    const hoursResult = this.validateField(hours, 0, 23)
    if (!hoursResult.valid) return hoursResult

    const daysOfMonthResult = this.validateField(daysOfMonth, 1, 31)
    if (!daysOfMonthResult.valid) return daysOfMonthResult

    const monthsResult = this.validateField(months, 1, 12)
    if (!monthsResult.valid) return monthsResult

    const daysOfWeekResult = this.validateField(daysOfWeek, 0, 6)
    if (!daysOfWeekResult.valid) return daysOfWeekResult

    // 解析字段值
    const parsed = {
      minutes: this.parseField(minutes, 0, 59),
      hours: this.parseField(hours, 0, 23),
      daysOfMonth: this.parseField(daysOfMonth, 1, 31),
      months: this.parseField(months, 1, 12),
      daysOfWeek: this.parseField(daysOfWeek, 0, 6),
    }

    return { valid: true, parsed }
  }

  /**
   * 验证单个字段
   */
  private static validateField(value: string, min: number, max: number): ValidationResult {
    if (value === '*') return { valid: true }

    // 处理步进值 */n
    if (value.startsWith('*/')) {
      const step = parseInt(value.slice(2), 10)
      if (isNaN(step) || step <= 0) {
        return { valid: false, error: `步进值必须为正整数` }
      }
      if (step > (max - min + 1)) {
        return { valid: false, error: `步进值超出范围` }
      }
      return { valid: true }
    }

    // 处理范围 n-m
    if (value.includes('-')) {
      const [start, end] = value.split('-')
      const startNum = parseInt(start, 10)
      const endNum = parseInt(end, 10)

      if (isNaN(startNum) || isNaN(endNum)) {
        return { valid: false, error: `范围必须是数字` }
      }
      if (startNum < min || startNum > max) {
        return { valid: false, error: `范围起始值超出 [${min}, ${max}]` }
      }
      if (endNum < min || endNum > max) {
        return { valid: false, error: `范围结束值超出 [${min}, ${max}]` }
      }
      if (startNum > endNum) {
        return { valid: false, error: `范围起始值不能大于结束值` }
      }
      return { valid: true }
    }

    // 处理列表 n,m,o
    if (value.includes(',')) {
      const items = value.split(',')
      for (const item of items) {
        const itemResult = this.validateField(item.trim(), min, max)
        if (!itemResult.valid) return itemResult
      }
      return { valid: true }
    }

    // 处理单个值
    const num = parseInt(value, 10)
    if (isNaN(num)) {
      return { valid: false, error: `值必须是数字或特殊符号` }
    }
    if (num < min || num > max) {
      return { valid: false, error: `值超出范围 [${min}, ${max}]` }
    }
    return { valid: true }
  }

  /**
   * 解析字段值为数字数组
   */
  private static parseField(value: string, min: number, max: number): number[] {
    const result: number[] = []

    if (value === '*') {
      for (let i = min; i <= max; i++) {
        result.push(i)
      }
      return result
    }

    // 处理步进值 */n
    if (value.startsWith('*/')) {
      const step = parseInt(value.slice(2), 10)
      for (let i = min; i <= max; i += step) {
        result.push(i)
      }
      return result
    }

    // 处理范围 n-m
    if (value.includes('-')) {
      const [start, end] = value.split('-')
      const startNum = parseInt(start, 10)
      const endNum = parseInt(end, 10)
      for (let i = startNum; i <= endNum; i++) {
        result.push(i)
      }
      return result
    }

    // 处理列表 n,m,o
    if (value.includes(',')) {
      const items = value.split(',')
      for (const item of items) {
        const num = parseInt(item.trim(), 10)
        if (!isNaN(num)) {
          result.push(num)
        }
      }
      return result
    }

    // 处理单个值
    const num = parseInt(value, 10)
    if (!isNaN(num)) {
      result.push(num)
    }

    return result
  }

  /**
   * 将 Cron 表达式转换为中文描述
   */
  static toChineseDescription(expression: string): string {
    const result = this.validate(expression)
    if (!result.valid || !result.parsed) {
      return '无效的 Cron 表达式'
    }

    const { minutes, hours, daysOfMonth, months, daysOfWeek } = result.parsed

    // 简化描述逻辑
    if (minutes.length === 60 && hours.length === 24 && daysOfMonth.length === 31 && months.length === 12 && daysOfWeek.length === 7) {
      return '每分钟执行'
    }

    if (minutes.length === 1 && minutes[0] === 0 && hours.length === 24 && daysOfMonth.length === 31 && months.length === 12 && daysOfWeek.length === 7) {
      return '每小时整点执行'
    }

    if (minutes.length === 1 && minutes[0] === 0 && hours.length === 1 && hours[0] === 0 && daysOfMonth.length === 31 && months.length === 12 && daysOfWeek.length === 7) {
      return '每天凌晨 0 点执行'
    }

    if (minutes.length === 1 && minutes[0] === 0 && hours.length === 1 && hours[0] === 0 && daysOfMonth.length === 1 && daysOfMonth[0] === 1 && months.length === 12 && daysOfWeek.length === 7) {
      return '每月 1 号凌晨 0 点执行'
    }

    if (minutes.length === 1 && minutes[0] === 0 && hours.length === 1 && hours[0] === 0 && daysOfMonth.length === 31 && months.length === 1 && months[0] === 1 && daysOfWeek.length === 7) {
      return '每年 1 月 1 号凌晨 0 点执行'
    }

    // 通用描述
    const timeDesc = this.formatTime(minutes, hours)
    const dateDesc = this.formatDate(daysOfMonth, months, daysOfWeek)

    return `${timeDesc}${dateDesc}`
  }

  private static formatTime(minutes: number[], hours: number[]): string {
    if (minutes.length === 60 && hours.length === 24) {
      return '每分钟 '
    }

    if (minutes.length === 1 && hours.length === 24) {
      return `每小时 ${minutes[0]} 分 `
    }

    if (minutes.length === 1 && hours.length === 1) {
      return `每天 ${hours[0].toString().padStart(2, '0')}:${minutes[0].toString().padStart(2, '0')} `
    }

    return ''
  }

  private static formatDate(daysOfMonth: number[], months: number[], daysOfWeek: number[]): string {
    if (daysOfMonth.length === 31 && months.length === 12 && daysOfWeek.length === 7) {
      return ''
    }

    if (daysOfMonth.length === 1 && months.length === 12 && daysOfWeek.length === 7) {
      return `每月 ${daysOfMonth[0]} 号 `
    }

    if (daysOfMonth.length === 31 && months.length === 1 && daysOfWeek.length === 7) {
      return `每年 ${months[0]} 月 `
    }

    return ''
  }
}

export default CronValidator
