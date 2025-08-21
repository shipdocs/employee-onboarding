#!/bin/bash

# Maritime Onboarding System - SSL Setup Script
# Run this after configuring your domain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    error "Please run this script from the /opt/maritime-onboarding directory"
fi

# Check if domain is configured
if ! grep -q "DOMAIN=" .env || grep -q "your-domain.com" .env; then
    error "Please configure your DOMAIN in the .env file first"
fi

# Extract domain from .env
DOMAIN=$(grep "DOMAIN=" .env | cut -d'=' -f2)
SSL_EMAIL=$(grep "SSL_EMAIL=" .env | cut -d'=' -f2)

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
    error "Please set a valid DOMAIN in your .env file"
fi

if [ -z "$SSL_EMAIL" ] || [ "$SSL_EMAIL" = "admin@your-domain.com" ]; then
    error "Please set a valid SSL_EMAIL in your .env file"
fi

log "Setting up SSL for domain: $DOMAIN"

# Test if domain points to this server
log "Checking if domain points to this server..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    warn "Domain $DOMAIN does not point to this server ($SERVER_IP vs $DOMAIN_IP)"
    echo "Please update your DNS settings and try again."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Generate SSL certificate
log "Generating SSL certificate for $DOMAIN..."
docker-compose --profile ssl run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $SSL_EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -ne 0 ]; then
    error "SSL certificate generation failed"
fi

# Update nginx configuration to enable HTTPS
log "Updating nginx configuration for HTTPS..."

# Backup current nginx config
cp deployment/hetzner/nginx.conf deployment/hetzner/nginx.conf.backup

# Enable HTTPS server block
sed -i 's/# server {/server {/g' deployment/hetzner/nginx.conf
sed -i 's/#     listen 443/    listen 443/g' deployment/hetzner/nginx.conf
sed -i 's/#     server_name/    server_name/g' deployment/hetzner/nginx.conf
sed -i 's/#     # SSL/    # SSL/g' deployment/hetzner/nginx.conf
sed -i 's/#     ssl_/    ssl_/g' deployment/hetzner/nginx.conf

# Update domain in SSL certificate paths
sed -i "s/your-domain.com/$DOMAIN/g" deployment/hetzner/nginx.conf

# Enable HTTPS redirect
sed -i 's/proxy_pass http:\/\/maritime_app;/return 301 https:\/\/$host$request_uri;/g' deployment/hetzner/nginx.conf

# Restart nginx to apply SSL configuration
log "Restarting nginx with SSL configuration..."
docker-compose restart nginx

# Wait for nginx to restart
sleep 5

# Test HTTPS
log "Testing HTTPS configuration..."
if curl -f -s https://$DOMAIN/health >/dev/null; then
    log "✅ HTTPS is working correctly!"
else
    warn "HTTPS test failed - check nginx logs: docker-compose logs nginx"
fi

# Set up automatic certificate renewal
log "Setting up automatic certificate renewal..."
cat > /etc/cron.d/maritime-ssl-renewal << EOF
# Maritime Onboarding SSL Certificate Renewal
0 3 * * * root cd /opt/maritime-onboarding && docker-compose --profile ssl run --rm certbot renew --quiet && docker-compose restart nginx
EOF

log "🎉 SSL setup completed successfully!"
echo ""
echo -e "${GREEN}=== 🔒 SSL Configuration Complete ===${NC}"
echo -e "🌍 Your site is now available at: https://$DOMAIN"
echo -e "🔄 Automatic renewal is configured (daily at 3 AM)"
echo -e "📋 Certificate info: docker-compose --profile ssl run --rm certbot certificates"
echo ""
echo -e "${BLUE}=== 📝 Next Steps ===${NC}"
echo -e "1. Update APP_URL in .env to https://$DOMAIN"
echo -e "2. Test your application at https://$DOMAIN"
echo -e "3. Configure email settings if not done already"
echo -e "4. Set up monitoring and backups"
