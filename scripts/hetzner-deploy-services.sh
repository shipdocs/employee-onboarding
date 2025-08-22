#!/bin/bash

# 🚀 Maritime Onboarding - Services Deployment for Hetzner
# Builds and starts all services with proper validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/maritime-onboarding"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load configuration
load_config() {
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        log_error "Environment file not found. Run hetzner-deploy.sh first."
        exit 1
    fi
    
    cd "$INSTALL_DIR"
    
    # Extract domain from BASE_URL
    DOMAIN_NAME=$(grep "BASE_URL=" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||')
    
    log_info "Deploying services for domain: $DOMAIN_NAME"
}

# Validate dependencies are in correct place
validate_dependencies() {
    log_info "🔍 Validating dependencies..."
    
    # Check if glob is in production dependencies
    if grep -q '"glob":' package.json; then
        if grep -A 20 '"dependencies":' package.json | grep -q '"glob":'; then
            log_success "glob dependency is correctly in production dependencies"
        else
            log_warning "Moving glob to production dependencies..."
            # This should already be fixed in the latest code, but just in case
            sed -i '/"dependencies": {/,/}/ { /"glob":/ { h; d; }; }; /"devDependencies": {/,/}/ { /"glob":/ d; }; /"dependencies": {/ { a\    "glob": "^11.0.3", ; G; }' package.json
        fi
    fi
    
    log_success "Dependencies validation completed"
}

# Build containers
build_containers() {
    log_info "🏗️ Building containers..."
    
    # Build backend container
    log_info "Building backend container..."
    docker-compose build backend
    
    if [ $? -eq 0 ]; then
        log_success "Backend container built successfully"
    else
        log_error "Failed to build backend container"
        exit 1
    fi
    
    # Build frontend container
    log_info "Building frontend container..."
    docker-compose build frontend
    
    if [ $? -eq 0 ]; then
        log_success "Frontend container built successfully"
    else
        log_error "Failed to build frontend container"
        exit 1
    fi
    
    log_success "All containers built successfully"
}

# Start services in correct order
start_services() {
    log_info "🚀 Starting services..."
    
    # Start database first
    log_info "Starting database..."
    docker-compose up -d database
    sleep 10
    
    # Start supporting services
    log_info "Starting supporting services..."
    docker-compose up -d minio redis postgrest
    sleep 10
    
    # Start backend
    log_info "Starting backend..."
    docker-compose up -d backend
    sleep 15
    
    # Start frontend
    log_info "Starting frontend..."
    docker-compose up -d frontend
    sleep 10
    
    log_success "All services started"
}

# Validate service health
validate_services() {
    log_info "🏥 Validating service health..."
    
    # Check if all containers are running
    RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l)
    TOTAL_CONTAINERS=$(docker-compose ps --services | wc -l)
    
    log_info "Running containers: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS"
    
    # Check individual service health
    check_service_health "database" "5432"
    check_service_health "backend" "3000"
    check_service_health "frontend" "80"
    check_service_health "minio" "9000"
    check_service_health "redis" "6379"
    check_service_health "postgrest" "3001"
    
    # Check API endpoints
    log_info "Testing API endpoints..."
    
    # Test backend health
    if curl -f -s "http://localhost:3000/health" > /dev/null; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed"
    fi
    
    # Test API health endpoint
    if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
        log_success "API health endpoint working"
    else
        log_warning "API health endpoint failed"
    fi
    
    # Test frontend
    if curl -f -s "http://localhost/" > /dev/null; then
        log_success "Frontend accessibility check passed"
    else
        log_warning "Frontend accessibility check failed"
    fi
    
    # Test HTTPS if domain is configured
    if [[ -n "$DOMAIN_NAME" ]]; then
        if curl -f -s "https://$DOMAIN_NAME/api/health" > /dev/null; then
            log_success "HTTPS API endpoint working"
        else
            log_warning "HTTPS API endpoint failed - DNS might not be propagated yet"
        fi
    fi
}

# Check individual service health
check_service_health() {
    local service_name=$1
    local port=$2
    
    if docker-compose ps "$service_name" | grep -q "Up"; then
        log_success "$service_name is running"
        
        # Additional port check
        if netstat -tuln | grep -q ":$port "; then
            log_success "$service_name port $port is accessible"
        else
            log_warning "$service_name port $port is not accessible"
        fi
    else
        log_error "$service_name is not running"
        docker-compose logs "$service_name" --tail=10
    fi
}

# Setup database with initial data
setup_database() {
    log_info "🗄️ Setting up database..."
    
    # Wait for database to be ready
    sleep 20
    
    # Check if database is accessible
    if docker-compose exec -T database psql -U postgres -d employee_onboarding -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database is accessible"
        
        # Check if tables exist
        TABLE_COUNT=$(docker-compose exec -T database psql -U postgres -d employee_onboarding -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
        
        if [ "$TABLE_COUNT" -gt 10 ]; then
            log_success "Database schema is loaded ($TABLE_COUNT tables)"
        else
            log_warning "Database schema might not be fully loaded"
        fi
    else
        log_error "Database is not accessible"
        docker-compose logs database --tail=20
    fi
}

# Show deployment summary
show_deployment_summary() {
    echo ""
    log_success "🎉 Maritime Onboarding Platform deployed successfully!"
    echo ""
    echo -e "${BLUE}📱 Access URLs:${NC}"
    if [[ -n "$DOMAIN_NAME" ]]; then
        echo "   🌐 Main Application: https://$DOMAIN_NAME"
        echo "   🔍 API Health Check: https://$DOMAIN_NAME/api/health"
    fi
    echo "   🏠 Local Frontend:    http://localhost"
    echo "   🔧 Backend API:       http://localhost:3000"
    echo "   🗄️ Database API:      http://localhost:3001"
    echo "   📊 Database Admin:    http://localhost:5050"
    echo "   📁 File Storage:      http://localhost:9001"
    echo ""
    echo -e "${BLUE}🔐 Service Status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "   1. Configure DNS to point $DOMAIN_NAME to this server"
    echo "   2. Test the application thoroughly"
    echo "   3. Set up monitoring and backups"
    echo "   4. Review security settings"
    echo ""
    echo -e "${BLUE}🛠️ Management Commands:${NC}"
    echo "   • View logs: docker-compose logs [service]"
    echo "   • Restart service: docker-compose restart [service]"
    echo "   • Update deployment: git pull && docker-compose build && docker-compose up -d"
    echo ""
}

# Main services deployment function
main() {
    echo -e "${BLUE}🚀 Maritime Onboarding - Services Deployment${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    load_config
    validate_dependencies
    build_containers
    start_services
    setup_database
    validate_services
    show_deployment_summary
    
    log_success "🎉 Deployment completed successfully!"
}

# Run main function
main "$@"
