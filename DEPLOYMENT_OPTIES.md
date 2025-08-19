# 🚀 Deployment Opties - Maritime Onboarding System

**Realistische opties voor het draaien van het Maritime Onboarding System**

---

## 🎯 **Deployment Scenario's**

### **1. 🧪 Development & Testing**
**Voor**: Developers, lokale testing, demo's
**Platform**: Docker Desktop (Windows/Mac) of Docker Engine (Linux)
**Kosten**: Gratis
**Tijd**: 10-15 minuten

### **2. 🏢 Kleine Organisatie (1-50 gebruikers)**
**Voor**: Kleine rederijen, training centers
**Platform**: VPS/Cloud server
**Kosten**: €10-50/maand
**Tijd**: 1-2 uur setup

### **3. 🏭 Middelgrote Organisatie (50-500 gebruikers)**
**Voor**: Middelgrote rederijen, maritime academies
**Platform**: Managed cloud services
**Kosten**: €100-500/maand
**Tijd**: 1 dag setup + configuratie

### **4. 🌐 Enterprise (500+ gebruikers)**
**Voor**: Grote rederijen, internationale organisaties
**Platform**: Kubernetes cluster, multi-region
**Kosten**: €1000+/maand
**Tijd**: 1-2 weken setup

---

## 🧪 **Optie 1: Development & Testing**

### **Docker Desktop (Alleen voor Development!)**
```bash
# Clone repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Start services
docker compose up -d

# Access application
open http://localhost
```

**⚠️ Waarschuwing**: Docker Desktop is NIET voor productie gebruik!

---

## 🏢 **Optie 2: VPS/Cloud Server (Aanbevolen voor meeste gebruikers)**

### **Providers & Kosten**
| Provider | Specs | Prijs/maand | Geschikt voor |
|----------|-------|-------------|---------------|
| **DigitalOcean** | 2 CPU, 4GB RAM | €24 | 50-100 gebruikers |
| **Hetzner Cloud** | 2 CPU, 4GB RAM | €8 | 20-50 gebruikers |
| **Linode** | 2 CPU, 4GB RAM | €20 | 50-100 gebruikers |
| **Vultr** | 2 CPU, 4GB RAM | €16 | 50-100 gebruikers |

### **Setup Stappen**

#### **1. Server Aanmaken**
```bash
# Kies Ubuntu 22.04 LTS
# Minimaal: 2 CPU, 4GB RAM, 50GB SSD
# Aanbevolen: 4 CPU, 8GB RAM, 100GB SSD
```

#### **2. Server Configureren**
```bash
# SSH naar je server
ssh root@your-server-ip

# Update systeem
apt update && apt upgrade -y

# Installeer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installeer Docker Compose
apt install docker-compose-plugin -y

# Maak non-root user (optioneel maar aanbevolen)
adduser maritime
usermod -aG docker maritime
```

#### **3. Applicatie Deployen**
```bash
# Als maritime user
su - maritime

# Clone repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Setup environment voor productie
cp .env.example .env
nano .env  # Configureer productie settings

# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### **4. Reverse Proxy & SSL**
```bash
# Installeer Nginx
apt install nginx certbot python3-certbot-nginx -y

# Configureer Nginx
cat > /etc/nginx/sites-available/maritime << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/maritime /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Setup SSL
certbot --nginx -d your-domain.com
```

---

## 🏭 **Optie 3: Managed Cloud Services**

### **Platform-as-a-Service Opties**

#### **Railway** (Eenvoudigste)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login en deploy
railway login
railway init
railway up
```
**Kosten**: €5-50/maand afhankelijk van gebruik

#### **DigitalOcean App Platform**
```yaml
# app.yaml
name: maritime-onboarding
services:
- name: web
  source_dir: /
  github:
    repo: your-username/employee-onboarding
    branch: main
  run_command: docker compose up
  environment_slug: docker
  instance_count: 1
  instance_size_slug: basic-xxs
```
**Kosten**: €12-100/maand

#### **AWS ECS Fargate**
```bash
# Gebruik AWS CLI en ECS
aws ecs create-cluster --cluster-name maritime-cluster
# ... meer AWS configuratie
```
**Kosten**: €50-500/maand

---

## 🌐 **Optie 4: Enterprise Kubernetes**

### **Managed Kubernetes Services**
- **Google GKE**: €100-1000/maand
- **AWS EKS**: €150-1500/maand  
- **Azure AKS**: €100-1000/maand
- **DigitalOcean Kubernetes**: €50-500/maand

### **Helm Chart Deployment**
```bash
# Add helm repository
helm repo add maritime https://charts.maritime-onboarding.com

# Install with custom values
helm install maritime-prod maritime/onboarding-system \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=maritime.company.com \
  --set postgresql.enabled=true \
  --set redis.enabled=true
```

---

## 📊 **Vergelijking Deployment Opties**

| Optie | Setup Tijd | Maandelijkse Kosten | Onderhoud | Schaalbaarheid | Geschikt voor |
|-------|------------|-------------------|-----------|----------------|---------------|
| **Docker Desktop** | 15 min | €0 | Geen | Geen | Development |
| **VPS Server** | 2 uur | €10-50 | Laag | Beperkt | Kleine org |
| **PaaS (Railway)** | 30 min | €20-100 | Geen | Goed | Middelgroot |
| **Cloud Managed** | 1 dag | €100-500 | Laag | Uitstekend | Enterprise |
| **Kubernetes** | 1 week | €500+ | Hoog | Onbeperkt | Grote org |

---

## 🎯 **Aanbevelingen per Organisatie**

### **Startup/Klein Bedrijf (1-20 gebruikers)**
**Aanbeveling**: Hetzner Cloud VPS (€8/maand)
- 2 CPU, 4GB RAM, 40GB SSD
- Ubuntu 22.04 + Docker
- Nginx reverse proxy + Let's Encrypt SSL
- **Total cost**: €8-15/maand

### **Middelgroot Bedrijf (20-200 gebruikers)**
**Aanbeveling**: DigitalOcean Droplet (€24/maand) + App Platform
- 4 CPU, 8GB RAM, 160GB SSD
- Managed database add-on
- Automated backups
- **Total cost**: €50-100/maand

### **Enterprise (200+ gebruikers)**
**Aanbeveling**: AWS/GCP/Azure managed services
- Auto-scaling
- Multi-region deployment
- Managed databases
- Professional support
- **Total cost**: €500-2000/maand

---

## 🔧 **Productie Configuratie Checklist**

### **Beveiliging**
- [ ] SSL certificaten (Let's Encrypt of commercial)
- [ ] Firewall configuratie (alleen poort 80/443 open)
- [ ] Strong passwords in .env file
- [ ] Database backup strategie
- [ ] Regular security updates

### **Performance**
- [ ] Database connection pooling
- [ ] Redis caching enabled
- [ ] CDN voor static assets (optioneel)
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Log aggregation

### **Backup & Recovery**
- [ ] Daily database backups
- [ ] File storage backups
- [ ] Disaster recovery plan
- [ ] Backup restoration testing

---

## 💡 **Praktische Tips**

### **Voor Beginners**
1. **Start met VPS**: Hetzner Cloud of DigitalOcean
2. **Gebruik managed database**: Minder onderhoud
3. **Setup monitoring**: Uptime Robot (gratis)
4. **Automatiseer backups**: Cron jobs of cloud backups

### **Voor Gevorderden**
1. **Infrastructure as Code**: Terraform/Ansible
2. **CI/CD Pipeline**: GitHub Actions
3. **Container Registry**: Private Docker registry
4. **Secrets Management**: HashiCorp Vault

### **Voor Enterprise**
1. **Multi-region deployment**: High availability
2. **Load balancing**: HAProxy/AWS ALB
3. **Database clustering**: PostgreSQL HA
4. **Professional support**: 24/7 monitoring

---

## 🆘 **Hulp & Support**

### **Community Support**
- **GitHub Issues**: Gratis community support
- **Discord/Slack**: Real-time chat support
- **Documentation**: Uitgebreide guides

### **Professional Support**
- **Deployment Service**: €500-2000 eenmalig
- **Managed Hosting**: €200-1000/maand
- **Custom Development**: €100-200/uur
- **Training & Consultancy**: €150/uur

---

**🎯 Conclusie: Docker Desktop is alleen voor development. Voor echte gebruikers: start met een VPS server!**
