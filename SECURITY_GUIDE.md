# 🛡️ Security Implementation Guide - Maritime Onboarding System

**Complete security setup for production deployment**

---

## ✅ **Wat is geïmplementeerd**

### **1. Container Security (docker-compose.security.yml)**
```bash
# Gebruik de security-hardened configuratie
docker compose -f docker-compose.yml -f docker-compose.security.yml up -d
```

**Features:**
- ✅ **Network isolation**: Backend services in internal network
- ✅ **No direct port exposure**: Alleen nginx proxy exposed
- ✅ **Read-only containers**: Containers kunnen niet worden gemodificeerd
- ✅ **Non-root users**: Containers draaien als non-privileged users
- ✅ **Resource limits**: CPU en memory limits per container
- ✅ **Security options**: no-new-privileges, tmpfs voor temp files

### **2. Nginx Security (nginx-security.conf)**
```bash
# Vervang de standaard nginx configuratie
cp nginx/nginx-security.conf nginx/nginx.conf
```

**Features:**
- ✅ **Rate limiting**: Login (1/s), API (10/s), General (5/s)
- ✅ **Security headers**: XSS, CSRF, Content-Type protection
- ✅ **Attack pattern blocking**: SQL injection, path traversal
- ✅ **User agent filtering**: Block known attack tools
- ✅ **Connection limiting**: Max connections per IP
- ✅ **Static file caching**: Performance optimization

### **3. Host Security Script (scripts/setup-security.sh)**
```bash
# Run op je server (als root)
sudo ./scripts/setup-security.sh
```

**Features:**
- ✅ **UFW Firewall**: Alleen poort 22, 80, 443 open
- ✅ **Fail2Ban**: Automatische IP blocking bij attacks
- ✅ **Docker security**: Hardened daemon configuration
- ✅ **Log rotation**: Automatische log cleanup
- ✅ **Secret generation**: Random passwords en keys
- ✅ **Monitoring**: Daily security status checks

---

## ⚠️ **Wat nog handmatig moet**

### **1. SSL/TLS Certificaten**

#### **Let's Encrypt (Gratis)**
```bash
# Installeer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Verkrijg certificaat
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

#### **Commercial Certificate**
```bash
# Upload je certificaten naar
mkdir -p nginx/ssl
# Plaats bestanden:
# - nginx/ssl/certificate.crt
# - nginx/ssl/private.key
# - nginx/ssl/ca-bundle.crt (optioneel)
```

#### **Update Nginx voor HTTPS**
```nginx
# Voeg toe aan nginx/nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Rest van configuratie...
}

# HTTP redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### **2. Database Security**

#### **PostgreSQL Hardening**
```bash
# Connect to database
docker exec -it maritime_database psql -U postgres

-- Create dedicated application user
CREATE USER maritime_app WITH PASSWORD 'strong_random_password';
GRANT CONNECT ON DATABASE postgres TO maritime_app;
GRANT USAGE ON SCHEMA public TO maritime_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maritime_app;

-- Remove default postgres user access (in production)
-- REVOKE ALL ON DATABASE postgres FROM postgres;
```

#### **Update .env voor production**
```bash
# Database
DB_USER=maritime_app
DB_PASSWORD=your_strong_password_here
DB_HOST=database
DB_PORT=5432
DB_NAME=postgres

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=your_jwt_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# MinIO
MINIO_ROOT_USER=maritime_admin
MINIO_ROOT_PASSWORD=your_minio_password_here

# Email (configure for production)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your_email_password
```

### **3. Backup Strategy**

#### **Database Backups**
```bash
# Create backup script
cat > /usr/local/bin/maritime-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/maritime-backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker exec maritime_database pg_dump -U postgres postgres > $BACKUP_DIR/db_backup_$DATE.sql

# Compress and encrypt
gzip $BACKUP_DIR/db_backup_$DATE.sql
gpg --symmetric --cipher-algo AES256 $BACKUP_DIR/db_backup_$DATE.sql.gz

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gpg" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz.gpg"
EOF

chmod +x /usr/local/bin/maritime-backup.sh

# Schedule daily backups
(crontab -l; echo "0 2 * * * /usr/local/bin/maritime-backup.sh") | crontab -
```

#### **File Storage Backups**
```bash
# MinIO data backup
docker run --rm -v maritime_minio_data:/data -v /opt/maritime-backups:/backup alpine tar czf /backup/minio_backup_$(date +%Y%m%d).tar.gz /data
```

### **4. Monitoring & Alerting**

#### **Log Monitoring**
```bash
# Install log monitoring
sudo apt install logwatch -y

# Configure email alerts
echo "your-email@domain.com" > /etc/logwatch/conf/logwatch.conf
```

#### **Uptime Monitoring**
```bash
# External monitoring services (choose one):
# - UptimeRobot (gratis)
# - Pingdom
# - StatusCake
# - New Relic

# Internal monitoring
cat > /usr/local/bin/maritime-health-check.sh << 'EOF'
#!/bin/bash
# Check if application is responding
if ! curl -f http://localhost/nginx-health > /dev/null 2>&1; then
    echo "ALERT: Maritime application is down!" | mail -s "Maritime Alert" your-email@domain.com
fi
EOF

chmod +x /usr/local/bin/maritime-health-check.sh
(crontab -l; echo "*/5 * * * * /usr/local/bin/maritime-health-check.sh") | crontab -
```

### **5. Access Control**

#### **IP Whitelisting voor Admin**
```nginx
# In nginx/nginx.conf, voeg toe aan admin locations:
location /api/admin/ {
    # Allow specific IPs
    allow 192.168.1.0/24;  # Office network
    allow 10.0.0.0/8;      # VPN network
    deny all;
    
    # Rest van configuratie...
}
```

#### **VPN Setup (Optioneel)**
```bash
# WireGuard VPN voor secure admin access
sudo apt install wireguard -y

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure VPN server
# (Detailed VPN setup beyond scope - see WireGuard documentation)
```

---

## 🔍 **Security Checklist**

### **Pre-Deployment**
- [ ] Run security setup script: `sudo ./scripts/setup-security.sh`
- [ ] Generate strong passwords for all services
- [ ] Configure SSL certificates
- [ ] Update .env with production values
- [ ] Test firewall rules
- [ ] Configure email notifications

### **Post-Deployment**
- [ ] Verify all services are running: `docker ps`
- [ ] Test application functionality
- [ ] Check security headers: `curl -I https://your-domain.com`
- [ ] Verify rate limiting works
- [ ] Test backup procedures
- [ ] Set up monitoring alerts

### **Ongoing Maintenance**
- [ ] Weekly security updates: `sudo apt update && sudo apt upgrade`
- [ ] Monthly backup verification
- [ ] Quarterly security audit
- [ ] Review access logs monthly
- [ ] Update SSL certificates before expiry

---

## 🚨 **Incident Response**

### **If Compromised**
1. **Immediate**: Block suspicious IPs with `sudo ufw deny from <IP>`
2. **Isolate**: Stop affected containers: `docker stop <container>`
3. **Investigate**: Check logs: `docker logs <container>`
4. **Restore**: From clean backup if needed
5. **Update**: Change all passwords and secrets

### **Emergency Contacts**
```bash
# Create incident response plan
cat > /opt/maritime-onboarding/incident-response.md << 'EOF'
# Maritime Onboarding - Incident Response

## Emergency Contacts
- System Admin: your-admin@domain.com
- Security Team: security@domain.com
- Hosting Provider: support@your-host.com

## Critical Commands
- Stop all services: docker compose down
- Block IP: sudo ufw deny from <IP>
- Check logs: docker logs maritime_backend
- Restore backup: ./restore-backup.sh

## Recovery Steps
1. Assess damage
2. Isolate affected systems
3. Restore from backup
4. Update security measures
5. Document incident
EOF
```

---

## 📊 **Security Metrics**

### **Monitor These KPIs**
- **Failed login attempts**: < 10/day
- **Blocked IPs**: Track via Fail2Ban
- **Response time**: < 200ms average
- **Uptime**: > 99.9%
- **SSL certificate expiry**: > 30 days remaining

### **Weekly Security Report**
```bash
# Generate weekly report
/usr/local/bin/maritime-security-check.sh > /tmp/security-report.txt
mail -s "Weekly Security Report" your-email@domain.com < /tmp/security-report.txt
```

---

## 🎯 **Conclusie**

**Geïmplementeerde security:**
- ✅ Container isolation en hardening
- ✅ Network security met rate limiting
- ✅ Host-level firewall en intrusion detection
- ✅ Automated monitoring en alerting

**Handmatige configuratie vereist:**
- ⚠️ SSL certificaten
- ⚠️ Production database credentials
- ⚠️ Email/SMTP configuratie
- ⚠️ Backup en monitoring setup

**Met deze implementatie heb je een production-ready, secure deployment van het Maritime Onboarding System! 🚢🛡️**
