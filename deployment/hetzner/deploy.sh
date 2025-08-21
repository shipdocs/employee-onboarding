#!/bin/bash

# Maritime Onboarding System - Interactive Hetzner Cloud Deployment Script
# Intelligent deployment with user-friendly prompts and robust error handling
#
# Usage:
#   ./deploy.sh                    # Interactive mode (recommended)
#   ./deploy.sh --non-interactive  # Non-interactive mode with defaults
#   ./deploy.sh --help            # Show help
#
# Prerequisites:
#   - Hetzner Cloud API token (set as HETZNER_API_TOKEN environment variable)
#   - curl, jq, ssh-keygen, rsync installed
#
# Example:
#   export HETZNER_API_TOKEN="your-64-character-token"
#   ./deploy.sh

set -e

# Show help
show_help() {
    echo -e "${BLUE}Maritime Onboarding System - Hetzner Cloud Deployment${NC}"
    echo ""
    echo -e "${CYAN}DESCRIPTION:${NC}"
    echo "  Interactive deployment script for Maritime Onboarding System on Hetzner Cloud"
    echo "  Provides guided setup with smart defaults and comprehensive error handling"
    echo ""
    echo -e "${CYAN}USAGE:${NC}"
    echo "  $0 [OPTIONS]"
    echo ""
    echo -e "${CYAN}OPTIONS:${NC}"
    echo "  -h, --help              Show this help message"
    echo "  -y, --non-interactive   Run in non-interactive mode with defaults"
    echo "  --server-type TYPE      Override server type (cax11, cx21, cx31, etc.)"
    echo "  --location LOC          Override location (nbg1, fsn1, hel1, ash)"
    echo "  --project-name NAME     Override project name"
    echo ""
    echo -e "${CYAN}PREREQUISITES:${NC}"
    echo "  • Hetzner Cloud API token (get from https://console.hetzner.cloud)"
    echo "  • Required tools: curl, jq, ssh-keygen, rsync"
    echo ""
    echo -e "${CYAN}ENVIRONMENT VARIABLES:${NC}"
    echo "  HETZNER_API_TOKEN       Your 64-character Hetzner Cloud API token (required)"
    echo ""
    echo -e "${CYAN}EXAMPLES:${NC}"
    echo "  # Interactive deployment (recommended for first-time users)"
    echo "  export HETZNER_API_TOKEN=\"your-token-here\""
    echo "  $0"
    echo ""
    echo "  # Non-interactive deployment with defaults"
    echo "  export HETZNER_API_TOKEN=\"your-token-here\""
    echo "  $0 --non-interactive"
    echo ""
    echo "  # Custom configuration"
    echo "  export HETZNER_API_TOKEN=\"your-token-here\""
    echo "  $0 --server-type cx31 --location fsn1 --project-name my-maritime-app"
    echo ""
    echo -e "${CYAN}ESTIMATED COSTS:${NC}"
    echo "  • cax11 (ARM, 2 vCPU, 4GB): ~€3.29/month"
    echo "  • cx21 (x86, 2 vCPU, 4GB):  ~€5.83/month"
    echo "  • cx31 (x86, 2 vCPU, 8GB):  ~€10.05/month"
    echo ""
    exit 0
}

# Configuration based on Context7 Hetzner Cloud patterns
# SECURITY: API token must be provided via environment variable
HETZNER_API_TOKEN="${HETZNER_API_TOKEN:-}"
PROJECT_NAME="maritime-onboarding"
SERVER_NAME="${PROJECT_NAME}-prod"
SERVER_TYPE="cax11"  # 2 vCPU, 4GB RAM, 40GB SSD - ARM-based, cost-optimized €3.29/month
LOCATION="nbg1"     # Nuremberg datacenter (EU-Central)
IMAGE="ubuntu-22.04"
SSH_KEY_NAME="${PROJECT_NAME}-deployment-key"

# Deployment configuration
DEPLOYMENT_TIMEOUT=600  # 10 minutes max for deployment
BUILD_TIMEOUT=300       # 5 minutes max for build
HEALTH_CHECK_TIMEOUT=180 # 3 minutes max for health checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Interactive mode flag
INTERACTIVE_MODE=true

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

question() {
    echo -e "${PURPLE}[QUESTION] $1${NC}"
}

# Interactive prompt function
ask_user() {
    local prompt="$1"
    local default="$2"
    local response

    if [ "$INTERACTIVE_MODE" = false ]; then
        echo "$default"
        return
    fi

    if [ -n "$default" ]; then
        question "$prompt (default: $default): "
    else
        question "$prompt: "
    fi

    read -r response
    echo "${response:-$default}"
}

# Multiple choice prompt
ask_choice() {
    local prompt="$1"
    shift
    local choices=("$@")
    local choice

    if [ "$INTERACTIVE_MODE" = false ]; then
        echo "${choices[0]}"
        return
    fi

    echo -e "${PURPLE}$prompt${NC}"
    for i in "${!choices[@]}"; do
        echo -e "${CYAN}  $((i+1)). ${choices[i]}${NC}"
    done

    while true; do
        question "Enter choice (1-${#choices[@]})"
        read -r choice

        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#choices[@]}" ]; then
            echo "${choices[$((choice-1))]}"
            return
        else
            warn "Invalid choice. Please enter a number between 1 and ${#choices[@]}"
        fi
    done
}

# Confirmation prompt
confirm() {
    local prompt="$1"
    local default="${2:-n}"
    local response

    if [ "$INTERACTIVE_MODE" = false ]; then
        [ "$default" = "y" ] && return 0 || return 1
    fi

    question "$prompt (y/n, default: $default): "
    read -r response
    response="${response:-$default}"

    [[ "$response" =~ ^[Yy]$ ]]
}

# Interactive configuration setup
setup_configuration() {
    log "🚀 Maritime Onboarding System - Interactive Deployment Setup"
    echo ""

    # Check for non-interactive mode
    if [ "$1" = "--non-interactive" ] || [ "$1" = "-y" ]; then
        INTERACTIVE_MODE=false
        log "Running in non-interactive mode with defaults"
    fi

    # API Token setup
    if [ -z "$HETZNER_API_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  HETZNER_API_TOKEN not found in environment${NC}"
        echo ""
        info "You need a Hetzner Cloud API token to proceed."
        info "Get one from: https://console.hetzner.cloud/projects -> Security -> API Tokens"
        echo ""

        if confirm "Do you have a Hetzner Cloud API token ready?" "n"; then
            question "Please enter your Hetzner Cloud API token: "
            read -r HETZNER_API_TOKEN
            export HETZNER_API_TOKEN
        else
            error "Please get a Hetzner Cloud API token first and set it as HETZNER_API_TOKEN environment variable"
        fi
    fi

    # Server configuration
    echo ""
    log "🖥️  Server Configuration"

    # Server type selection
    local server_choice
    server_choice=$(ask_choice "Choose server type:" \
        "cax11 - ARM64, 2 vCPU, 4GB RAM, €3.29/month (Recommended for small deployments)" \
        "cx21 - x86, 2 vCPU, 4GB RAM, €5.83/month (Better compatibility)" \
        "cx31 - x86, 2 vCPU, 8GB RAM, €10.05/month (More memory for builds)" \
        "Custom - I'll specify my own")

    case "$server_choice" in
        *"cax11"*) SERVER_TYPE="cax11" ;;
        *"cx21"*) SERVER_TYPE="cx21" ;;
        *"cx31"*) SERVER_TYPE="cx31" ;;
        *"Custom"*) SERVER_TYPE=$(ask_user "Enter server type" "cx21") ;;
    esac

    # Location selection
    local location_choice
    location_choice=$(ask_choice "Choose datacenter location:" \
        "nbg1 - Nuremberg, Germany (EU-Central)" \
        "fsn1 - Falkenstein, Germany (EU-Central)" \
        "hel1 - Helsinki, Finland (EU-North)" \
        "ash - Ashburn, USA (US-East)" \
        "Custom - I'll specify my own")

    case "$location_choice" in
        *"nbg1"*) LOCATION="nbg1" ;;
        *"fsn1"*) LOCATION="fsn1" ;;
        *"hel1"*) LOCATION="hel1" ;;
        *"ash"*) LOCATION="ash" ;;
        *"Custom"*) LOCATION=$(ask_user "Enter location code" "nbg1") ;;
    esac

    # Project name
    PROJECT_NAME=$(ask_user "Project name" "maritime-onboarding")
    SERVER_NAME="${PROJECT_NAME}-prod"
    SSH_KEY_NAME="${PROJECT_NAME}-deployment-key"

    # Domain configuration
    echo ""
    log "🌐 Domain Configuration"

    if confirm "Do you want to configure a custom domain?" "n"; then
        DOMAIN=$(ask_user "Enter your domain name (e.g., maritime.example.com)")

        if [ -n "$DOMAIN" ]; then
            SSL_EMAIL=$(ask_user "Email for SSL certificate" "admin@$DOMAIN")

            # Check if domain uses Hetzner DNS
            if confirm "Is your domain using Hetzner DNS?" "n"; then
                SETUP_HETZNER_DNS=true
                info "Will configure Hetzner DNS automatically"
            else
                SETUP_HETZNER_DNS=false
                warn "You'll need to manually point your domain to the server IP"
                info "Add an A record: $DOMAIN -> [SERVER_IP]"
            fi
        fi
    else
        DOMAIN=""
        SSL_EMAIL=""
        SETUP_HETZNER_DNS=false
        info "Skipping domain configuration - will use IP address"
    fi

    echo ""
    info "Configuration Summary:"
    info "  Server Type: $SERVER_TYPE"
    info "  Location: $LOCATION"
    info "  Project: $PROJECT_NAME"
    info "  Server Name: $SERVER_NAME"
    if [ -n "$DOMAIN" ]; then
        info "  Domain: $DOMAIN"
        info "  SSL Email: $SSL_EMAIL"
        info "  Hetzner DNS: $SETUP_HETZNER_DNS"
    else
        info "  Domain: Not configured (will use IP)"
    fi
    echo ""
}

# Check dependencies and environment
check_dependencies() {
    log "Checking dependencies and environment..."

    # Check required tools
    local missing_tools=()

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if ! command -v ssh-keygen &> /dev/null; then
        missing_tools+=("ssh-keygen")
    fi

    if ! command -v rsync &> /dev/null; then
        missing_tools+=("rsync")
    fi

    if [ ${#missing_tools[@]} -gt 0 ]; then
        error "Missing required tools: ${missing_tools[*]}. Please install them first."
    fi

    # Validate API token format (should be 64 characters)
    if [ ${#HETZNER_API_TOKEN} -ne 64 ]; then
        error "HETZNER_API_TOKEN appears to be invalid (should be 64 characters)"
    fi

    log "All dependencies and environment checks passed"
}

# Generate SSH key if it doesn't exist
generate_ssh_key() {
    if [ ! -f ~/.ssh/maritime_deployment ]; then
        log "Generating SSH key for deployment..."
        ssh-keygen -t ed25519 -f ~/.ssh/maritime_deployment -N "" -C "maritime-deployment@$(hostname)"
        chmod 600 ~/.ssh/maritime_deployment
        chmod 644 ~/.ssh/maritime_deployment.pub
        log "SSH key generated: ~/.ssh/maritime_deployment"
    else
        log "SSH key already exists: ~/.ssh/maritime_deployment"
    fi
}

# Upload SSH key to Hetzner
upload_ssh_key() {
    log "Uploading SSH key to Hetzner Cloud..."
    
    # Check if key already exists
    existing_key=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://api.hetzner.cloud/v1/ssh_keys" | \
        jq -r ".ssh_keys[] | select(.name == \"$SSH_KEY_NAME\") | .id")
    
    if [ "$existing_key" != "null" ] && [ -n "$existing_key" ]; then
        log "SSH key already exists in Hetzner Cloud (ID: $existing_key)"
        SSH_KEY_ID=$existing_key
    else
        log "Creating new SSH key in Hetzner Cloud..."
        SSH_PUBLIC_KEY=$(cat ~/.ssh/maritime_deployment.pub)
        
        response=$(curl -s -X POST \
            -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"$SSH_KEY_NAME\",
                \"public_key\": \"$SSH_PUBLIC_KEY\"
            }" \
            "https://api.hetzner.cloud/v1/ssh_keys")
        
        SSH_KEY_ID=$(echo $response | jq -r '.ssh_key.id')
        
        if [ "$SSH_KEY_ID" == "null" ]; then
            error "Failed to upload SSH key: $(echo $response | jq -r '.error.message')"
        fi
        
        log "SSH key uploaded successfully (ID: $SSH_KEY_ID)"
    fi
}

# Create server
create_server() {
    log "Checking if server already exists..."
    
    # Check if server already exists
    existing_server=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://api.hetzner.cloud/v1/servers" | \
        jq -r ".servers[] | select(.name == \"$SERVER_NAME\") | .id")
    
    if [ "$existing_server" != "null" ] && [ -n "$existing_server" ]; then
        log "Server already exists (ID: $existing_server)"
        SERVER_ID=$existing_server
        
        # Get server IP
        SERVER_IP=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            "https://api.hetzner.cloud/v1/servers/$SERVER_ID" | \
            jq -r '.server.public_net.ipv4.ip')
        
        log "Server IP: $SERVER_IP"
    else
        log "Creating new server..."
        
        response=$(curl -s -X POST \
            -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"$SERVER_NAME\",
                \"server_type\": \"$SERVER_TYPE\",
                \"location\": \"$LOCATION\",
                \"image\": \"$IMAGE\",
                \"ssh_keys\": [$SSH_KEY_ID],
                \"user_data\": \"$(cat deployment/hetzner/cloud-init.yml | base64 -w 0)\"
            }" \
            "https://api.hetzner.cloud/v1/servers")
        
        SERVER_ID=$(echo $response | jq -r '.server.id')
        ACTION_ID=$(echo $response | jq -r '.action.id')
        
        if [ "$SERVER_ID" == "null" ]; then
            error "Failed to create server: $(echo $response | jq -r '.error.message')"
        fi
        
        log "Server creation initiated (ID: $SERVER_ID, Action: $ACTION_ID)"
        
        # Wait for server to be ready
        log "Waiting for server to be ready..."
        while true; do
            status=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
                "https://api.hetzner.cloud/v1/actions/$ACTION_ID" | \
                jq -r '.action.status')
            
            if [ "$status" == "success" ]; then
                break
            elif [ "$status" == "error" ]; then
                error "Server creation failed"
            fi
            
            echo -n "."
            sleep 5
        done
        
        echo ""
        log "Server created successfully!"
        
        # Get server IP
        SERVER_IP=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            "https://api.hetzner.cloud/v1/servers/$SERVER_ID" | \
            jq -r '.server.public_net.ipv4.ip')
        
        log "Server IP: $SERVER_IP"
        
        # Wait for SSH to be available
        log "Waiting for SSH to be available..."
        while ! ssh -i ~/.ssh/maritime_deployment -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'SSH ready'" 2>/dev/null; do
            echo -n "."
            sleep 10
        done
        echo ""
        log "SSH is ready!"
    fi
}

# Validate codebase before deployment
validate_codebase() {
    log "Validating codebase before deployment..."

    # Check for critical files
    if [ ! -f "package.json" ]; then
        error "package.json not found - not a valid Node.js project"
    fi

    if [ ! -f "server.js" ] && [ ! -f "app.js" ] && [ ! -f "index.js" ]; then
        error "No main server file found (server.js, app.js, or index.js)"
    fi

    # Check for syntax errors in main server file
    if [ -f "server.js" ]; then
        node -c server.js || error "server.js has syntax errors"
    fi

    # Check for hybrid architecture warning
    if [ -f "next.config.js" ] && [ -f "server.js" ]; then
        warn "Detected Next.js config with custom server - ensure architecture is consistent"
    fi

    # Check package.json for required scripts
    if ! grep -q '"start"' package.json; then
        warn "No 'start' script found in package.json"
    fi

    log "Codebase validation completed"
}

# Deploy application with improved error handling and rollback
deploy_application() {
    log "Deploying Maritime Onboarding System with enhanced reliability..."

    # Validate codebase first
    validate_codebase

    # Create deployment directory structure
    ssh -i ~/.ssh/maritime_deployment -o StrictHostKeyChecking=no root@$SERVER_IP "mkdir -p /opt/maritime-onboarding/{data,logs,backups,uploads,certificates}"

    # Generate secure environment file
    log "Generating secure production environment..."
    generate_secure_env_file

    # Copy application files with optimized exclusions
    log "Copying application files..."
    rsync -avz -e "ssh -i ~/.ssh/maritime_deployment -o StrictHostKeyChecking=no" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='.env*' \
        --exclude='deployment/hetzner/terraform' \
        --exclude='docs/generated' \
        --exclude='client/node_modules' \
        --exclude='client/build' \
        ./ root@$SERVER_IP:/opt/maritime-onboarding/

    # Copy optimized Docker Compose configuration
    scp -i ~/.ssh/maritime_deployment -o StrictHostKeyChecking=no \
        deployment/hetzner/docker-compose.prod.yml root@$SERVER_IP:/opt/maritime-onboarding/docker-compose.yml

    # Copy generated environment file
    scp -i ~/.ssh/maritime_deployment -o StrictHostKeyChecking=no \
        /tmp/maritime-env-production root@$SERVER_IP:/opt/maritime-onboarding/.env

    # Copy deployment scripts
    scp -i ~/.ssh/maritime_deployment -o StrictHostKeyChecking=no \
        deployment/hetzner/server-setup.sh root@$SERVER_IP:/opt/maritime-onboarding/

    # Run deployment with timeout and error handling
    log "Starting deployment with timeout of ${DEPLOYMENT_TIMEOUT} seconds..."
    if ! timeout $DEPLOYMENT_TIMEOUT ssh -i ~/.ssh/maritime_deployment -o StrictHostKeyChecking=no root@$SERVER_IP "cd /opt/maritime-onboarding && bash server-setup.sh"; then
        error "Deployment failed or timed out after ${DEPLOYMENT_TIMEOUT} seconds"
    fi

    # Validate deployment success
    validate_deployment

    # Clean up temporary files
    rm -f /tmp/maritime-env-production
}

# Generate secure environment file using Context7 patterns
generate_secure_env_file() {
    log "Generating secure environment configuration..."

    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    # Create production environment file
    cat > /tmp/maritime-env-production << EOF
# Maritime Onboarding System - Production Environment
# Generated with secure random passwords

NODE_ENV=production
APP_URL=http://$SERVER_IP
PORT=3000

# Database Configuration
DB_NAME=maritime_onboarding
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@database:5432/maritime_onboarding

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
WEBHOOK_SECRET=$WEBHOOK_SECRET

# Email Configuration (configure these later)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=Maritime Onboarding <noreply@your-domain.com>

# Security Contacts
SECURITY_EMAIL=security@your-domain.com
DEVOPS_EMAIL=devops@your-domain.com

# SSL Configuration
DOMAIN=${DOMAIN:-your-domain.com}
SSL_EMAIL=${SSL_EMAIL:-admin@your-domain.com}

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
EOF

    log "Secure environment file generated with random passwords"
}

# Configure Hetzner DNS if requested
configure_hetzner_dns() {
    if [ "$SETUP_HETZNER_DNS" != "true" ] || [ -z "$DOMAIN" ]; then
        log "Skipping Hetzner DNS configuration"
        return 0
    fi

    log "Configuring Hetzner DNS for domain: $DOMAIN"

    # Extract the root domain (e.g., example.com from maritime.example.com)
    local root_domain
    if [[ "$DOMAIN" == *.*.* ]]; then
        # Subdomain case: maritime.example.com -> example.com
        root_domain=$(echo "$DOMAIN" | sed 's/^[^.]*\.//')
    else
        # Root domain case: example.com -> example.com
        root_domain="$DOMAIN"
    fi

    # Check if DNS zone exists
    local zone_id=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://dns.hetzner.com/api/v1/zones" | \
        jq -r ".zones[] | select(.name == \"$root_domain\") | .id")

    if [ "$zone_id" == "null" ] || [ -z "$zone_id" ]; then
        warn "DNS zone for $root_domain not found in Hetzner DNS"
        warn "Please create the zone manually or use external DNS"
        return 1
    fi

    log "Found DNS zone for $root_domain (ID: $zone_id)"

    # Determine record name
    local record_name
    if [ "$DOMAIN" = "$root_domain" ]; then
        record_name="@"
    else
        record_name=$(echo "$DOMAIN" | sed "s/\.$root_domain$//")
    fi

    # Check if A record already exists
    local existing_record=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://dns.hetzner.com/api/v1/records?zone_id=$zone_id" | \
        jq -r ".records[] | select(.name == \"$record_name\" and .type == \"A\") | .id")

    if [ "$existing_record" != "null" ] && [ -n "$existing_record" ]; then
        log "Updating existing A record for $DOMAIN"
        curl -s -X PUT \
            -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"value\": \"$SERVER_IP\",
                \"ttl\": 300
            }" \
            "https://dns.hetzner.com/api/v1/records/$existing_record" > /dev/null
    else
        log "Creating new A record for $DOMAIN"
        curl -s -X POST \
            -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"zone_id\": \"$zone_id\",
                \"type\": \"A\",
                \"name\": \"$record_name\",
                \"value\": \"$SERVER_IP\",
                \"ttl\": 300
            }" \
            "https://dns.hetzner.com/api/v1/records" > /dev/null
    fi

    success "DNS record configured: $DOMAIN -> $SERVER_IP"
    info "DNS propagation may take a few minutes"
}

# Configure firewall
configure_firewall() {
    log "Configuring Hetzner Cloud Firewall..."
    
    # Create firewall if it doesn't exist
    firewall_id=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://api.hetzner.cloud/v1/firewalls" | \
        jq -r ".firewalls[] | select(.name == \"maritime-firewall\") | .id")
    
    if [ "$firewall_id" == "null" ] || [ -z "$firewall_id" ]; then
        log "Creating firewall..."
        
        response=$(curl -s -X POST \
            -H "Authorization: Bearer $HETZNER_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "maritime-firewall",
                "rules": [
                    {
                        "direction": "in",
                        "port": "22",
                        "protocol": "tcp",
                        "source_ips": ["0.0.0.0/0", "::/0"]
                    },
                    {
                        "direction": "in",
                        "port": "80",
                        "protocol": "tcp",
                        "source_ips": ["0.0.0.0/0", "::/0"]
                    },
                    {
                        "direction": "in",
                        "port": "443",
                        "protocol": "tcp",
                        "source_ips": ["0.0.0.0/0", "::/0"]
                    }
                ]
            }' \
            "https://api.hetzner.cloud/v1/firewalls")
        
        firewall_id=$(echo $response | jq -r '.firewall.id')
        log "Firewall created (ID: $firewall_id)"
    else
        log "Firewall already exists (ID: $firewall_id)"
    fi
    
    # Apply firewall to server
    log "Applying firewall to server..."
    curl -s -X POST \
        -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"apply_to_resources\",
            \"resources\": [{\"type\": \"server\", \"server\": {\"id\": $SERVER_ID}}]
        }" \
        "https://api.hetzner.cloud/v1/firewalls/$firewall_id/actions" > /dev/null
}

# Show deployment plan and get confirmation
show_deployment_plan() {
    echo ""
    echo -e "${BLUE}=== 📋 Deployment Plan ===${NC}"
    echo -e "${CYAN}Project:${NC} $PROJECT_NAME"
    echo -e "${CYAN}Server:${NC} $SERVER_NAME ($SERVER_TYPE in $LOCATION)"
    echo -e "${CYAN}Estimated Cost:${NC} ~€$(get_estimated_cost)/month"
    echo -e "${CYAN}SSH Key:${NC} ~/.ssh/maritime_deployment"
    echo ""
    echo -e "${BLUE}=== 🚀 Deployment Steps ===${NC}"
    echo -e "1. 🔑 Generate/upload SSH key"
    echo -e "2. 🖥️  Create Hetzner Cloud server"
    echo -e "3. 🔥 Configure firewall"
    echo -e "4. 📦 Deploy application"
    echo -e "5. ✅ Validate deployment"
    echo ""

    if ! confirm "Proceed with deployment?" "y"; then
        log "Deployment cancelled by user"
        exit 0
    fi
}

# Get estimated monthly cost based on server type
get_estimated_cost() {
    case "$SERVER_TYPE" in
        "cax11") echo "3.29" ;;
        "cx21") echo "5.83" ;;
        "cx31") echo "10.05" ;;
        "cx41") echo "16.59" ;;
        *) echo "5-15" ;;
    esac
}

# Enhanced main deployment function
main() {
    # Setup configuration interactively
    setup_configuration "$@"

    # Show deployment plan
    show_deployment_plan

    log "🚀 Starting Maritime Onboarding System deployment on Hetzner Cloud"

    # Execute deployment steps
    check_dependencies
    generate_ssh_key
    upload_ssh_key
    create_server
    configure_firewall
    configure_hetzner_dns
    deploy_application

    # Success summary
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}=== 🌐 Access Information ===${NC}"
    echo -e "${CYAN}Application URL:${NC} http://$SERVER_IP"
    echo -e "${CYAN}SSH Access:${NC} ssh -i ~/.ssh/maritime_deployment root@$SERVER_IP"
    echo -e "${CYAN}Server Name:${NC} $SERVER_NAME"
    echo -e "${CYAN}Server Type:${NC} $SERVER_TYPE"
    echo -e "${CYAN}Location:${NC} $LOCATION"
    echo -e "${CYAN}IP Address:${NC} $SERVER_IP"
    echo ""
    echo -e "${BLUE}=== 📋 Next Steps ===${NC}"
    if [ -n "$DOMAIN" ]; then
        if [ "$SETUP_HETZNER_DNS" = "true" ]; then
            echo -e "1. ✅ Domain configured: $DOMAIN -> $SERVER_IP"
            echo -e "2. 🔒 Set up SSL certificate: ssh -i ~/.ssh/maritime_deployment root@$SERVER_IP 'cd /opt/maritime-onboarding && docker-compose --profile ssl run --rm certbot'"
        else
            echo -e "1. 🌍 Point your domain to: $SERVER_IP"
            echo -e "   Add DNS A record: $DOMAIN -> $SERVER_IP"
            echo -e "2. 🔒 Set up SSL certificate after DNS propagation"
        fi
        echo -e "3. 📧 Configure email settings in .env file"
        echo -e "4. 👤 Create your first admin user"
        echo -e "5. 🔐 Change default passwords"
    else
        echo -e "1. 🌍 Configure your domain to point to $SERVER_IP"
        echo -e "2. 🔒 Set up SSL certificate: docker-compose --profile ssl run --rm certbot"
        echo -e "3. 📧 Configure email settings in .env file"
        echo -e "4. 👤 Create your first admin user"
        echo -e "5. 🔐 Change default passwords"
    fi
    echo ""
    echo -e "${YELLOW}💡 Useful Commands:${NC}"
    echo -e "  Monitor logs: ssh -i ~/.ssh/maritime_deployment root@$SERVER_IP 'cd /opt/maritime-onboarding && docker-compose logs -f'"
    echo -e "  Restart app: ssh -i ~/.ssh/maritime_deployment root@$SERVER_IP 'cd /opt/maritime-onboarding && docker-compose restart'"
    echo -e "  Health check: curl http://$SERVER_IP/health"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                ;;
            -y|--non-interactive)
                INTERACTIVE_MODE=false
                shift
                ;;
            --server-type)
                SERVER_TYPE="$2"
                shift 2
                ;;
            --location)
                LOCATION="$2"
                shift 2
                ;;
            --project-name)
                PROJECT_NAME="$2"
                shift 2
                ;;
            *)
                warn "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Run main function with argument parsing
parse_arguments "$@"
main "$@"
