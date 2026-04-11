#!/bin/bash
# 首次部署验证脚本
# 用途：验证服务器环境、依赖、配置是否正确

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
PROJECT_NAME="ai-work"
PROJECT_PATH="/www/wwwroot/${PROJECT_NAME}"
LOG_FILE="${PROJECT_PATH}/logs/deployment-verification.log"

# 日志函数
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[!] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗] $1${NC}" | tee -a "$LOG_FILE"
}

# 初始化
echo "========================================" | tee -a "$LOG_FILE"
echo "首次部署验证脚本" | tee -a "$LOG_FILE"
echo "开始时间：$(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 1. 检查 Node.js 版本
echo "" | tee -a "$LOG_FILE"
echo "1. 检查 Node.js 环境..." | tee -a "$LOG_FILE"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    log_success "Node.js 已安装：${NODE_VERSION}"
else
    log_error "Node.js 未安装"
    exit 1
fi

# 2. 检查 npm/yarn/pnpm
echo "" | tee -a "$LOG_FILE"
echo "2. 检查包管理器..." | tee -a "$LOG_FILE"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    log_success "npm 已安装：${NPM_VERSION}"
else
    log_warning "npm 未安装"
fi

if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    log_success "pnpm 已安装：${PNPM_VERSION}"
else
    log_warning "pnpm 未安装"
fi

# 3. 检查 Docker
echo "" | tee -a "$LOG_FILE"
echo "3. 检查 Docker 环境..." | tee -a "$LOG_FILE"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker -v)
    log_success "Docker 已安装：${DOCKER_VERSION}"
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose -v)
        log_success "Docker Compose 已安装：${COMPOSE_VERSION}"
    else
        log_warning "Docker Compose 未安装"
    fi
else
    log_warning "Docker 未安装（如使用传统部署可忽略）"
fi

# 4. 检查数据库连接
echo "" | tee -a "$LOG_FILE"
echo "4. 检查数据库连接..." | tee -a "$LOG_FILE"
if [ -f "${PROJECT_PATH}/.env" ]; then
    source <(grep -E '^(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)=' "${PROJECT_PATH}/.env" 2>/dev/null || true)
    
    if command -v mysql &> /dev/null && [ -n "$DB_HOST" ]; then
        if mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" "${DB_NAME}" &> /dev/null; then
            log_success "数据库连接正常"
        else
            log_error "数据库连接失败"
        fi
    else
        log_warning "无法测试数据库连接（mysql 客户端未安装或未配置）"
    fi
else
    log_warning ".env 文件不存在，跳过数据库检查"
fi

# 5. 检查 Redis 连接
echo "" | tee -a "$LOG_FILE"
echo "5. 检查 Redis 连接..." | tee -a "$LOG_FILE"
if [ -f "${PROJECT_PATH}/.env" ]; then
    source <(grep -E '^(REDIS_HOST|REDIS_PORT|REDIS_PASSWORD)=' "${PROJECT_PATH}/.env" 2>/dev/null || true)
    
    if command -v redis-cli &> /dev/null && [ -n "$REDIS_HOST" ]; then
        if [ -n "$REDIS_PASSWORD" ]; then
            if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
                log_success "Redis 连接正常"
            else
                log_error "Redis 连接失败"
            fi
        else
            if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping 2>/dev/null | grep -q "PONG"; then
                log_success "Redis 连接正常"
            else
                log_error "Redis 连接失败"
            fi
        fi
    else
        log_warning "无法测试 Redis 连接（redis-cli 未安装或未配置）"
    fi
else
    log_warning ".env 文件不存在，跳过 Redis 检查"
fi

# 6. 检查项目文件
echo "" | tee -a "$LOG_FILE"
echo "6. 检查项目文件完整性..." | tee -a "$LOG_FILE"
REQUIRED_FILES=(
    "package.json"
    "docker-compose.yml"
    "Dockerfile"
    "backend/src/index.js"
    "frontend/index.html"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "${PROJECT_PATH}/${file}" ]; then
        log_success "文件存在：${file}"
    else
        log_error "文件缺失：${file}"
        MISSING_FILES+=("$file")
    fi
done

# 7. 检查目录权限
echo "" | tee -a "$LOG_FILE"
echo "7. 检查目录权限..." | tee -a "$LOG_FILE"
REQUIRED_DIRS=(
    "logs"
    "data"
    "uploads"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "${PROJECT_PATH}/${dir}" ]; then
        if [ -w "${PROJECT_PATH}/${dir}" ]; then
            log_success "目录可写：${dir}"
        else
            log_error "目录不可写：${dir}"
        fi
    else
        log_warning "目录不存在，尝试创建：${dir}"
        mkdir -p "${PROJECT_PATH}/${dir}"
        chmod 755 "${PROJECT_PATH}/${dir}"
        log_success "目录已创建：${dir}"
    fi
done

# 8. 检查端口占用
echo "" | tee -a "$LOG_FILE"
echo "8. 检查端口占用..." | tee -a "$LOG_FILE"
PORTS=(10001 3000 9090 3002)

for port in "${PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
        log_warning "端口 ${port} 已被占用"
    else
        log_success "端口 ${port} 可用"
    fi
done

# 9. 检查 Git 仓库
echo "" | tee -a "$LOG_FILE"
echo "9. 检查 Git 仓库..." | tee -a "$LOG_FILE"
if [ -d "${PROJECT_PATH}/.git" ]; then
    CURRENT_BRANCH=$(git -C "$PROJECT_PATH" rev-parse --abbrev-ref HEAD)
    log_success "Git 仓库正常，当前分支：${CURRENT_BRANCH}"
else
    log_warning "不是 Git 仓库"
fi

# 10. 检查监控系统
echo "" | tee -a "$LOG_FILE"
echo "10. 检查监控系统配置..." | tee -a "$LOG_FILE"
if [ -d "${PROJECT_PATH}/monitoring" ]; then
    log_success "监控目录存在"
    
    if [ -f "${PROJECT_PATH}/monitoring/prometheus/prometheus.yml" ]; then
        log_success "Prometheus 配置文件存在"
    else
        log_warning "Prometheus 配置文件缺失"
    fi
    
    if [ -d "${PROJECT_PATH}/monitoring/grafana" ]; then
        log_success "Grafana 配置目录存在"
    else
        log_warning "Grafana 配置目录缺失"
    fi
else
    log_warning "监控目录不存在"
fi

# 11. 检查 CI/CD 配置
echo "" | tee -a "$LOG_FILE"
echo "11. 检查 CI/CD 配置..." | tee -a "$LOG_FILE"
if [ -d "${PROJECT_PATH}/.github/workflows" ]; then
    WORKFLOW_COUNT=$(ls -1 "${PROJECT_PATH}/.github/workflows/" 2>/dev/null | wc -l)
    log_success "CI/CD 工作流文件数量：${WORKFLOW_COUNT}"
else
    log_warning "CI/CD 配置目录不存在"
fi

# 12. 检查 Secrets 配置
echo "" | tee -a "$LOG_FILE"
echo "12. 检查 Secrets 配置..." | tee -a "$LOG_FILE"
if [ -f "${PROJECT_PATH}/.env" ]; then
    REQUIRED_SECRETS=(
        "DB_PASSWORD"
        "JWT_SECRET"
        "API_SECRET_KEY"
    )
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if grep -q "^${secret}=" "${PROJECT_PATH}/.env"; then
            VALUE=$(grep "^${secret}=" "${PROJECT_PATH}/.env" | cut -d'=' -f2)
            if [ -n "$VALUE" ] && [ "$VALUE" != '""' ]; then
                log_success "Secret 已配置：${secret}"
            else
                log_warning "Secret 为空：${secret}"
            fi
        else
            log_warning "Secret 未配置：${secret}"
        fi
    done
else
    log_warning ".env 文件不存在"
fi

# 总结
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "验证完成" | tee -a "$LOG_FILE"
echo "结束时间：$(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    log_success "所有检查通过！项目可以部署"
    exit 0
else
    log_error "发现 ${#MISSING_FILES[@]} 个缺失文件，请修复后重新验证"
    exit 1
fi
