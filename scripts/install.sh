#!/bin/bash

# Maritime Onboarding Platform - Universal Installer
# Supports multiple platforms and deployment scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/shipdocs/employee-onboarding.git"
INSTALL_DIR="maritime-onboarding"
MIN_DOCKER_VERSION="20.10"
MIN_COMPOSE_VERSION="2.0"

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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    log_success "Operating system: $OS"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    if ! version_ge "$DOCKER_VERSION" "$MIN_DOCKER_VERSION"; then
        log_error "Docker version $DOCKER_VERSION is too old. Minimum required: $MIN_DOCKER_VERSION"
        exit 1
    fi
    log_success "Docker version: $DOCKER_VERSION"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_VERSION=$(docker compose version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        COMPOSE_CMD="docker compose"
    fi
    
    if ! version_ge "$COMPOSE_VERSION" "$MIN_COMPOSE_VERSION"; then
        log_error "Docker Compose version $COMPOSE_VERSION is too old. Minimum required: $MIN_COMPOSE_VERSION"
        exit 1
    fi
    log_success "Docker Compose version: $COMPOSE_VERSION"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    log_success "Git is available"
    
    # Check system resources
    if [[ "$OS" == "linux" ]]; then
        TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
        if [ "$TOTAL_MEM" -lt 8 ]; then
            log_warning "System has ${TOTAL_MEM}GB RAM. Recommended minimum: 8GB"
        else
            log_success "System memory: ${TOTAL_MEM}GB"
        fi
    fi
}

version_ge() {
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

select_installation_type() {
    echo ""
    log_info "Select installation type:"
    echo "1) Quick Start (Development/Testing)"
    echo "2) Production Deployment"
    echo "3) Development Environment"
    echo "4) Custom Configuration"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1) INSTALL_TYPE="quickstart" ;;
        2) INSTALL_TYPE="production" ;;
        3) INSTALL_TYPE="development" ;;
        4) INSTALL_TYPE="custom" ;;
        *) log_error "Invalid choice"; exit 1 ;;
    esac
    
    log_success "Selected: $INSTALL_TYPE"
}

clone_repository() {
    log_info "Cloning repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Directory $INSTALL_DIR already exists"
        read -p "Remove existing directory? (y/N): " remove_dir
        if [[ $remove_dir =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            log_error "Installation cancelled"
            exit 1
        fi
    fi
    
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    log_success "Repository cloned successfully"
}

configure_environment() {
    log_info "Configuring environment..."
    
    if [ ! -f ".env.example" ]; then
        log_error ".env.example file not found"
        exit 1
    fi
    
    cp .env.example .env
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    PGADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Update .env file
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i.bak "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$MINIO_PASSWORD/" .env
    sed -i.bak "s/PGADMIN_PASSWORD=.*/PGADMIN_PASSWORD=$PGADMIN_PASSWORD/" .env
    
    rm .env.bak 2>/dev/null || true
    
    log_success "Environment configured with secure passwords"
}

start_services() {
    log_info "Starting services..."
    
    case $INSTALL_TYPE in
        "quickstart"|"production")
            $COMPOSE_CMD up -d
            ;;
        "development")
            $COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml up -d
            ;;
        "custom")
            log_info "Please run docker-compose manually with your custom configuration"
            return
            ;;
    esac
    
    log_success "Services started successfully"
}

verify_installation() {
    log_info "Verifying installation..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check if services are running
    if $COMPOSE_CMD ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Some services failed to start"
        $COMPOSE_CMD ps
        exit 1
    fi
    
    # Check health endpoints
    if curl -f http://localhost:3000/health &>/dev/null; then
        log_success "Backend API is healthy"
    else
        log_warning "Backend API health check failed"
    fi
    
    if curl -f http://localhost &>/dev/null; then
        log_success "Frontend is accessible"
    else
        log_warning "Frontend accessibility check failed"
    fi
}

show_completion_info() {
    echo ""
    log_success "🎉 Maritime Onboarding Platform installed successfully!"
    echo ""
    echo "📱 Access URLs:"
    echo "   Main Application: http://localhost"
    echo "   API Health Check: http://localhost:3000/health"
    echo "   Database Admin:   http://localhost:5050"
    echo "   File Storage:     http://localhost:9001"
    echo "   Email Testing:    http://localhost:8025"
    echo ""
    echo "🔐 Admin Credentials:"
    echo "   Email: admin@example.com"
    echo "   Password: admin123"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Change default admin password"
    echo "   2. Configure email settings for production"
    echo "   3. Set up SSL certificates for HTTPS"
    echo "   4. Review security settings"
    echo ""
    echo "📚 Documentation: https://github.com/shipdocs/employee-onboarding/docs"
    echo "💬 Support: https://github.com/shipdocs/employee-onboarding/discussions"
}

# Main installation flow
main() {
    echo "🚢 Maritime Onboarding Platform Installer"
    echo "=========================================="
    
    check_prerequisites
    select_installation_type
    clone_repository
    configure_environment
    start_services
    verify_installation
    show_completion_info
}

# Run main function
main "$@"
