#!/bin/bash

# Maritime Onboarding System - Comprehensive Deployment Validation
# Tests all aspects of the deployment to ensure everything is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    echo -e "${BLUE}🧪 Testing: $test_name${NC}"
    
    if $test_function; then
        success "✅ $test_name - PASSED"
        ((TESTS_PASSED++))
    else
        error "❌ $test_name - FAILED"
        FAILED_TESTS+=("$test_name")
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Test Docker services
test_docker_services() {
    local services=("database" "redis" "app" "nginx")
    
    for service in "${services[@]}"; do
        if ! docker-compose ps "$service" | grep -q "Up"; then
            error "Service $service is not running"
            return 1
        fi
    done
    
    info "All Docker services are running"
    return 0
}

# Test database connectivity
test_database_connectivity() {
    if docker-compose exec -T database pg_isready -U postgres >/dev/null 2>&1; then
        info "Database is accepting connections"
        return 0
    else
        error "Database is not accepting connections"
        return 1
    fi
}

# Test Redis connectivity
test_redis_connectivity() {
    local redis_password=$(grep "REDIS_PASSWORD=" .env | cut -d'=' -f2)
    
    if docker-compose exec -T redis redis-cli -a "$redis_password" ping >/dev/null 2>&1; then
        info "Redis is responding to ping"
        return 0
    else
        error "Redis is not responding"
        return 1
    fi
}

# Test application health endpoint
test_application_health() {
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health >/dev/null 2>&1; then
            info "Application health endpoint is responding"
            return 0
        fi
        
        warn "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done
    
    error "Application health endpoint is not responding after $max_attempts attempts"
    return 1
}

# Test nginx configuration
test_nginx_configuration() {
    if docker-compose exec -T nginx nginx -t >/dev/null 2>&1; then
        info "Nginx configuration is valid"
        return 0
    else
        error "Nginx configuration is invalid"
        return 1
    fi
}

# Test HTTP response codes
test_http_responses() {
    local endpoints=("/" "/health")
    
    for endpoint in "${endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost$endpoint")
        
        if [[ "$status_code" =~ ^[23] ]]; then
            info "Endpoint $endpoint returned status $status_code"
        else
            error "Endpoint $endpoint returned status $status_code"
            return 1
        fi
    done
    
    return 0
}

# Test resource usage
test_resource_usage() {
    local memory_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | grep -E "(maritime_|postgres|redis|nginx)")
    
    info "Current resource usage:"
    echo "$memory_usage"
    
    # Check if any container is using excessive memory
    if docker stats --no-stream --format "{{.MemPerc}}" | grep -E "^[89][0-9]\.|^100\." >/dev/null; then
        warn "Some containers are using high memory (>80%)"
        return 1
    fi
    
    info "Resource usage is within acceptable limits"
    return 0
}

# Test log files
test_log_files() {
    local log_dirs=("/var/log/maritime" "/opt/maritime-onboarding/logs")
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            local log_files=$(find "$log_dir" -name "*.log" -type f)
            if [ -n "$log_files" ]; then
                info "Log files found in $log_dir"
            else
                warn "No log files found in $log_dir"
            fi
        else
            warn "Log directory $log_dir does not exist"
        fi
    done
    
    return 0
}

# Test backup system
test_backup_system() {
    if [ -f "/opt/maritime-onboarding/backup.sh" ]; then
        if [ -x "/opt/maritime-onboarding/backup.sh" ]; then
            info "Backup script is present and executable"
            return 0
        else
            error "Backup script is not executable"
            return 1
        fi
    else
        error "Backup script is missing"
        return 1
    fi
}

# Test SSL readiness (if domain is configured)
test_ssl_readiness() {
    local domain=$(grep "DOMAIN=" .env | cut -d'=' -f2)
    
    if [ "$domain" = "your-domain.com" ] || [ -z "$domain" ]; then
        info "SSL not configured yet (domain not set)"
        return 0
    fi
    
    if [ -d "/etc/letsencrypt/live/$domain" ]; then
        info "SSL certificates found for $domain"
        return 0
    else
        warn "SSL certificates not found for $domain"
        return 1
    fi
}

# Test security configurations
test_security_configurations() {
    # Check if fail2ban is running
    if systemctl is-active --quiet fail2ban; then
        info "Fail2ban is active"
    else
        warn "Fail2ban is not active"
    fi
    
    # Check if UFW is enabled
    if ufw status | grep -q "Status: active"; then
        info "UFW firewall is active"
    else
        warn "UFW firewall is not active"
    fi
    
    # Check SSH configuration
    if grep -q "PasswordAuthentication no" /etc/ssh/sshd_config; then
        info "SSH password authentication is disabled"
    else
        warn "SSH password authentication is enabled"
    fi
    
    return 0
}

# Generate deployment report
generate_report() {
    echo ""
    echo -e "${BLUE}=== 📊 Deployment Validation Report ===${NC}"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "${RED}❌ Failed Tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "  • $test"
        done
        echo ""
        echo -e "${YELLOW}⚠️  Deployment has issues that need attention${NC}"
        return 1
    else
        echo -e "${GREEN}🎉 All tests passed! Deployment is healthy${NC}"
        return 0
    fi
}

# Main validation function
main() {
    log "🔍 Starting comprehensive deployment validation..."
    echo ""
    
    # Change to deployment directory
    cd /opt/maritime-onboarding || {
        error "Cannot access deployment directory"
        exit 1
    }
    
    # Run all tests
    run_test "Docker Services Status" test_docker_services
    run_test "Database Connectivity" test_database_connectivity
    run_test "Redis Connectivity" test_redis_connectivity
    run_test "Application Health" test_application_health
    run_test "Nginx Configuration" test_nginx_configuration
    run_test "HTTP Response Codes" test_http_responses
    run_test "Resource Usage" test_resource_usage
    run_test "Log Files" test_log_files
    run_test "Backup System" test_backup_system
    run_test "SSL Readiness" test_ssl_readiness
    run_test "Security Configurations" test_security_configurations
    
    # Generate final report
    generate_report
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
