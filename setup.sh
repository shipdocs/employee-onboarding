#!/bin/bash

# Maritime Employee Onboarding System - Automated Setup Script
# This script automates the installation process for the onboarding system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

echo "======================================"
echo "Maritime Onboarding System Setup"
echo "======================================"
echo ""

# Step 1: Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker found"

if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose found"

# Step 2: Check if .env exists, create from example if not
print_info "Setting up environment configuration..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        
        # Generate secure passwords
        print_info "Generating secure passwords..."
        
        DB_PASSWORD=$(generate_password)
        JWT_SECRET=$(generate_password)
        NEXTAUTH_SECRET=$(generate_password)
        PGADMIN_PASSWORD=$(generate_password)
        MINIO_PASSWORD=$(generate_password)
        
        # Update .env file with generated passwords
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
            sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env
            sed -i '' "s/PGADMIN_PASSWORD=.*/PGADMIN_PASSWORD=$PGADMIN_PASSWORD/" .env
            sed -i '' "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$MINIO_PASSWORD/" .env
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost:5432/employee_onboarding|" .env
        else
            # Linux
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
            sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env
            sed -i "s/PGADMIN_PASSWORD=.*/PGADMIN_PASSWORD=$PGADMIN_PASSWORD/" .env
            sed -i "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$MINIO_PASSWORD/" .env
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost:5432/employee_onboarding|" .env
        fi
        
        print_success "Generated and set secure passwords"
    else
        print_error ".env.example file not found"
        exit 1
    fi
else
    print_info ".env file already exists, skipping creation"
fi

# Step 3: Create SSL certificates for development
print_info "Setting up SSL certificates..."

if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=NL/ST=State/L=City/O=Maritime/CN=localhost" \
        >/dev/null 2>&1
    print_success "Generated self-signed SSL certificates"
else
    print_info "SSL certificates already exist, skipping generation"
fi

# Step 4: Build client application
print_info "Building client application..."

if [ ! -d client/build ]; then
    print_info "Installing client dependencies..."
    cd client
    npm install --legacy-peer-deps >/dev/null 2>&1
    
    print_info "Building React application..."
    npm run build >/dev/null 2>&1
    cd ..
    print_success "Client application built successfully"
else
    print_info "Client build already exists, skipping build"
fi

# Step 5: Stop any existing containers
print_info "Cleaning up existing containers..."
docker compose down >/dev/null 2>&1 || true

# Remove conflicting networks if they exist
docker network ls | grep employee-onboarding | awk '{print $2}' | xargs -r docker network rm 2>/dev/null || true

# Step 6: Start Docker services
print_info "Starting Docker services..."

docker compose up -d

# Wait for services to be healthy
print_info "Waiting for services to become healthy..."

# Function to check if service is healthy
check_service() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker ps | grep -q "$service.*healthy"; then
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    return 1
}

# Check critical services
if check_service "employee-onboarding-database"; then
    print_success "Database is healthy"
else
    print_error "Database failed to become healthy"
fi

if check_service "employee-onboarding-backend"; then
    print_success "Backend API is healthy"
else
    print_error "Backend API failed to become healthy"
fi

# Step 7: Verify installation
print_info "Verifying installation..."

# Check API health
if curl -s http://localhost:3000/health | grep -q "ok"; then
    print_success "API is responding"
else
    print_error "API health check failed"
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "301\|200"; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
fi

# Step 8: Display access information
echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
print_success "Maritime Onboarding System is ready!"
echo ""
echo "Access the application at:"
echo "  Main Application:  http://localhost"
echo "  API Health:        http://localhost:3000/health"
echo "  pgAdmin:          http://localhost:5050"
echo "  MinIO Console:    http://localhost:9001"
echo "  MailHog:          http://localhost:8025"
echo ""
echo "Default credentials:"
echo "  pgAdmin Email:    admin@maritime.com"
echo "  MinIO User:       minioadmin"
echo ""
echo "⚠️  IMPORTANT: Change all passwords in production!"
echo ""
echo "To stop the system:  docker compose down"
echo "To view logs:        docker compose logs -f"
echo ""
print_info "First user to register will automatically become admin"