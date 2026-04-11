#!/bin/bash
# OpenClaw-Admin 配置备份恢复脚本
# 功能：备份和恢复项目配置、数据库和环境变量

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_DIR="$PROJECT_DIR/logs"
BACKUP_LOG="$LOG_DIR/backup_$(date '+%Y%m%d_%H%M%S').log"
RESTORE_LOG="$LOG_DIR/restore_$(date '+%Y%m%d_%H%M%S').log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_LOG"
}

# 创建备份目录
setup_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
}

# 备份配置文件
backup_configs() {
    log "开始备份配置文件..."
    
    local CONFIG_FILES=(
        ".env"
        "docker-compose.yml"
        "Dockerfile"
        "ecosystem.config.js"
        "vite.config.ts"
        "tsconfig.json"
        "tsconfig.app.json"
        "tsconfig.node.json"
        "vitest.config.ts"
        "wolami-config.yaml"
    )
    
    local CONFIG_BACKUP="$BACKUP_DIR/configs_$(date '+%Y%m%d_%H%M%S')"
    mkdir -p "$CONFIG_BACKUP"
    
    local COUNT=0
    for file in "${CONFIG_FILES[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            cp "$PROJECT_DIR/$file" "$CONFIG_BACKUP/"
            log "${GREEN}✅ 备份：$file${NC}"
            ((COUNT++))
        else
            log "${YELLOW}⚠️ 跳过（不存在）: $file${NC}"
        fi
    done
    
    # 备份 scripts 目录
    if [ -d "$PROJECT_DIR/scripts" ]; then
        cp -r "$PROJECT_DIR/scripts" "$CONFIG_BACKUP/"
        log "${GREEN}✅ 备份：scripts 目录${NC}"
    fi
    
    # 备份 monitoring 配置
    if [ -d "$PROJECT_DIR/monitoring" ]; then
        cp -r "$PROJECT_DIR/monitoring" "$CONFIG_BACKUP/"
        log "${GREEN}✅ 备份：monitoring 目录${NC}"
    fi
    
    # 备份 kubernetes 配置
    if [ -d "$PROJECT_DIR/kubernetes" ]; then
        cp -r "$PROJECT_DIR/kubernetes" "$CONFIG_BACKUP/"
        log "${GREEN}✅ 备份：kubernetes 目录${NC}"
    fi
    
    # 备份 .github/workflows
    if [ -d "$PROJECT_DIR/.github/workflows" ]; then
        mkdir -p "$CONFIG_BACKUP/.github"
        cp -r "$PROJECT_DIR/.github/workflows" "$CONFIG_BACKUP/.github/"
        log "${GREEN}✅ 备份：.github/workflows${NC}"
    fi
    
    log "${GREEN}✅ 配置文件备份完成：$CONFIG_BACKUP${NC}"
    echo "$CONFIG_BACKUP"
}

# 备份数据库
backup_database() {
    log "开始备份数据库..."
    
    local DB_BACKUP="$BACKUP_DIR/database_$(date '+%Y%m%d_%H%M%S')"
    mkdir -p "$DB_BACKUP"
    
    # 备份 SQLite 数据库
    if [ -f "$PROJECT_DIR/data/wizard.db" ]; then
        cp "$PROJECT_DIR/data/wizard.db" "$DB_BACKUP/"
        cp "$PROJECT_DIR/data/wizard.db-shm" "$DB_BACKUP/" 2>/dev/null || true
        cp "$PROJECT_DIR/data/wizard.db-wal" "$DB_BACKUP/" 2>/dev/null || true
        log "${GREEN}✅ 备份：wizard.db${NC}"
    fi
    
    # 备份 migrations
    if [ -d "$PROJECT_DIR/migrations" ]; then
        cp -r "$PROJECT_DIR/migrations" "$DB_BACKUP/"
        log "${GREEN}✅ 备份：migrations 目录${NC}"
    fi
    
    log "${GREEN}✅ 数据库备份完成：$DB_BACKUP${NC}"
    echo "$DB_BACKUP"
}

# 备份日志文件
backup_logs() {
    log "开始备份日志文件..."
    
    if [ -d "$PROJECT_DIR/logs" ]; then
        local LOG_BACKUP="$BACKUP_DIR/logs_$(date '+%Y%m%d_%H%M%S')"
        cp -r "$PROJECT_DIR/logs" "$LOG_BACKUP"
        log "${GREEN}✅ 备份：logs 目录${NC}"
        echo "$LOG_BACKUP"
    fi
}

# 创建完整备份包
create_backup_archive() {
    log "创建备份压缩包..."
    
    local ARCHIVE_NAME="ai-work_backup_$(date '+%Y%m%d_%H%M%S').tar.gz"
    local ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"
    
    # 创建临时目录
    local TEMP_DIR="$BACKUP_DIR/temp_backup_$(date '+%Y%m%d_%H%M%S')"
    mkdir -p "$TEMP_DIR"
    
    # 复制所有备份内容
    backup_configs > /dev/null
    backup_database > /dev/null
    
    # 复制关键文件
    cp -r "$PROJECT_DIR/.env" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/docker-compose.yml" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/scripts" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/data" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/migrations" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/monitoring" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/kubernetes" "$TEMP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/.github/workflows" "$TEMP_DIR/.github/" 2>/dev/null || true
    
    # 创建压缩包
    tar -czf "$ARCHIVE_PATH" -C "$BACKUP_DIR" "temp_backup_$(date '+%Y%m%d_%H%M%S')"
    
    # 清理临时目录
    rm -rf "$TEMP_DIR"
    
    log "${GREEN}✅ 备份压缩包创建完成：$ARCHIVE_PATH${NC}"
    log "文件大小：$(du -h "$ARCHIVE_PATH" | cut -f1)"
    echo "$ARCHIVE_PATH"
}

# 列出所有备份
list_backups() {
    log "=========================================="
    log "📦 可用备份列表"
    log "=========================================="
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -lht "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -20 || log "暂无备份文件"
    else
        log "备份目录不存在"
    fi
    
    log "=========================================="
}

# 恢复配置
restore_configs() {
    local BACKUP_FILE=$1
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log "${RED}❌ 备份文件不存在：$BACKUP_FILE${NC}"
        exit 1
    fi
    
    log "开始恢复配置..."
    
    # 创建临时目录
    local TEMP_DIR="$BACKUP_DIR/restore_temp_$(date '+%Y%m%d_%H%M%S')"
    mkdir -p "$TEMP_DIR"
    
    # 解压备份
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    
    # 恢复配置文件
    local RESTORED_DIR=$(ls -d "$TEMP_DIR"/temp_backup_* 2>/dev/null | head -1)
    if [ -d "$RESTORED_DIR" ]; then
        # 恢复 .env
        if [ -f "$RESTORED_DIR/.env" ]; then
            cp "$RESTORED_DIR/.env" "$PROJECT_DIR/"
            log "${GREEN}✅ 恢复：.env${NC}"
        fi
        
        # 恢复 docker-compose.yml
        if [ -f "$RESTORED_DIR/docker-compose.yml" ]; then
            cp "$RESTORED_DIR/docker-compose.yml" "$PROJECT_DIR/"
            log "${GREEN}✅ 恢复：docker-compose.yml${NC}"
        fi
        
        # 恢复 scripts
        if [ -d "$RESTORED_DIR/scripts" ]; then
            cp -r "$RESTORED_DIR/scripts/"* "$PROJECT_DIR/scripts/"
            log "${GREEN}✅ 恢复：scripts${NC}"
        fi
        
        # 恢复 monitoring
        if [ -d "$RESTORED_DIR/monitoring" ]; then
            cp -r "$RESTORED_DIR/monitoring/"* "$PROJECT_DIR/monitoring/"
            log "${GREEN}✅ 恢复：monitoring${NC}"
        fi
        
        # 恢复 kubernetes
        if [ -d "$RESTORED_DIR/kubernetes" ]; then
            cp -r "$RESTORED_DIR/kubernetes/"* "$PROJECT_DIR/kubernetes/"
            log "${GREEN}✅ 恢复：kubernetes${NC}"
        fi
        
        # 恢复 .github/workflows
        if [ -d "$RESTORED_DIR/.github/workflows" ]; then
            cp -r "$RESTORED_DIR/.github/workflows/"* "$PROJECT_DIR/.github/workflows/"
            log "${GREEN}✅ 恢复：.github/workflows${NC}"
        fi
    fi
    
    # 清理临时目录
    rm -rf "$TEMP_DIR"
    
    log "${GREEN}✅ 配置恢复完成${NC}"
}

# 恢复数据库
restore_database() {
    local BACKUP_FILE=$1
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log "${RED}❌ 备份文件不存在：$BACKUP_FILE${NC}"
        exit 1
    fi
    
    log "开始恢复数据库..."
    
    # 停止服务
    log "停止服务..."
    docker-compose down 2>/dev/null || true
    
    # 创建临时目录
    local TEMP_DIR="$BACKUP_DIR/restore_temp_$(date '+%Y%m%d_%H%M%S')"
    mkdir -p "$TEMP_DIR"
    
    # 解压备份
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    
    local RESTORED_DIR=$(ls -d "$TEMP_DIR"/temp_backup_* 2>/dev/null | head -1)
    if [ -d "$RESTORED_DIR" ]; then
        # 恢复数据库
        if [ -f "$RESTORED_DIR/data/wizard.db" ]; then
            cp "$RESTORED_DIR/data/wizard.db" "$PROJECT_DIR/data/"
            cp "$RESTORED_DIR/data/wizard.db-shm" "$PROJECT_DIR/data/" 2>/dev/null || true
            cp "$RESTORED_DIR/data/wizard.db-wal" "$PROJECT_DIR/data/" 2>/dev/null || true
            log "${GREEN}✅ 恢复：wizard.db${NC}"
        fi
        
        # 恢复 migrations
        if [ -d "$RESTORED_DIR/migrations" ]; then
            cp -r "$RESTORED_DIR/migrations/"* "$PROJECT_DIR/migrations/"
            log "${GREEN}✅ 恢复：migrations${NC}"
        fi
    fi
    
    # 清理临时目录
    rm -rf "$TEMP_DIR"
    
    # 重启服务
    log "重启服务..."
    docker-compose up -d 2>/dev/null || true
    
    log "${GREEN}✅ 数据库恢复完成${NC}"
}

# 完整恢复
restore_full() {
    local BACKUP_FILE=$1
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log "${RED}❌ 备份文件不存在：$BACKUP_FILE${NC}"
        exit 1
    fi
    
    log "=========================================="
    log "🔄 开始完整恢复"
    log "=========================================="
    
    # 停止服务
    log "停止所有服务..."
    docker-compose down 2>/dev/null || true
    pm2 stop all 2>/dev/null || true
    
    # 恢复配置
    restore_configs "$BACKUP_FILE"
    
    # 恢复数据库
    restore_database "$BACKUP_FILE"
    
    # 设置权限
    log "设置文件权限..."
    chmod +x "$PROJECT_DIR/scripts/"*.sh 2>/dev/null || true
    
    # 重启服务
    log "重启服务..."
    docker-compose up -d 2>/dev/null || true
    pm2 restart all 2>/dev/null || true
    
    # 健康检查
    log "执行健康检查..."
    sleep 5
    if curl -sf http://localhost:10001/health > /dev/null 2>&1; then
        log "${GREEN}✅ 服务健康检查通过${NC}"
    else
        log "${YELLOW}⚠️ 健康检查未通过，请手动检查服务状态${NC}"
    fi
    
    log "=========================================="
    log "${GREEN}✅ 完整恢复完成${NC}"
    log "=========================================="
}

# 清理旧备份（保留最近 7 天）
cleanup_old_backups() {
    log "清理 7 天前的旧备份..."
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +7 -delete
        log "${GREEN}✅ 旧备份清理完成${NC}"
    fi
}

# 显示帮助
show_help() {
    log "=========================================="
    log "OpenClaw-Admin 配置备份恢复工具"
    log "=========================================="
    log ""
    log "用法：$0 <命令> [参数]"
    log ""
    log "命令:"
    log "  backup              创建完整备份"
    log "  backup-configs      仅备份配置文件"
    log "  backup-db           仅备份数据库"
    log "  list                列出所有备份"
    log "  restore <文件>      从备份文件恢复（完整恢复）"
    log "  restore-configs <文件>  仅恢复配置"
    log "  restore-db <文件>   仅恢复数据库"
    log "  cleanup             清理 7 天前的旧备份"
    log "  help                显示帮助信息"
    log ""
    log "示例:"
    log "  $0 backup"
    log "  $0 list"
    log "  $0 restore /www/wwwroot/ai-work/backups/ai-work_backup_20260412_120000.tar.gz"
    log "=========================================="
}

# 主函数
main() {
    setup_backup_dir
    
    case "$1" in
        backup)
            create_backup_archive
            ;;
        backup-configs)
            backup_configs
            ;;
        backup-db)
            backup_database
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_full "$2"
            ;;
        restore-configs)
            restore_configs "$2"
            ;;
        restore-db)
            restore_database "$2"
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# 执行
main "$@"
