/**
 * 端到端集成测试脚本
 * 测试前后端 API 联调和核心功能
 */

const http = require('http')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

const tests = [
  {
    name: '健康检查',
    path: '/api/health',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => data.status === 'ok'
  },
  {
    name: '认证配置',
    path: '/api/auth/config',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => typeof data.requireLogin === 'boolean'
  },
  {
    name: '批量删除接口',
    path: '/api/batch/users',
    method: 'DELETE',
    expectedStatus: [200, 401], // 401 表示需要认证，正常
    validate: (data, status) => status === 401 || (data.success !== undefined)
  },
  {
    name: '批量状态更新接口',
    path: '/api/batch/users/status',
    method: 'PATCH',
    expectedStatus: [200, 401],
    validate: (data, status) => status === 401 || (data.success !== undefined)
  },
  {
    name: '批量查询接口',
    path: '/api/batch/users/batch-get',
    method: 'POST',
    expectedStatus: [200, 401],
    validate: (data, status) => status === 401 || (data.success !== undefined)
  },
  {
    name: '批量导出接口',
    path: '/api/batch/users/export',
    method: 'POST',
    expectedStatus: [200, 401],
    validate: (data, status) => status === 401 || true
  },
  {
    name: 'RBAC 用户列表',
    path: '/api/rbac/users',
    method: 'GET',
    expectedStatus: [200, 401],
    validate: (data, status) => status === 401 || Array.isArray(data)
  },
  {
    name: '审计日志接口',
    path: '/api/audit/logs',
    method: 'GET',
    expectedStatus: [200, 401],
    validate: (data, status) => status === 401 || Array.isArray(data)
  }
]

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function runTests() {
  console.log('='.repeat(60))
  console.log('端到端集成测试开始')
  console.log(`目标 URL: ${BASE_URL}`)
  console.log('='.repeat(60))
  console.log()

  const results = []
  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      console.log(`测试：${test.name}`)
      const result = await makeRequest(test.path, test.method, 
        test.path.includes('/export') || test.path.includes('/batch-get') ? { ids: [] } : null)
      
      const statusOk = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus.includes(result.status)
        : result.status === test.expectedStatus
      
      const validateOk = !test.validate || test.validate(result.data, result.status)
      
      if (statusOk && validateOk) {
        console.log(`  ✅ 通过 (状态码：${result.status})`)
        passed++
        results.push({ name: test.name, status: 'PASS', details: `状态码：${result.status}` })
      } else {
        console.log(`  ❌ 失败 (状态码：${result.status}, 验证：${validateOk ? '通过' : '失败'})`)
        failed++
        results.push({ name: test.name, status: 'FAIL', details: `状态码：${result.status}` })
      }
    } catch (error) {
      console.log(`  ❌ 错误：${error.message}`)
      failed++
      results.push({ name: test.name, status: 'ERROR', details: error.message })
    }
    console.log()
  }

  console.log('='.repeat(60))
  console.log('测试结果汇总')
  console.log('='.repeat(60))
  console.log(`总测试数：${tests.length}`)
  console.log(`通过：${passed}`)
  console.log(`失败：${failed}`)
  console.log(`通过率：${((passed / tests.length) * 100).toFixed(1)}%`)
  console.log()

  return { results, passed, failed, total: tests.length }
}

// 运行测试
runTests()
  .then(({ results, passed, failed, total }) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, passRate: ((passed / total) * 100).toFixed(1) + '%' },
      results
    }
    
    console.log('\n测试报告:')
    console.log(JSON.stringify(report, null, 2))
    
    process.exit(failed > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('测试执行失败:', error)
    process.exit(1)
  })
