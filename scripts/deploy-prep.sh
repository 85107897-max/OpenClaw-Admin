#!/bin/bash
# 部署环境准备脚本
# 功能：检查并准备部署所需的环境

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
LOG_DIR="$PROJECT_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy-prep_$(date '+%Y%m%d_%H%M%S').log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# 检查 Node.js 版本
check_nodejs() {
    log "检查 Node.js 环境..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log "${GREEN}✅ Node.js $(node --version) 满足要求${NC}"
        else
            log "${RED}❌ Node.js 版本过低，需要 >= 18${NC}"
            return 1
        fi
    else
        log "${RED}❌ Node.js 未安装${NC}"
        return 1
    fi
    
    # 检查 npm
    if command -v npm >/dev/null 2>&1; then
        log "${GREEN}✅ npm $(npm --version) 已安装${NC}"
    else
        log "${RED}❌ npm 未安装${NC}"
        return 1
    fi
    
    return 0
}

# 检查 Docker 环境
check_docker() {
    log "检查 Docker 环境..."
    
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        log "${GREEN}✅ Docker $DOCKER_VERSION 已安装${NC}"
    else
        log "${RED}❌ Docker 未安装${NC}"
        return 1
    fi
    
    # 检查 Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        DC_VERSION=$(docker-compose --version | cut -d' ' -f3)
        log "${GREEN}✅ Docker Compose $DC_VERSION 已安装${NC}"
    elif docker compose version >/dev/null 2>&1; then
        DC_VERSION=$(docker compose version | cut -d' ' -f3)
        log "${GREEN}✅ Docker Compose (plugin) $DC_VERSION 已安装${NC}"
    else
        log "${YELLOW}⚠️ Docker Compose 未安装${NC}"
        return 1
    fi
    
    # 检查 Docker 服务状态
    if systemctl is-active --quiet docker 2>/dev/null || docker info >/dev/null 2>&1; then
        log "${GREEN}✅ Docker 服务运行正常${NC}"
    else
        log "${RED}❌ Docker 服务未运行${NC}"
        return 1
    fi
    
    return 0
}

# 检查 PM2
check_pm2() {
    log "检查 PM2 环境..."
    
    if command -v pm2 >/dev/null 2>&1; then
        PM2_VERSION=$(pm2 --version)
        log "${GREEN}✅ PM2 $PM2_VERSION 已安装${NC}"
    else
        log "${YELLOW}⚠️ PM2 未安装，如需使用请运行：npm install -g pm2${NC}"
    fi
    
    return 0
}

# 检查磁盘空间
check_disk_space() {
    log "检查磁盘空间..."
    
    local USAGE=$(df "$PROJECT_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
    local AVAIL=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $4}')
    
    log "磁盘使用率：$USAGE%，可用空间：$AVAIL"
    
    if [ "$USAGE" -gt 90 ]; then
        log "${RED}❌ 磁盘使用率超过 90%，请清理空间${NC}"
        return 1
    elif [ "$USAGE" -gt 80 ]; then
        log "${YELLOW}⚠️ 磁盘使用率超过 80%，建议清理空间${NC}"
    else
        log "${GREEN}✅ 磁盘空间充足${NC}"
    fi
    
    return 0
}

# 检查端口占用
check_ports() {
    log "检查端口占用..."
    
    local PORTS=(10001 9090 3002 9093 9100 8080)
    local STATUS=0
    
    for port in "${PORTS[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            log "${YELLOW}⚠️ 端口 $port 已被占用${NC}"
            STATUS=1
        else
            log "${GREEN}✅ 端口 $port 可用${NC}"
        fi
    done
    
    return $STATUS
}

# 检查项目依赖
check_dependencies() {
    log "检查项目依赖..."
    
    cd "$PROJECT_DIR"
    
    if [ -d "node_modules" ]; then
        local DEP_COUNT=$(ls -1 node_modules | wc -l)
        log "${GREEN}✅ node_modules 存在 ($DEP_COUNT 个包)${NC}"
    else
        log "${YELLOW}⚠️ node_modules 不存在，需要运行 npm install${NC}"
    fi
    
    # 检查关键文件
    local REQUIRED_FILES=("package.json" "Dockerfile" "docker-compose.yml" ".env.example")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            log "${GREEN}✅ $file 存在${NC}"
        else
            log "${RED}❌ $file 不存在${NC}"
            return 1
        fi
    done
    
    return 0
}

# 检查环境变量
check_env() {
    log "检查环境变量配置..."
    
    if [ -f "$PROJECT_DIR/.env" ]; then
        log "${GREEN}✅ .env 文件存在${NC}"
        
        # 检查关键配置项
        local REQUIRED_VARS=("PORT" "LOG_LEVEL")
        for var in "${REQUIRED_VARS[@]}"; do
            if grep -q "^$var=" "$PROJECT_DIR/.env"; then
                log "${GREEN}✅ $var 已配置${NC}"
            else
                log "${YELLOW}⚠️ $var 未配置${NC}"
            fi
        done
    else
        log "${YELLOW}⚠️ .env 文件不存在，需要从 .env.example 复制${NC}"
    fi
    
    return 0
}

# 检查监控服务
check_monitoring() {
    log "检查监控服务配置..."
    
    local MONITORING_FILES=(
        "monitoring/prometheus/prometheus.yml"
        "monitoring/prometheus/alerts-rules.yml"
        "monitoring/grafana/provisioning/datasources/datasources.yml"
        "monitoring/docker-compose.yml"
    )
    
    for file in "${MONITORING_FILES[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            log "${GREEN}✅ $file 存在${NC}"
        else
            log "${RED}❌ $file 不存在${NC}"
            return 1
        fi
    done
    
    # 检查监控容器状态
    local MONITORING_CONTAINERS=("prometheus" "grafana" "alertmanager" "node-exporter" "cadvisor")
    for container in "${MONITORING_CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            log "${GREEN}✅ $container 容器运行中${NC}"
        else
            log "${YELLOW}⚠️ $container 容器未运行${NC}"
        fi
    done
    
    return 0
}

# 生成部署准备报告
generate_report() {
    log ""
    log "=========================================="
    log "📋 部署环境准备报告"
    log "=========================================="
    log ""
    log "项目路径：$PROJECT_DIR"
    log "日志文件：$DEPLOY_LOG"
    log ""
    log "环境检查项:"
    log "  - Node.js: $(node --version 2>/dev/null || echo '未安装')"
    log "  - npm: $(npm --version 2>/dev/null || echo '未安装')"
    log "  - Docker: $(docker --version 2>/dev/null | cut -d' ' -f3 || echo '未安装')"
    log "  - Docker Compose: $(docker-compose --version 2>/dev/null | cut -d' ' -f3 || docker compose version 2>/dev/null | cut -d' ' -f3 || echo '未安装')"
    log "  - PM2: $(pm2 --version 2>/dev/null || echo '未安装')"
    log ""
    log "磁盘空间：$(df -h $PROJECT_DIR | tail -1 | awk '{print $4}') 可用"
    log ""
    log "访问地址（部署后）:"
    log "  - 应用服务：http://localhost:10001"
    log "  - Prometheus: http://localhost:9090"
    log "  - Grafana: http://localhost:3002 (admin/admin123)"
    log "  - Alertmanager: http://localhost:9093"
    log "  - Node Exporter: http://localhost:9100"
    log "  - cAdvisor: http://localhost:8080"
    log ""
    log "下一步操作:"
    log "  1. 配置环境变量：cp .env.example .env && vim .env"
    log "  2. 安装依赖：npm install"
    log "  3. 启动监控：cd monitoring && docker-compose up -d"
    log "  4. 构建部署：./scripts/deploy-docker.sh"
    log ""
}

# 主函数
main() {
    log "=========================================="
    log "🚀 开始部署环境准备检查"
    log "=========================================="
    
    mkdir -p "$LOG_DIR"
    
    local STATUS=0
    
    check_nodejs || STATUS=1
    check_docker || STATUS=1
    check_pm2
    check_disk_space || STATUS=1
    check_ports
    check_dependencies || STATUS=1
    check_env
    check_monitoring
    
    generate_report
    
    log "=========================================="
    if [ $STATUS -eq 0 ]; then
        log "${GREEN}✅ 部署环境准备完成！${NC}"
        log "${GREEN}可以开始部署流程${NC}"
    else
        log "${RED}❌ 部分检查项失败，请先修复问题${NC}"
    fi
    log "=========================================="
    
    return $STATUS
}

# 执行
main
