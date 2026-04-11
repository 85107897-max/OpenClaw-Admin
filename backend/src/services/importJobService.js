/**
 * 数据导入任务服务
 * 负责异步处理大文件导入
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const importService = require('./importService');

class ImportJobService {
  constructor() {
    this.jobsDir = path.join(__dirname, '../../data/import_jobs');
    this.ensureJobsDir();
    this.jobs = new Map();
  }

  ensureJobsDir() {
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  /**
   * 创建导入任务
   */
  createJob(filePath, mode = 'merge', resourceType = null) {
    const jobId = crypto.randomUUID();
    const job = {
      job_id: jobId,
      file_path: filePath,
      mode,
      resource_type: resourceType,
      status: 'pending',
      progress: 0,
      total_records: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      created_at: Date.now(),
      started_at: null,
      completed_at: null
    };

    this.jobs.set(jobId, job);
    this.saveJob(jobId);
    
    // 异步执行任务
    this.executeJob(jobId);

    return job;
  }

  /**
   * 执行导入任务
   */
  async executeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.started_at = Date.now();
    this.saveJob(jobId);

    try {
      let result;
      if (job.resource_type) {
        result = await importService.importResource(job.resource_type, job.file_path, job.mode);
      } else {
        result = await importService.importFullBackup(job.file_path, job.mode);
      }

      job.status = 'completed';
      job.imported = result.total_imported || 0;
      job.skipped = result.total_skipped || 0;
      job.errors = result.errors || [];
      job.completed_at = Date.now();
      job.progress = 100;
      
    } catch (error) {
      job.status = 'failed';
      job.errors.push({ error: error.message });
      job.completed_at = Date.now();
    }

    this.saveJob(jobId);
  }

  /**
   * 获取任务状态
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllJobs() {
    return Array.from(this.jobs.values()).sort((a, b) => b.created_at - a.created_at);
  }

  /**
   * 取消任务
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      job.completed_at = Date.now();
      this.saveJob(jobId);
      return true;
    }
    return false;
  }

  /**
   * 保存任务到文件
   */
  saveJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      const filePath = path.join(this.jobsDir, `${jobId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(job, null, 2));
    }
  }

  /**
   * 加载所有任务
   */
  loadAllJobs() {
    const files = fs.readdirSync(this.jobsDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.jobsDir, file);
        try {
          const job = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          this.jobs.set(job.job_id, job);
        } catch (e) {
          console.error(`Failed to load job ${file}:`, e.message);
        }
      }
    });
  }
}

module.exports = new ImportJobService();
