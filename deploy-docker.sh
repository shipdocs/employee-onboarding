#!/bin/bash
# Deployment script for Employee Onboarding System Docker setup

set -e

echo "🚀 Employee Onboarding System - Docker Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p database/init
mkdir -p uploads
mkdir -p logs

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating environment file..."
    cp .env.docker .env
    print_warning "Please edit .env file with your configuration before running the application"
fi

# Function to deploy
deploy() {
    print_status "Building and starting Docker containers..."
    
    # Build and start services
    docker-compose -f docker-compose.production.yml up --build -d
    
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    print_status "Checking service health..."
    
    # Check database
    if docker-compose -f docker-compose.production.yml exec -T database pg_isready -U postgres -d employee_onboarding; then
        print_success "Database is ready"
    else
        print_error "Database is not ready"
        return 1
    fi
    
    # Check backend
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Backend is ready"
    else
        print_warning "Backend health check failed, but continuing..."
    fi
    
    # Check frontend
    if curl -f http://localhost:80/health &> /dev/null; then
        print_success "Frontend is ready"
    else
        print_warning "Frontend health check failed, but continuing..."
    fi
    
    print_success "Deployment completed!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Main Application: http://localhost:8080"
    echo "   Backend API:      http://localhost:3000"
    echo "   Frontend:         http://localhost:80"
    echo "   Email Testing:    http://localhost:8025"
    echo "   Database Admin:   http://localhost:5050"
    echo ""
    echo "📊 Service Status:"
    docker-compose -f docker-compose.production.yml ps
}

# Function to stop services
stop() {
    print_status "Stopping Docker containers..."
    docker-compose -f docker-compose.production.yml down
    print_success "Services stopped"
}

# Function to restart services
restart() {
    print_status "Restarting Docker containers..."
    docker-compose -f docker-compose.production.yml restart
    print_success "Services restarted"
}

# Function to view logs
logs() {
    print_status "Showing logs..."
    docker-compose -f docker-compose.production.yml logs -f
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and data. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Docker containers and volumes..."
        docker-compose -f docker-compose.production.yml down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Build and start all services (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show logs from all services"
        echo "  cleanup  - Remove all containers and volumes"
        exit 1
        ;;
esac
