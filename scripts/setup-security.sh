#!/bin/bash
# Maritime Onboarding System - Security Setup Script
# Run this script on your server to configure host-level security

set -e

echo "🛡️  Maritime Onboarding System - Security Setup"
echo "================================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Detect OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "❌ Cannot detect OS version"
    exit 1
fi

echo "📋 Detected OS: $OS $VER"

# Update system
echo "🔄 Updating system packages..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt update && apt upgrade -y
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    yum update -y
else
    echo "⚠️  Unsupported OS. Please update manually."
fi

# Install UFW firewall
echo "🔥 Setting up UFW firewall..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt install ufw -y
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    yum install ufw -y
fi

# Configure UFW
echo "⚙️  Configuring firewall rules..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (be careful not to lock yourself out!)
echo "🔑 Allowing SSH access..."
read -p "Enter SSH port (default 22): " ssh_port
ssh_port=${ssh_port:-22}
ufw allow $ssh_port/tcp

# Allow HTTP and HTTPS
echo "🌐 Allowing web traffic..."
ufw allow 80/tcp
ufw allow 443/tcp

# Block Docker daemon ports
echo "🐳 Blocking Docker daemon ports..."
ufw deny 2375/tcp
ufw deny 2376/tcp

# Block common database ports
echo "🗄️  Blocking database ports..."
ufw deny 5432/tcp  # PostgreSQL
ufw deny 3306/tcp  # MySQL
ufw deny 6379/tcp  # Redis
ufw deny 27017/tcp # MongoDB

# Enable UFW
echo "✅ Enabling firewall..."
ufw --force enable

# Install and configure Fail2Ban
echo "🚫 Setting up Fail2Ban..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt install fail2ban -y
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    yum install fail2ban -y
fi

# Configure Fail2Ban for SSH
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
EOF

# Create nginx filters for Fail2Ban
mkdir -p /etc/fail2ban/filter.d

cat > /etc/fail2ban/filter.d/nginx-http-auth.conf << 'EOF'
[Definition]
failregex = ^ \[error\] \d+#\d+: \*\d+ user "\S+":? (password mismatch|was not found), client: <HOST>, server: \S+, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"$
            ^ \[error\] \d+#\d+: \*\d+ no user/password was provided for basic authentication, client: <HOST>, server: \S+, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"$
ignoreregex =
EOF

cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess: \S+ by zone "\S+", client: <HOST>
ignoreregex =
EOF

# Start and enable Fail2Ban
systemctl enable fail2ban
systemctl start fail2ban

# Configure Docker security
echo "🐳 Configuring Docker security..."
mkdir -p /etc/docker

cat > /etc/docker/daemon.json << 'EOF'
{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "seccomp-profile": "/etc/docker/seccomp.json",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker if it's running
if systemctl is-active --quiet docker; then
    echo "🔄 Restarting Docker with new security settings..."
    systemctl restart docker
fi

# Set up log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/maritime-onboarding << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}

/var/log/maritime-onboarding/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

# Create secrets directory
echo "🔐 Setting up secrets directory..."
mkdir -p /opt/maritime-onboarding/secrets
chmod 700 /opt/maritime-onboarding/secrets

# Generate random secrets if they don't exist
if [[ ! -f /opt/maritime-onboarding/secrets/db_password.txt ]]; then
    echo "🎲 Generating database password..."
    openssl rand -base64 32 > /opt/maritime-onboarding/secrets/db_password.txt
fi

if [[ ! -f /opt/maritime-onboarding/secrets/jwt_secret.txt ]]; then
    echo "🎲 Generating JWT secret..."
    openssl rand -base64 64 > /opt/maritime-onboarding/secrets/jwt_secret.txt
fi

if [[ ! -f /opt/maritime-onboarding/secrets/minio_secret.txt ]]; then
    echo "🎲 Generating MinIO secret..."
    openssl rand -base64 32 > /opt/maritime-onboarding/secrets/minio_secret.txt
fi

chmod 600 /opt/maritime-onboarding/secrets/*

# Set up monitoring script
echo "📊 Setting up monitoring script..."
cat > /usr/local/bin/maritime-security-check.sh << 'EOF'
#!/bin/bash
# Maritime Onboarding System - Security Monitoring

echo "🛡️  Maritime Security Status Check - $(date)"
echo "=============================================="

# Check firewall status
echo "🔥 Firewall Status:"
ufw status numbered

# Check Fail2Ban status
echo -e "\n🚫 Fail2Ban Status:"
fail2ban-client status

# Check Docker security
echo -e "\n🐳 Docker Security:"
if systemctl is-active --quiet docker; then
    echo "✅ Docker is running"
    docker system df
else
    echo "❌ Docker is not running"
fi

# Check for failed login attempts
echo -e "\n🔑 Recent Failed Logins:"
grep "Failed password" /var/log/auth.log | tail -5 || echo "No recent failed logins"

# Check disk space
echo -e "\n💾 Disk Usage:"
df -h | grep -E "/$|/var|/opt"

# Check memory usage
echo -e "\n🧠 Memory Usage:"
free -h

# Check for security updates
echo -e "\n🔄 Security Updates:"
if command -v apt &> /dev/null; then
    apt list --upgradable 2>/dev/null | grep -i security | wc -l | xargs echo "Available security updates:"
fi

echo -e "\n✅ Security check completed"
EOF

chmod +x /usr/local/bin/maritime-security-check.sh

# Set up daily security check cron job
echo "⏰ Setting up daily security monitoring..."
(crontab -l 2>/dev/null; echo "0 6 * * * /usr/local/bin/maritime-security-check.sh >> /var/log/maritime-security.log 2>&1") | crontab -

# Final status
echo ""
echo "✅ Security setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - UFW firewall configured and enabled"
echo "  - Fail2Ban installed and configured"
echo "  - Docker security settings applied"
echo "  - Log rotation configured"
echo "  - Secrets generated in /opt/maritime-onboarding/secrets/"
echo "  - Daily security monitoring scheduled"
echo ""
echo "🔍 To check security status: /usr/local/bin/maritime-security-check.sh"
echo "📊 To view firewall rules: sudo ufw status numbered"
echo "🚫 To check Fail2Ban: sudo fail2ban-client status"
echo ""
echo "⚠️  IMPORTANT: Make sure to:"
echo "  1. Test SSH access before disconnecting"
echo "  2. Configure SSL certificates for HTTPS"
echo "  3. Update the secrets in /opt/maritime-onboarding/secrets/"
echo "  4. Review and customize firewall rules as needed"
echo ""
echo "🎯 Next steps: Deploy the application with docker-compose.security.yml"
