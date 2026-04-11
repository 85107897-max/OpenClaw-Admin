/**
 * Cron 表达式解析工具
 * 用于计算下次运行时间
 */

/**
 * 计算 Cron 表达式的下次运行时间
 * @param {string} expression - Cron 表达式 (5 个字段：分 时 日 月 周)
 * @returns {number} - 下次运行时间的 Unix 时间戳 (秒)
 */
function calculateNextRun(expression) {
  if (!expression || typeof expression !== 'string') {
    return Math.floor(Date.now() / 1000) + 3600; // 默认 1 小时后
  }

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return Math.floor(Date.now() / 1000) + 3600;
  }

  const [minute, hour, day, month, weekday] = parts;
  const now = new Date();
  
  // 从下一秒开始查找
  let next = new Date(now.getTime() + 1000);
  next.setMilliseconds(0);

  // 查找最多 1 年内的下次运行时间
  const maxAttempts = 366 * 24 * 60; // 1 年的分钟数
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // 检查分钟
    if (!matchField(minute, next.getMinutes())) {
      next.setMinutes(next.getMinutes() + 1);
      next.setSeconds(0);
      continue;
    }

    // 检查小时
    if (!matchField(hour, next.getHours())) {
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
      continue;
    }

    // 检查日期
    if (!matchField(day, next.getDate()) || !matchField(weekday, next.getDay())) {
      next.setDate(next.getDate() + 1);
      next.setHours(0);
      next.setMinutes(0);
      continue;
    }

    // 检查月份
    if (!matchField(month, next.getMonth() + 1)) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0);
      next.setMinutes(0);
      continue;
    }

    // 所有条件都满足
    return Math.floor(next.getTime() / 1000);
  }

  // 未找到，返回 1 小时后
  return Math.floor((now.getTime() + 3600000) / 1000);
}

/**
 * 匹配字段值
 * @param {string} field - 字段表达式
 * @param {number} value - 当前值
 * @returns {boolean} - 是否匹配
 */
function matchField(field, value) {
  if (field === '*') {
    return true;
  }

  // 处理步进值 (*/5)
  if (field.startsWith('*/')) {
    const step = parseInt(field.substring(2));
    if (isNaN(step) || step === 0) return false;
    return value % step === 0;
  }

  // 处理范围 (1-5)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return value >= start && value <= end;
  }

  // 处理列表 (1,3,5)
  if (field.includes(',')) {
    const values = field.split(',').map(Number);
    return values.includes(value);
  }

  // 精确匹配
  const num = parseInt(field);
  return value === num;
}

/**
 * 验证 Cron 表达式格式
 * @param {string} expression - Cron 表达式
 * @returns {object} - {valid: boolean, error: string|null}
 */
function validateCronExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return { valid: false, error: '表达式不能为空' };
  }

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: 'Cron 表达式必须包含 5 个字段 (分 时 日 月 周)' };
  }

  const ranges = [
    { min: 0, max: 59, name: '分钟' },
    { min: 0, max: 23, name: '小时' },
    { min: 1, max: 31, name: '日期' },
    { min: 1, max: 12, name: '月份' },
    { min: 0, max: 6, name: '星期' }
  ];

  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    const { min, max, name } = ranges[i];

    if (!isValidField(field, min, max)) {
      return { valid: false, error: `无效的${name}字段：${field}` };
    }
  }

  return { valid: true, error: null };
}

/**
 * 验证单个字段
 * @param {string} field - 字段表达式
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} - 是否有效
 */
function isValidField(field, min, max) {
  if (field === '*') return true;

  // 步进值
  if (field.startsWith('*/')) {
    const step = parseInt(field.substring(2));
    return !isNaN(step) && step > 0 && step <= (max - min + 1);
  }

  // 范围
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start < end;
  }

  // 列表
  if (field.includes(',')) {
    const values = field.split(',').map(Number);
    return values.every(v => !isNaN(v) && v >= min && v <= max);
  }

  // 精确值
  const num = parseInt(field);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * 将 Cron 表达式转换为人类可读描述
 * @param {string} expression - Cron 表达式
 * @returns {string} - 人类可读描述
 */
function describeCronExpression(expression) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return '无效的 Cron 表达式';
  }

  const [minute, hour, day, month, weekday] = parts;
  const descriptions = [];

  // 分钟
  if (minute === '*') {
    descriptions.push('每分钟');
  } else if (minute.startsWith('*/')) {
    descriptions.push(`每${minute.substring(2)}分钟`);
  } else {
    descriptions.push(`第${minute}分钟`);
  }

  // 小时
  if (hour === '*') {
    descriptions.push('每小时');
  } else if (hour.startsWith('*/')) {
    descriptions.push(`每${hour.substring(2)}小时`);
  } else {
    descriptions.push(`第${hour}小时`);
  }

  return descriptions.join(', ');
}

module.exports = {
  calculateNextRun,
  validateCronExpression,
  matchField,
  isValidField,
  describeCronExpression
};
