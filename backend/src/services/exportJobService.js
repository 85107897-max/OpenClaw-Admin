/**
 * 数据导出任务服务
 * 负责异步处理大文件导出
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const exportService = require('./exportService');

class ExportJobService {
  constructor() {
    this.jobsDir = path.join(__dirname, '../../data/export_jobs');
    this.ensureJobsDir();
    this.jobs = new Map();
  }

  ensureJobsDir() {
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  /**
   * 创建导出任务
   */
  createJob(resourceType, options = {}) {
    const jobId = crypto.randomUUID();
    const job = {
      job_id: jobId,
      resource_type: resourceType,
      options,
      status: 'pending',
      progress: 0,
      total_records: 0,
      exported: 0,
      file_name: null,
      file_size: 0,
      download_url: null,
      errors: [],
      created_at: Date.now(),
      started_at: null,
      completed_at: null,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 天有效期
    };

    this.jobs.set(jobId, job);
    this.saveJob(jobId);
    
    // 异步执行任务
    this.executeJob(jobId);

    return job;
  }

  /**
   * 执行导出任务
   */
  async executeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.started_at = Date.now();
    this.saveJob(jobId);

    try {
      const result = await exportService.exportResource(job.resource_type, job.options);
      
      job.status = 'completed';
      job.exported = result.record_count || 0;
      job.file_name = result.file_name;
      job.file_size = result.file_size;
      job.download_url = `/api/export/file/${result.file_name}`;
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
   * 清理过期文件
   */
  cleanupExpiredFiles() {
    const now = Date.now();
    const jobs = this.getAllJobs();
    
    jobs.forEach(job => {
      if (job.status === 'completed' && job.file_name && job.expires_at < now) {
        const filePath = path.join(exportService.exportDir, job.file_name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
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

module.exports = new ExportJobService();
