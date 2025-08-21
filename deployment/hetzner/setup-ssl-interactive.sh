#!/bin/bash

# Maritime Onboarding System - Interactive SSL Setup
# Sets up Let's Encrypt SSL certificates with domain validation

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

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Check if running on server
if [ ! -f "/opt/maritime-onboarding/.env" ]; then
    error "This script must be run on the deployed server in /opt/maritime-onboarding/"
fi

cd /opt/maritime-onboarding

# Read domain from environment
DOMAIN=$(grep "DOMAIN=" .env | cut -d'=' -f2)
SSL_EMAIL=$(grep "SSL_EMAIL=" .env | cut -d'=' -f2)

if [ "$DOMAIN" = "your-domain.com" ] || [ -z "$DOMAIN" ]; then
    error "Domain not configured in .env file. Please set DOMAIN and SSL_EMAIL first."
fi

log "🔒 Setting up SSL certificate for: $DOMAIN"
info "Email: $SSL_EMAIL"

# Test domain resolution
log "Testing domain resolution..."
if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
    error "Domain $DOMAIN does not resolve. Please check DNS configuration."
fi

# Get the IP the domain points to
DOMAIN_IP=$(nslookup "$DOMAIN" | grep -A1 "Name:" | tail -1 | awk '{print $2}' | head -1)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    warn "Domain $DOMAIN points to $DOMAIN_IP but server IP is $SERVER_IP"
    warn "SSL certificate may fail if DNS is not properly configured"
    
    echo -n "Continue anyway? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if nginx is running
if ! docker-compose ps nginx | grep -q "Up"; then
    error "Nginx container is not running. Please start the application first."
fi

# Test HTTP access
log "Testing HTTP access..."
if ! curl -f "http://$DOMAIN/.well-known/acme-challenge/test" >/dev/null 2>&1; then
    info "HTTP access test failed (expected for first run)"
fi

# Run certbot
log "Requesting SSL certificate from Let's Encrypt..."
if docker-compose --profile ssl run --rm certbot; then
    success "SSL certificate obtained successfully!"
    
    # Update nginx configuration to use SSL
    log "Updating nginx configuration for SSL..."
    
    # Check if SSL nginx config exists
    if [ ! -f "nginx-ssl.conf" ]; then
        warn "nginx-ssl.conf not found. Creating basic SSL configuration..."
        
        cat > nginx-ssl.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
    }
}
EOF
        
        # Replace domain placeholder
        sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx-ssl.conf
    fi
    
    # Backup current nginx config
    cp nginx.conf nginx.conf.backup
    
    # Use SSL config
    cp nginx-ssl.conf nginx.conf
    
    # Restart nginx with SSL
    log "Restarting nginx with SSL configuration..."
    docker-compose restart nginx
    
    # Test HTTPS
    log "Testing HTTPS access..."
    sleep 5
    
    if curl -f "https://$DOMAIN" >/dev/null 2>&1; then
        success "🎉 SSL certificate is working! Your site is now available at: https://$DOMAIN"
        
        # Set up automatic renewal
        log "Setting up automatic certificate renewal..."
        
        # Create renewal script
        cat > renew-ssl.sh << 'EOF'
#!/bin/bash
cd /opt/maritime-onboarding
docker-compose --profile ssl run --rm certbot renew
docker-compose restart nginx
EOF
        chmod +x renew-ssl.sh
        
        # Add to crontab (run twice daily)
        (crontab -l 2>/dev/null; echo "0 12,0 * * * /opt/maritime-onboarding/renew-ssl.sh >> /var/log/maritime/ssl-renewal.log 2>&1") | crontab -
        
        success "Automatic SSL renewal configured"
        
    else
        error "HTTPS test failed. Please check the configuration."
    fi
    
else
    error "SSL certificate request failed. Please check domain configuration and try again."
fi

echo ""
echo -e "${BLUE}=== 🔒 SSL Setup Complete ===${NC}"
echo -e "${GREEN}Your site is now secured with SSL!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "1. Update APP_URL in .env to use https://$DOMAIN"
echo -e "2. Test your site: https://$DOMAIN"
echo -e "3. SSL certificates will auto-renew every 90 days"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "• Test renewal: ./renew-ssl.sh"
echo -e "• Check certificate: openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -text -noout"
echo -e "• View renewal logs: tail -f /var/log/maritime/ssl-renewal.log"
