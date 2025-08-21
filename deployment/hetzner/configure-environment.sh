#!/bin/bash

# Maritime Onboarding System - Dynamic Environment Configuration
# Automatically configures environment variables based on server specifications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Detect server specifications
detect_server_specs() {
    local cpu_cores=$(nproc)
    local memory_gb=$(free -g | awk '/^Mem:/{print $2}')
    local architecture=$(uname -m)
    
    echo "CPU_CORES=$cpu_cores"
    echo "MEMORY_GB=$memory_gb"
    echo "ARCHITECTURE=$architecture"
}

# Configure environment based on server specs
configure_for_server_type() {
    local server_type="$1"
    local cpu_cores="$2"
    local memory_gb="$3"
    local architecture="$4"
    
    log "Configuring environment for server type: $server_type"
    info "Detected: $cpu_cores CPU cores, ${memory_gb}GB RAM, $architecture architecture"
    
    # Base configuration
    local node_max_memory=512
    local app_memory_limit="1G"
    local app_memory_reservation="512M"
    local app_cpu_limit="1.0"
    local app_cpu_reservation="0.5"
    local uv_threadpool_size=4
    
    # Adjust based on available memory
    if [ "$memory_gb" -ge 8 ]; then
        # High memory server (CX31+)
        node_max_memory=1024
        app_memory_limit="2G"
        app_memory_reservation="1G"
        app_cpu_limit="1.5"
        uv_threadpool_size=6
        info "High memory configuration applied"
    elif [ "$memory_gb" -ge 4 ]; then
        # Standard memory server (CX21, CAX11)
        node_max_memory=768
        app_memory_limit="1.5G"
        app_memory_reservation="768M"
        app_cpu_limit="1.0"
        uv_threadpool_size=4
        info "Standard memory configuration applied"
    else
        # Low memory server (CX11)
        node_max_memory=384
        app_memory_limit="768M"
        app_memory_reservation="384M"
        app_cpu_limit="0.8"
        app_cpu_reservation="0.3"
        uv_threadpool_size=2
        warn "Low memory configuration applied - consider upgrading server"
    fi
    
    # ARM-specific optimizations
    if [[ "$architecture" == "aarch64" ]] || [[ "$server_type" == "cax"* ]]; then
        info "ARM64 optimizations applied"
        # ARM servers are generally more memory efficient
        node_max_memory=$((node_max_memory + 128))
    fi
    
    # Export configuration
    export NODE_MAX_MEMORY=$node_max_memory
    export APP_MEMORY_LIMIT=$app_memory_limit
    export APP_MEMORY_RESERVATION=$app_memory_reservation
    export APP_CPU_LIMIT=$app_cpu_limit
    export APP_CPU_RESERVATION=$app_cpu_reservation
    export UV_THREADPOOL_SIZE=$uv_threadpool_size
    
    # Log final configuration
    echo ""
    info "Final Configuration:"
    info "  NODE_MAX_MEMORY: ${node_max_memory}MB"
    info "  APP_MEMORY_LIMIT: $app_memory_limit"
    info "  APP_MEMORY_RESERVATION: $app_memory_reservation"
    info "  APP_CPU_LIMIT: $app_cpu_limit"
    info "  UV_THREADPOOL_SIZE: $uv_threadpool_size"
}

# Generate optimized environment file
generate_optimized_env() {
    local server_ip="$1"
    local server_type="$2"
    
    # Detect server specs
    eval $(detect_server_specs)
    
    # Configure for server type
    configure_for_server_type "$server_type" "$CPU_CORES" "$MEMORY_GB" "$ARCHITECTURE"
    
    # Generate secure passwords
    local db_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local redis_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local jwt_secret=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    local session_secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local webhook_secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Create optimized environment file
    cat > .env << EOF
# Maritime Onboarding System - Production Environment
# Auto-generated with server-specific optimizations
# Server: $server_type ($CPU_CORES cores, ${MEMORY_GB}GB RAM, $ARCHITECTURE)
# Generated: $(date)

NODE_ENV=production
APP_URL=http://$server_ip
PORT=3000

# Database Configuration
DB_NAME=maritime_onboarding
DB_USER=postgres
DB_PASSWORD=$db_password
DATABASE_URL=postgresql://postgres:$db_password@database:5432/maritime_onboarding

# Redis Configuration
REDIS_PASSWORD=$redis_password
REDIS_URL=redis://:$redis_password@redis:6379

# Security
JWT_SECRET=$jwt_secret
SESSION_SECRET=$session_secret
WEBHOOK_SECRET=$webhook_secret

# Performance Optimization (Auto-configured)
NODE_MAX_MEMORY=$NODE_MAX_MEMORY
APP_MEMORY_LIMIT=$APP_MEMORY_LIMIT
APP_MEMORY_RESERVATION=$APP_MEMORY_RESERVATION
APP_CPU_LIMIT=$APP_CPU_LIMIT
APP_CPU_RESERVATION=$APP_CPU_RESERVATION
UV_THREADPOOL_SIZE=$UV_THREADPOOL_SIZE

# Build Optimizations
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
NPM_CONFIG_PROGRESS=false
NPM_CONFIG_AUDIT=false

# Email Configuration (configure these later)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=Maritime Onboarding <noreply@your-domain.com>

# Security Contacts
SECURITY_EMAIL=security@your-domain.com
DEVOPS_EMAIL=devops@your-domain.com

# SSL Configuration (configure after domain setup)
DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com

# Performance & Security
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=3600
COMPRESSION_ENABLED=true
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000

# Backup
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
TZ=UTC

# Health Check
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health

# Server Information (for monitoring)
SERVER_TYPE=$server_type
SERVER_CORES=$CPU_CORES
SERVER_MEMORY_GB=$MEMORY_GB
SERVER_ARCHITECTURE=$ARCHITECTURE
EOF

    log "Optimized environment file generated for $server_type server"
}

# Main function
main() {
    local server_ip="${1:-localhost}"
    local server_type="${2:-cx21}"
    
    log "Generating optimized environment configuration..."
    generate_optimized_env "$server_ip" "$server_type"
    success "Environment configuration completed!"
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
