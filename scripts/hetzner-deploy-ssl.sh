#!/bin/bash

# 🔒 Maritime Onboarding - SSL Certificate Setup for Hetzner
# Handles automated Let's Encrypt certificate generation and nginx configuration

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

# Load configuration from previous setup
load_config() {
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        log_error "Environment file not found. Run hetzner-deploy.sh first."
        exit 1
    fi
    
    cd "$INSTALL_DIR"
    
    # Extract domain from BASE_URL
    DOMAIN_NAME=$(grep "BASE_URL=" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||')
    
    if [[ -z "$DOMAIN_NAME" ]]; then
        log_error "Domain name not found in .env file"
        exit 1
    fi
    
    log_info "Configuring SSL for domain: $DOMAIN_NAME"
}

# Configure nginx for Let's Encrypt challenge
configure_nginx_for_letsencrypt() {
    log_info "🔧 Configuring nginx for Let's Encrypt..."
    
    # Create letsencrypt directory
    mkdir -p nginx/letsencrypt
    
    # Backup original nginx config
    cp nginx/nginx.conf nginx/nginx.conf.backup
    
    # Update nginx configuration to include Let's Encrypt challenge location
    # This adds the /.well-known/acme-challenge/ location before the main location block
    sed -i '/location \/ {/i\        # Let'\''s Encrypt challenge\n        location /.well-known/acme-challenge/ {\n            root /var/www/letsencrypt;\n        }\n' nginx/nginx.conf
    
    # Update docker-compose.yml to mount letsencrypt directory
    if ! grep -q "letsencrypt" docker-compose.yml; then
        # Add letsencrypt volume mount to frontend service
        sed -i '/- .\/nginx\/ssl:\/etc\/nginx\/ssl:ro/a\      - ./nginx/letsencrypt:/var/www/letsencrypt:ro' docker-compose.yml
    fi
    
    log_success "Nginx configured for Let's Encrypt"
}

# Generate SSL certificates
generate_ssl_certificates() {
    log_info "🔒 Generating SSL certificates..."
    
    # Start frontend temporarily for certificate generation
    docker-compose up -d frontend
    sleep 10
    
    # Generate certificate using webroot method
    certbot certonly \
        --webroot \
        -w "$INSTALL_DIR/nginx/letsencrypt" \
        -d "$DOMAIN_NAME" \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --non-interactive \
        --expand
    
    if [ $? -eq 0 ]; then
        log_success "SSL certificates generated successfully"
    else
        log_error "Failed to generate SSL certificates"
        log_info "Make sure:"
        log_info "1. DNS is pointing $DOMAIN_NAME to this server"
        log_info "2. Port 80 is accessible from the internet"
        log_info "3. No firewall is blocking the domain"
        exit 1
    fi
}

# Copy certificates to nginx directory
copy_certificates() {
    log_info "📋 Copying certificates to nginx directory..."
    
    # Copy Let's Encrypt certificates to nginx ssl directory
    cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" nginx/ssl/cert.pem
    cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" nginx/ssl/key.pem
    
    # Set proper permissions
    chmod 644 nginx/ssl/cert.pem
    chmod 600 nginx/ssl/key.pem
    
    log_success "Certificates copied successfully"
}

# Update nginx configuration for production
update_nginx_config() {
    log_info "⚙️ Updating nginx configuration for production..."
    
    # Update Content Security Policy to allow Google Fonts and Cloudflare
    sed -i 's|style-src '\''self'\'' '\''unsafe-inline'\'';|style-src '\''self'\'' '\''unsafe-inline'\'' https://fonts.googleapis.com;|g' nginx/nginx.conf
    sed -i 's|font-src '\''self'\'';|font-src '\''self'\'' https://fonts.gstatic.com;|g' nginx/nginx.conf
    sed -i 's|script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\'';|script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\'' https://static.cloudflareinsights.com;|g' nginx/nginx.conf
    
    # Ensure API proxy configuration is correct
    sed -i 's|location /api/ {|location /api {|g' nginx/nginx.conf
    sed -i 's|proxy_pass http://backend:3000/api/;|proxy_pass http://backend:3000;|g' nginx/nginx.conf
    
    log_success "Nginx configuration updated for production"
}

# Create SSL renewal script
create_renewal_script() {
    log_info "🔄 Creating SSL renewal script..."
    
    cat > renew-ssl.sh << 'EOF'
#!/bin/bash
# Automated SSL certificate renewal script

cd /opt/maritime-onboarding

# Renew certificates
certbot renew --webroot -w /opt/maritime-onboarding/nginx/letsencrypt --quiet

# Copy renewed certificates to nginx directory
if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" nginx/ssl/cert.pem
    cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" nginx/ssl/key.pem
    
    # Restart frontend to reload certificates
    docker-compose restart frontend
    
    echo "SSL certificates renewed and frontend restarted"
fi
EOF
    
    chmod +x renew-ssl.sh
    
    # Set up cron job for automatic renewal
    (crontab -l 2>/dev/null; echo "0 2 * * 0 $INSTALL_DIR/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -
    
    log_success "SSL renewal script created and scheduled"
}

# Validate SSL setup
validate_ssl() {
    log_info "✅ Validating SSL setup..."
    
    # Restart frontend with new configuration
    docker-compose restart frontend
    sleep 10
    
    # Test HTTPS connection
    if curl -f -s "https://$DOMAIN_NAME/health" > /dev/null; then
        log_success "HTTPS is working correctly"
    else
        log_warning "HTTPS validation failed - this might be normal if DNS is not yet propagated"
    fi
    
    # Check certificate validity
    if openssl x509 -in nginx/ssl/cert.pem -text -noout | grep -q "$DOMAIN_NAME"; then
        log_success "SSL certificate is valid for $DOMAIN_NAME"
    else
        log_warning "SSL certificate validation failed"
    fi
}

# Main SSL setup function
main() {
    echo -e "${BLUE}🔒 Maritime Onboarding - SSL Setup${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    # Get SSL email if not provided
    if [[ -z "$SSL_EMAIL" ]]; then
        read -p "Enter email for Let's Encrypt certificates: " SSL_EMAIL
        if [[ -z "$SSL_EMAIL" ]]; then
            log_error "Email is required for Let's Encrypt"
            exit 1
        fi
    fi
    
    load_config
    configure_nginx_for_letsencrypt
    generate_ssl_certificates
    copy_certificates
    update_nginx_config
    create_renewal_script
    validate_ssl
    
    log_success "🎉 SSL setup completed!"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Run: ./scripts/hetzner-deploy-services.sh (to start all services)"
    echo "2. Your site should be accessible at: https://$DOMAIN_NAME"
    echo "3. SSL certificates will auto-renew every Sunday at 2 AM"
    echo ""
}

# Run main function
main "$@"
