---
layout: page
title: Documentation
description: Complete documentation for Maritime Employee Onboarding System
permalink: /documentation/
---

# 📚 Documentation

Welcome to the comprehensive documentation for the Maritime Employee Onboarding System. This guide covers everything from initial setup to advanced configuration.

---

## 📖 Documentation Sections

### Getting Started
- [Quick Start Guide]({{ site.baseurl }}/quickstart) - Get up and running in 5 minutes
- [Installation Guide]({{ site.baseurl }}/installation) - Detailed installation instructions
- [First Steps]({{ site.baseurl }}/first-steps) - Initial configuration and setup

### User Guides
- [Administrator Guide](#administrator-guide) - System administration and configuration
- [Manager Guide](#manager-guide) - Managing crew and workflows
- [Crew Guide](#crew-guide) - Completing onboarding as a crew member

### Technical Documentation
- [API Reference]({{ site.baseurl }}/api) - REST API documentation
- [Database Schema](#database-schema) - Database structure and relationships
- [Security Guide]({{ site.baseurl }}/security) - Security best practices

### Deployment & Operations
- [Deployment Options](#deployment-options) - Various deployment strategies
- [Backup & Recovery](#backup-recovery) - Data protection procedures
- [Monitoring & Logging](#monitoring-logging) - System monitoring setup

---

## 👨‍💼 Administrator Guide

### System Setup

#### Initial Configuration
1. **Access Admin Panel**: Log in with admin credentials
2. **Company Settings**: Configure company details and branding
3. **Email Configuration**: Set up SMTP settings for notifications
4. **Storage Setup**: Configure MinIO or S3 storage

#### User Management
```markdown
1. Navigate to Users → Add User
2. Fill in user details:
   - Personal information
   - Role assignment
   - Department/Vessel
3. Send invitation email
4. Monitor activation status
```

#### Workflow Creation
1. Go to Workflows → Create New
2. Define workflow phases
3. Add training modules per phase
4. Set completion requirements
5. Configure notifications
6. Activate workflow

### System Administration

#### Backup Procedures
```bash
# Database backup
docker exec employee-onboarding-database \
  pg_dump -U postgres employee_onboarding > backup_$(date +%Y%m%d).sql

# File storage backup
docker run --rm \
  -v employee-onboarding_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/files_$(date +%Y%m%d).tar.gz /data
```

#### User Bulk Import
```csv
email,first_name,last_name,role,department,vessel
john.doe@ship.com,John,Doe,crew,Deck,MV Marina
jane.smith@ship.com,Jane,Smith,manager,Engineering,MV Marina
```

---

## 👥 Manager Guide

### Managing Crew Members

#### Adding New Crew
1. Click "Add Crew Member"
2. Enter crew details
3. Assign to workflow
4. Set deadlines
5. Send onboarding invitation

#### Monitoring Progress
- **Dashboard View**: Real-time progress overview
- **Individual Reports**: Detailed crew member progress
- **Department Analytics**: Team-wide statistics
- **Notifications**: Automatic alerts for important events

#### Document Verification
1. Access pending documents
2. Review uploaded files
3. Verify authenticity
4. Approve or request resubmission
5. Add comments if needed

### Workflow Management

#### Assigning Workflows
```markdown
1. Select crew member(s)
2. Choose appropriate workflow
3. Set start date
4. Configure deadlines
5. Add custom requirements
6. Initiate onboarding
```

#### Progress Tracking
- View completion percentages
- Monitor phase status
- Check training scores
- Review time spent
- Export progress reports

---

## ⚓ Crew Guide

### Getting Started

#### Account Activation
1. Check email for invitation
2. Click activation link
3. Set secure password
4. Complete profile information
5. Begin onboarding process

#### Navigation
- **Dashboard**: Overview of your progress
- **My Tasks**: Current pending items
- **Documents**: Upload required documents
- **Training**: Access training modules
- **Certificates**: View earned certificates

### Completing Onboarding

#### Document Submission
1. Go to Documents section
2. Select document type
3. Upload file (PDF, JPG, PNG)
4. Add any required information
5. Submit for verification

#### Training Modules
1. Access assigned training
2. Complete video/reading materials
3. Take notes if needed
4. Complete quiz when ready
5. Review results

#### Quizzes & Assessments
- Read questions carefully
- Select best answer
- Review before submission
- Check results immediately
- Retry if necessary (within attempts limit)

---

## 🗄️ Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    -- Additional fields
);
```

#### Workflows Table
```sql
CREATE TABLE onboarding_workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    phases JSONB,
    is_active BOOLEAN,
    -- Additional fields
);
```

#### Key Relationships
- Users → Crew Onboarding (1:N)
- Workflows → Crew Onboarding (1:N)
- Training Modules → Training Progress (1:N)
- Users → Documents (1:N)
- Users → Certificates (1:N)

---

## 🚀 Deployment Options

### Docker Deployment (Recommended)
```bash
# Quick deployment
./setup.sh

# Manual deployment
docker compose up -d
```

### Cloud Deployment

#### AWS Deployment
1. Launch EC2 instance (t3.large minimum)
2. Install Docker and Docker Compose
3. Clone repository
4. Configure environment variables
5. Run setup script
6. Configure security groups

#### Azure Deployment
1. Create VM or use Container Instances
2. Set up managed PostgreSQL
3. Configure blob storage
4. Deploy application containers
5. Set up Application Gateway

### Kubernetes Deployment
```yaml
# Sample deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maritime-onboarding
spec:
  replicas: 3
  selector:
    matchLabels:
      app: maritime-onboarding
  template:
    spec:
      containers:
      - name: backend
        image: maritime-onboarding-backend
        ports:
        - containerPort: 3000
```

---

## 💾 Backup & Recovery

### Automated Backups

#### Database Backup Script
```bash
#!/bin/bash
# Run daily via cron
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec employee-onboarding-database \
  pg_dump -U postgres employee_onboarding > \
  $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

#### Recovery Procedure
```bash
# Restore database
gunzip < backup.sql.gz | docker exec -i employee-onboarding-database \
  psql -U postgres employee_onboarding

# Restore files
docker run --rm \
  -v employee-onboarding_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/files_backup.tar.gz -C /
```

---

## 📊 Monitoring & Logging

### Health Checks
```bash
# API health
curl http://localhost:3000/health

# Service status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Resource usage
docker stats
```

### Log Management
```bash
# View all logs
docker compose logs -f

# Specific service logs
docker logs employee-onboarding-backend -f

# Export logs
docker logs employee-onboarding-backend > backend.log
```

### Monitoring Stack (Optional)
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Loki**: Log aggregation
- **AlertManager**: Alert routing

---

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker logs [container-name]

# Verify environment variables
docker exec [container-name] env

# Restart service
docker compose restart [service-name]
```

#### Database Connection Issues
```bash
# Test connection
docker exec employee-onboarding-backend \
  pg_isready -h database -U postgres

# Check database logs
docker logs employee-onboarding-database
```

#### Storage Issues
```bash
# Check MinIO status
docker logs employee-onboarding-minio

# Verify buckets
docker exec employee-onboarding-minio \
  mc ls minio/
```

---

## 📚 Additional Resources

- [GitHub Repository](https://github.com/shipdocs/employee-onboarding)
- [Issue Tracker](https://github.com/shipdocs/employee-onboarding/issues)
- [Discussions](https://github.com/shipdocs/employee-onboarding/discussions)
- [Contributing Guide]({{ site.baseurl }}/contributing)
- [Security Policy]({{ site.baseurl }}/security)

---

## 🆘 Getting Help

Need assistance? Here are your options:

1. **Documentation**: Check this guide first
2. **GitHub Issues**: Report bugs or request features
3. **Discussions**: Ask questions and share experiences
4. **Email Support**: support@shipdocs.app

---

*Last updated: {{ site.time | date: '%B %d, %Y' }}*