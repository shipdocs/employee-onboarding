#!/bin/bash

# 🚢 Maritime Onboarding - Hetzner Production Deployment Script
# Handles all the issues we encountered during manual deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/shipdocs/employee-onboarding.git"
INSTALL_DIR="/opt/maritime-onboarding"
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

# Collect deployment configuration
collect_deployment_config() {
    log_info "🔧 Collecting deployment configuration..."
    
    # Domain configuration
    echo ""
    echo -e "${YELLOW}📍 Domain Configuration${NC}"
    read -p "Enter your domain name (e.g., onboarding.yourdomain.com): " DOMAIN_NAME
    if [[ -z "$DOMAIN_NAME" ]]; then
        log_error "Domain name is required"
        exit 1
    fi
    
    # Email configuration
    echo ""
    echo -e "${YELLOW}📧 Email Configuration${NC}"
    read -p "Enter your company email domain (e.g., yourcompany.com): " EMAIL_DOMAIN
    read -p "Enter HR email address: " HR_EMAIL
    read -p "Enter QHSE email address: " QHSE_EMAIL
    
    # Git authentication
    echo ""
    echo -e "${YELLOW}🔐 Git Authentication${NC}"
    read -p "Enter GitHub username: " GIT_USERNAME
    read -s -p "Enter GitHub personal access token: " GIT_TOKEN
    echo ""
    
    # SSL configuration
    echo ""
    echo -e "${YELLOW}🔒 SSL Configuration${NC}"
    read -p "Enter email for Let's Encrypt certificates: " SSL_EMAIL
    
    log_success "Configuration collected successfully"
}

# Check prerequisites with enhanced validation
check_prerequisites() {
    log_info "🔍 Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    # Check OS (Ubuntu/Debian)
    if ! command -v apt &> /dev/null; then
        log_error "This script requires Ubuntu/Debian with apt package manager"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found. Installing Docker..."
        install_docker
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_warning "Docker Compose not found. Installing Docker Compose..."
        install_docker_compose
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_warning "Git not found. Installing Git..."
        apt update && apt install -y git
    fi
    
    # Check curl and other tools
    if ! command -v curl &> /dev/null; then
        apt update && apt install -y curl wget openssl
    fi
    
    # Check certbot
    if ! command -v certbot &> /dev/null; then
        log_warning "Certbot not found. Installing Certbot..."
        apt update && apt install -y certbot
    fi
    
    log_success "Prerequisites check completed"
}

# Install Docker if not present
install_docker() {
    log_info "Installing Docker..."
    
    # Remove old versions
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install dependencies
    apt update
    apt install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker installed successfully"
}

# Install Docker Compose if not present
install_docker_compose() {
    log_info "Installing Docker Compose..."
    
    # Download latest version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose installed successfully"
}

# Setup Git authentication
setup_git_auth() {
    log_info "🔐 Setting up Git authentication..."
    
    # Configure Git
    git config --global user.name "$GIT_USERNAME"
    git config --global credential.helper store
    
    # Store credentials
    echo "https://${GIT_USERNAME}:${GIT_TOKEN}@github.com" > ~/.git-credentials
    
    log_success "Git authentication configured"
}

# Clone or update repository
setup_repository() {
    log_info "📥 Setting up repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Directory $INSTALL_DIR already exists"
        cd "$INSTALL_DIR"
        
        # Stash any local changes and pull latest
        git stash || true
        git fetch origin
        git reset --hard origin/master
        
        log_success "Repository updated to latest version"
    else
        # Clone repository
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        log_success "Repository cloned successfully"
    fi
}

# Validate and fix code syntax
validate_code() {
    log_info "🔍 Validating code syntax..."
    
    # Check if Node.js is available for syntax validation
    if command -v node &> /dev/null; then
        # Check for syntax errors in API files
        SYNTAX_ERRORS=0
        for file in $(find api -name "*.js" 2>/dev/null | head -10); do
            if ! node -c "$file" 2>/dev/null; then
                SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
            fi
        done
        
        if [ $SYNTAX_ERRORS -gt 0 ]; then
            log_warning "Found $SYNTAX_ERRORS syntax errors. Running syntax fixes..."
            
            # Run syntax fixing scripts if they exist
            if [ -f "scripts/fix-try-catch-blocks.js" ]; then
                node scripts/fix-try-catch-blocks.js || true
            fi
            
            if [ -f "scripts/fix-all-syntax-errors.js" ]; then
                node scripts/fix-all-syntax-errors.js || true
            fi
        fi
    fi
    
    log_success "Code validation completed"
}

# Configure environment with domain-specific settings
configure_environment() {
    log_info "⚙️ Configuring environment..."
    
    # Copy environment template
    if [ ! -f ".env" ]; then
        cp .env.example .env
    fi
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    PGADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    CRON_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Update .env file with domain-specific configuration
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$JWT_SECRET/" .env
    sed -i "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$MINIO_PASSWORD/" .env
    sed -i "s/PGADMIN_PASSWORD=.*/PGLADMIN_PASSWORD=$PGADMIN_PASSWORD/" .env
    sed -i "s/CRON_SECRET=.*/CRON_SECRET=$CRON_SECRET/" .env
    sed -i "s/NODE_ENV=.*/NODE_ENV=production/" .env
    sed -i "s/BASE_URL=.*/BASE_URL=https:\/\/$DOMAIN_NAME/" .env
    sed -i "s/NEXTAUTH_URL=.*/NEXTAUTH_URL=https:\/\/$DOMAIN_NAME/" .env
    
    # Update email configuration
    if [[ -n "$HR_EMAIL" ]]; then
        sed -i "s/HR_EMAIL=.*/HR_EMAIL=$HR_EMAIL/" .env
    fi
    if [[ -n "$QHSE_EMAIL" ]]; then
        sed -i "s/QHSE_EMAIL=.*/QHSE_EMAIL=$QHSE_EMAIL/" .env
    fi
    
    # Update database URL
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost:5432/employee_onboarding|" .env
    
    log_success "Environment configured with secure passwords"
}

# Main deployment function
main() {
    echo -e "${BLUE}🚢 Maritime Onboarding - Hetzner Deployment${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
    
    collect_deployment_config
    check_prerequisites
    setup_git_auth
    setup_repository
    validate_code
    configure_environment
    
    log_success "🎉 Basic setup completed!"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Run: ./scripts/hetzner-deploy-ssl.sh (for SSL setup)"
    echo "2. Run: ./scripts/hetzner-deploy-services.sh (to start services)"
    echo "3. Configure DNS to point $DOMAIN_NAME to this server"
    echo ""
}

# Run main function
main "$@"
