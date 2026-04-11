/**
 * Cron 任务调度引擎服务
 * 负责任务的定时调度和执行
 */

const { query, run, getDb } = require('../models/database');
const { spawn } = require('child_process');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/scheduler.log' }),
    new winston.transports.Console()
  ]
});

// 调度器实例
let schedulerInterval = null;
let isRunning = false;

/**
 * 初始化调度器
 */
async function initScheduler() {
  if (schedulerInterval) {
    logger.warn('Scheduler already running');
    return;
  }

  logger.info('Initializing Cron scheduler...');
  
  // 每 30 秒检查一次需要执行的任务
  schedulerInterval = setInterval(checkAndRunTasks, 30000);
  
  isRunning = true;
  logger.info('Cron scheduler started successfully');
}

/**
 * 停止调度器
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isRunning = false;
    logger.info('Cron scheduler stopped');
  }
}

/**
 * 检查并执行需要运行的任务
 */
async function checkAndRunTasks() {
  if (!isRunning) return;

  try {
    const now = Math.floor(Date.now() / 1000);
    
    // 查询到期的任务
    const tasks = await query(
      `SELECT * FROM task_configs 
       WHERE enabled = 1 
       AND next_run_at <= ? 
       ORDER BY next_run_at ASC`,
      [now]
    );

    if (tasks.length === 0) {
      return;
    }

    logger.info(`Found ${tasks.length} tasks to execute`);

    // 并发执行任务
    for (const task of tasks) {
      executeTask(task);
    }

  } catch (error) {
    logger.error('Error checking tasks:', error);
  }
}

/**
 * 执行单个任务
 */
async function executeTask(task) {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startedAt = Math.floor(Date.now() / 1000);

  logger.info(`Starting task execution: ${task.title} (ID: ${task.id}, Execution: ${executionId})`);

  // 记录开始执行
  await run(
    `INSERT INTO execution_history 
     (task_id, expression, command, status, started_at) 
     VALUES (?, ?, ?, 'running', ?)`,
    [task.id, task.expression, task.command, startedAt]
  );

  // 执行命令
  executeCommand(task.command, task.timeout || 300)
    .then(async (result) => {
      const finishedAt = Math.floor(Date.now() / 1000);
      const durationMs = (finishedAt - startedAt) * 1000;

      // 更新执行记录
      await run(
        `UPDATE execution_history 
         SET status = ?, stdout = ?, stderr = ?, exit_code = ?, 
             finished_at = ?, duration_ms = ? 
         WHERE id = ?`,
        [result.status, result.stdout, result.stderr, result.exitCode, finishedAt, durationMs, executionId]
      );

      // 更新任务下次运行时间
      const nextRunAt = calculateNextRun(task.expression);
      await run(
        `UPDATE task_configs 
         SET last_run_at = ?, next_run_at = ? 
         WHERE id = ?`,
        [startedAt, nextRunAt, task.id]
      );

      // 发送通知（如果失败且启用通知）
      if (result.status === 'failed' && task.notify_on_fail) {
        await sendNotification(task, result);
      }

      logger.info(`Task execution completed: ${task.title} - ${result.status}`);
    })
    .catch(async (error) => {
      const finishedAt = Math.floor(Date.now() / 1000);
      const durationMs = (finishedAt - startedAt) * 1000;

      await run(
        `UPDATE execution_history 
         SET status = 'failed', stderr = ?, 
             finished_at = ?, duration_ms = ? 
         WHERE id = ?`,
        [error.message, finishedAt, durationMs, executionId]
      );

      logger.error(`Task execution failed: ${task.title}`, error);
    });
}

/**
 * 执行系统命令
 */
function executeCommand(command, timeout = 300) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    const child = spawn(command, {
      shell: true,
      timeout: timeoutMs
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      if (duration > timeoutMs) {
        resolve({
          status: 'timeout',
          stdout: stdout.substring(0, 10000),
          stderr: stderr.substring(0, 10000),
          exitCode: -1
        });
      } else {
        resolve({
          status: code === 0 ? 'success' : 'failed',
          stdout: stdout.substring(0, 10000),
          stderr: stderr.substring(0, 10000),
          exitCode: code
        });
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // 超时处理
    setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 1000);
    }, timeoutMs);
  });
}

/**
 * 计算下次运行时间（简化版 Cron 表达式解析）
 */
function calculateNextRun(expression) {
  const now = new Date();
  const parts = expression.split(' ');

  if (parts.length !== 5) {
    // 无效表达式，1 小时后重试
    return Math.floor((now.getTime() + 3600000) / 1000);
  }

  const [minute, hour, day, month, weekday] = parts;

  // 简化处理：基于当前时间计算下次运行
  let next = new Date(now);
  next.setSeconds(0);

  // 分钟
  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.substring(2));
    next.setMinutes(Math.ceil(now.getMinutes() / interval) * interval);
    if (next.getMinutes() >= 60) {
      next.setMinutes(0);
      next.setHours(now.getHours() + 1);
    }
  } else {
    next.setMinutes(parseInt(minute));
    if (next.getMinutes() <= now.getMinutes()) {
      next.setHours(now.getHours() + 1);
    }
  }

  return Math.floor(next.getTime() / 1000);
}

/**
 * 发送失败通知
 */
async function sendNotification(task, result) {
  try {
    // TODO: 集成通知服务
    logger.info(`Notification would be sent for task: ${task.title}`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }
}

/**
 * 手动执行任务
 */
async function manualRunTask(taskId) {
  try {
    const [task] = await query('SELECT * FROM task_configs WHERE id = ?', [taskId]);
    
    if (!task) {
      throw new Error('Task not found');
    }

    executeTask(task);

    return {
      success: true,
      message: 'Task execution started',
      taskId
    };
  } catch (error) {
    logger.error('Manual run task failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取调度器状态
 */
function getSchedulerStatus() {
  return {
    running: isRunning,
    interval: schedulerInterval ? 'active' : 'inactive'
  };
}

module.exports = {
  initScheduler,
  stopScheduler,
  checkAndRunTasks,
  executeTask,
  manualRunTask,
  getSchedulerStatus
};
