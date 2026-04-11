#!/bin/bash
# 性能监控脚本
# 用途：监控系统性能并生成报告

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_NAME="ai-work"
PROJECT_PATH="/www/wwwroot/${PROJECT_NAME}"
REPORT_DIR="${PROJECT_PATH}/reports"
REPORT_FILE="${REPORT_DIR}/performance-report-$(date '+%Y%m%d-%H%M%S').md"

# 确保报告目录存在
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}性能监控报告${NC}"
echo -e "${BLUE}生成时间：$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================${NC}"

# 初始化报告
cat > "$REPORT_FILE" << EOF
# 性能监控报告

**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**项目路径**: ${PROJECT_PATH}  
**主机名**: $(hostname)

---

## 1. 系统资源概览

EOF

# 1. CPU 使用情况
echo "### 1.1 CPU 使用率" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v top &> /dev/null; then
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "- 当前 CPU 使用率: **${CPU_USAGE}%**" >> "$REPORT_FILE"
else
    echo "- CPU 使用率信息不可用" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# CPU 核心数
CPU_CORES=$(nproc 2>/dev/null || echo "未知")
echo "- CPU 核心数: **${CPU_CORES}**" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 2. 内存使用情况
echo "### 1.2 内存使用率" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v free &> /dev/null; then
    MEM_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
    MEM_USED=$(free -h | awk '/^Mem:/ {print $3}')
    MEM_FREE=$(free -h | awk '/^Mem:/ {print $4}')
    MEM_AVAILABLE=$(free -h | awk '/^Mem:/ {print $7}')
    
    echo "- 总内存: **${MEM_TOTAL}**" >> "$REPORT_FILE"
    echo "- 已使用: **${MEM_USED}**" >> "$REPORT_FILE"
    echo "- 空闲: **${MEM_FREE}**" >> "$REPORT_FILE"
    echo "- 可用: **${MEM_AVAILABLE}**" >> "$REPORT_FILE"
    
    # 计算使用率
    MEM_PERCENT=$(free | awk '/^Mem:/ {printf("%.2f%%", $3/$2 * 100)}')
    echo "- 使用率: **${MEM_PERCENT}**" >> "$REPORT_FILE"
else
    echo "- 内存信息不可用" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# 3. 磁盘使用情况
echo "### 1.3 磁盘使用率" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v df &> /dev/null; then
    echo "| 挂载点 | 总容量 | 已使用 | 可用 | 使用率 |" >> "$REPORT_FILE"
    echo "|--------|--------|--------|------|--------|" >> "$REPORT_FILE"
    
    df -h / | tail -1 | awk '{
        printf "| %s | %s | %s | %s | %s |\n", $6, $2, $3, $4, $5
    }' >> "$REPORT_FILE"
    
    # 检查项目目录
    if [ -d "$PROJECT_PATH" ]; then
        echo "" >> "$REPORT_FILE"
        echo "**项目目录占用:**" >> "$REPORT_FILE"
        DU_SIZE=$(du -sh "$PROJECT_PATH" 2>/dev/null | cut -f1)
        echo "- 项目总大小: **${DU_SIZE}**" >> "$REPORT_FILE"
    fi
else
    echo "- 磁盘信息不可用" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# 4. 网络统计
echo "### 1.4 网络统计" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v ss &> /dev/null; then
    TOTAL_CONNECTIONS=$(ss -s | grep "TCP:" | awk '{print $2}')
    ESTABLISHED=$(ss -s | grep "TCP:" | awk '{print $4}')
    
    echo "- TCP 连接总数：${TOTAL_CONNECTIONS}" >> "$REPORT_FILE"
    echo "- 已建立连接：${ESTABLISHED}" >> "$REPORT_FILE"
else
    echo "- 网络统计信息不可用" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# 5. 进程统计
echo "### 1.5 进程统计" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v ps &> /dev/null; then
    TOTAL_PROCS=$(ps aux | wc -l)
    NODE_PROCS=$(ps aux | grep -c "[n]ode" || echo "0")
    PM2_PROCS=$(ps aux | grep -c "[p]m2" || echo "0")
    
    echo "- 总进程数: ${TOTAL_PROCS}" >> "$REPORT_FILE"
    echo "- Node.js 进程数: ${NODE_PROCS}" >> "$REPORT_FILE"
    echo "- PM2 进程数: ${PM2_PROCS}" >> "$REPORT_FILE"
else
    echo "- 进程统计信息不可用" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# 6. 服务状态
echo "## 2. 服务状态" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 检查端口监听
echo "### 2.1 端口监听状态" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| 端口 | 状态 | 服务 |" >> "$REPORT_FILE"
echo "|------|------|------|" >> "$REPORT_FILE"

for port in 10001 3000 9090 3002 6379 3306; do
    if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
        echo "| ${port} | ${GREEN}监听${NC} | 未知 |" >> "$REPORT_FILE"
    else
        echo "| ${port} | ${YELLOW}未监听${NC} | - |" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"

# 7. 系统负载
echo "## 3. 系统负载" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v uptime &> /dev/null; then
    UPTIME=$(uptime)
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
    
    echo "- 系统运行时间: ${UPTIME}" >> "$REPORT_FILE"
    echo "- 负载平均值:${LOAD_AVG}" >> "$REPORT_FILE"
else
    echo "- 系统负载信息不可用" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# 8. 健康检查
echo "## 4. 健康检查" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

HEALTH_STATUS="✅ 健康"
WARNINGS=""

# 检查 CPU 使用率
if [ -n "$CPU_USAGE" ]; then
    CPU_INT=${CPU_USAGE%.*}
    if [ "$CPU_INT" -gt 80 ]; then
        HEALTH_STATUS="⚠️ 警告"
        WARNINGS="${WARNINGS}- CPU 使用率超过 80%\n"
    fi
fi

# 检查内存使用率
if [ -n "$MEM_PERCENT" ]; then
    MEM_INT=${MEM_PERCENT%.*}
    if [ "$MEM_INT" -gt 80 ]; then
        HEALTH_STATUS="⚠️ 警告"
        WARNINGS="${WARNINGS}- 内存使用率超过 80%\n"
    fi
fi

# 检查磁盘使用率
DISK_PERCENT=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_PERCENT" -gt 80 ]; then
    HEALTH_STATUS="⚠️ 警告"
    WARNINGS="${WARNINGS}- 磁盘使用率超过 80%\n"
fi

echo "- 整体状态：${HEALTH_STATUS}" >> "$REPORT_FILE"

if [ -n "$WARNINGS" ]; then
    echo "" >> "$REPORT_FILE"
    echo "### 警告信息" >> "$REPORT_FILE"
    echo -e "$WARNINGS" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# 9. 建议
echo "## 5. 优化建议" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "基于当前系统状态，建议:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$DISK_PERCENT" -gt 70 ]; then
    echo "1. 🗑️ 清理磁盘空间 - 当前使用率：${DISK_PERCENT}%" >> "$REPORT_FILE"
fi

if [ "${MEM_INT:-0}" -gt 70 ]; then
    echo "2. 📈 考虑增加内存或优化应用内存使用" >> "$REPORT_FILE"
fi

if [ "${CPU_INT:-0}" -gt 70 ]; then
    echo "3. ⚡ 检查高 CPU 占用进程，考虑优化或扩容" >> "$REPORT_FILE"
fi

echo "4. 📊 定期运行此监控脚本，建立性能基线" >> "$REPORT_FILE"
echo "5. 🔔 配置 Prometheus + Grafana 进行实时监控" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "*报告生成时间: $(date '+%Y-%m-%d %H:%M:%S')*" >> "$REPORT_FILE"
echo "*下次建议检查: $(date -d '+1 hour' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date '+%Y-%m-%d %H:%M:%S')*" >> "$REPORT_FILE"

# 输出摘要
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}报告已生成：${REPORT_FILE}${NC}"
echo -e "${BLUE}========================================${NC}"

# 显示摘要
echo ""
echo "=== 性能摘要 ==="
echo "CPU 使用率：${CPU_USAGE:-未知}"
echo "内存使用率：${MEM_PERCENT:-未知}"
echo "磁盘使用率：${DISK_PERCENT}% 状态：${HEALTH_STATUS}"
echo ""
