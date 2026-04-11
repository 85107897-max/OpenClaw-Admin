#!/bin/bash
# 端到端集成测试脚本

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

echo "============================================================"
echo "端到端集成测试开始"
echo "目标 URL: $BASE_URL"
echo "============================================================"
echo ""

# 测试函数
run_test() {
    local name="$1"
    local path="$2"
    local method="$3"
    local body="$4"
    
    echo "测试：$name"
    
    if [ -n "$body" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -d "$body")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path")
    fi
    
    status=$(echo "$response" | tail -n1)
    data=$(echo "$response" | sed '$d')
    
    # 检查状态码
    if [ "$status" = "200" ] || [ "$status" = "401" ]; then
        echo "  ✅ 通过 (状态码：$status)"
        ((PASSED++))
    else
        echo "  ❌ 失败 (状态码：$status)"
        ((FAILED++))
    fi
    echo ""
}

# 执行测试
run_test "健康检查" "/api/health" "GET" ""
run_test "认证配置" "/api/auth/config" "GET" ""
run_test "批量删除接口" "/api/batch/users" "DELETE" '{"ids":[]}'
run_test "批量状态更新接口" "/api/batch/users/status" "PATCH" '{"ids":[],"status":"active"}'
run_test "批量查询接口" "/api/batch/users/batch-get" "POST" '{"ids":[]}'
run_test "批量导出接口" "/api/batch/users/export" "POST" '{"ids":[],"format":"csv"}'
run_test "RBAC 用户列表" "/api/rbac/users" "GET" ""
run_test "审计日志接口" "/api/audit/logs" "GET" ""

echo "============================================================"
echo "测试结果汇总"
echo "============================================================"
TOTAL=$((PASSED + FAILED))
echo "总测试数：$TOTAL"
echo "通过：$PASSED"
echo "失败：$FAILED"
if [ $TOTAL -gt 0 ]; then
    RATE=$((PASSED * 100 / TOTAL))
    echo "通过率：${RATE}%"
fi
echo ""

# 生成 JSON 报告
cat > /tmp/integration-test-report.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "total": $TOTAL,
    "passed": $PASSED,
    "failed": $FAILED,
    "passRate": "${RATE}%"
  },
  "baseUrl": "$BASE_URL"
}
EOF

echo "测试报告已保存到：/tmp/integration-test-report.json"

exit $FAILED
