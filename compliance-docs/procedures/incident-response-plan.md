# 🚨 Incident Response Plan

**Version**: 1.0  
**Last Updated**: January 2025  
**Classification**: Public  
**Compliance**: NIS2 Art. 23, ISO 27001 A.16

## 1. Purpose & Scope

This Incident Response Plan (IRP) defines procedures for detecting, responding to, and recovering from security incidents affecting the Maritime Onboarding Platform.

### Scope
- All production systems
- Customer data
- Source code and intellectual property
- Third-party integrations

## 2. Incident Classification

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Service down, data breach, active attack | 15 minutes | Data breach, ransomware, complete outage |
| **P2 - High** | Service degraded, potential breach | 1 hour | Authentication bypass, SQL injection found |
| **P3 - Medium** | Security vulnerability, limited impact | 4 hours | XSS vulnerability, outdated dependencies |
| **P4 - Low** | Minor issue, no immediate impact | 24 hours | Security scan findings, policy violations |

## 3. Incident Response Team

### Roles & Responsibilities

| Role | Responsibility | Contact |
|------|---------------|---------|
| **Incident Commander** | Overall incident coordination | On-call rotation |
| **Security Lead** | Technical investigation & containment | security@shipdocs.app |
| **Communications Lead** | Customer & stakeholder communication | support@shipdocs.app |
| **Legal/Compliance** | Legal and regulatory requirements | compliance@shipdocs.app |

### Escalation Matrix

```
P4 → Security Lead
P3 → Security Lead + Incident Commander
P2 → Full IRT + Management
P1 → Full IRT + Management + Legal
```

## 4. Incident Response Phases

### Phase 1: Detection & Alert (0-15 minutes)

#### Automated Detection
- [ ] Security monitoring alerts
- [ ] Rate limiting triggers
- [ ] Failed authentication spikes
- [ ] Dependency vulnerability alerts
- [ ] Container security alerts

#### Manual Detection
- [ ] User reports
- [ ] Security researcher disclosure
- [ ] Internal discovery

#### Initial Actions
1. Acknowledge alert
2. Assign severity level
3. Start incident timer
4. Create incident ticket
5. Notify Incident Commander

### Phase 2: Triage & Analysis (15-60 minutes)

#### Information Gathering
```bash
# Check system status
docker compose ps
docker compose logs --tail=1000 backend

# Check recent authentication attempts
docker compose exec database psql -U postgres -d maritime -c "
  SELECT * FROM audit_log 
  WHERE event_type IN ('login_failed', 'unauthorized_access') 
  AND created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC;
"

# Check rate limiting
docker compose exec redis redis-cli
> KEYS rate_limit:*
> GET rate_limit:<key>

# Check active sessions
docker compose exec database psql -U postgres -d maritime -c "
  SELECT * FROM sessions 
  WHERE expires_at > NOW() 
  ORDER BY created_at DESC;
"
```

#### Impact Assessment
- [ ] Number of affected users
- [ ] Data exposure assessment
- [ ] Service availability impact
- [ ] Compliance implications

### Phase 3: Containment (1-4 hours)

#### Immediate Containment
```bash
# Block suspicious IP
iptables -A INPUT -s <IP> -j DROP

# Disable compromised account
docker compose exec database psql -U postgres -d maritime -c "
  UPDATE users SET status = 'suspended' WHERE email = '<email>';
"

# Revoke all sessions for user
docker compose exec database psql -U postgres -d maritime -c "
  DELETE FROM sessions WHERE user_id = '<user_id>';
"

# Clear Redis cache if needed
docker compose exec redis redis-cli FLUSHALL
```

#### Short-term Containment
- [ ] Isolate affected systems
- [ ] Preserve evidence
- [ ] Implement temporary fixes
- [ ] Enhanced monitoring

### Phase 4: Eradication (4-24 hours)

#### Root Cause Analysis
- [ ] Timeline reconstruction
- [ ] Attack vector identification
- [ ] Vulnerability assessment
- [ ] Indicator of Compromise (IoC) collection

#### Remediation Actions
```bash
# Update dependencies
npm audit fix --force
cd client && npm audit fix --force

# Rotate secrets
export NEW_JWT_SECRET=$(openssl rand -base64 32)
export NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Update environment
docker compose down
# Update .env file with new secrets
docker compose up -d

# Force password reset for affected users
docker compose exec database psql -U postgres -d maritime -c "
  UPDATE users SET password_reset_required = true 
  WHERE last_login > NOW() - INTERVAL '7 days';
"
```

### Phase 5: Recovery (24-72 hours)

#### Service Restoration
- [ ] Deploy patches
- [ ] Restore from clean backups
- [ ] Verify system integrity
- [ ] Resume normal operations

#### Validation
```bash
# Run security tests
npm run test:security

# Verify all services
docker compose ps
curl -f http://localhost:3000/health

# Check audit logs
docker compose exec database psql -U postgres -d maritime -c "
  SELECT COUNT(*), event_type 
  FROM audit_log 
  WHERE created_at > NOW() - INTERVAL '1 hour' 
  GROUP BY event_type;
"
```

### Phase 6: Lessons Learned (Within 1 week)

#### Post-Incident Review
- [ ] Incident timeline
- [ ] What went well
- [ ] What needs improvement
- [ ] Action items
- [ ] Update procedures

#### Documentation
- Incident report
- Root cause analysis
- Remediation verification
- Compliance reporting

## 5. Communication Plan

### Internal Communication

| Severity | Method | Frequency |
|----------|--------|-----------|
| P1 | Slack/Teams + Email + Phone | Every 30 min |
| P2 | Slack/Teams + Email | Every hour |
| P3 | Email | Every 4 hours |
| P4 | Email | Daily |

### External Communication

#### Customer Notification Template
```
Subject: [Security Notice] <Brief Description>

Dear Customer,

We are writing to inform you of a security incident that <may have affected/affected> your account.

**What Happened:**
<Description>

**When:**
<Timeline>

**Impact:**
<What data/services were affected>

**Actions Taken:**
<What we did>

**Actions for You:**
<What customers should do>

We take security seriously and apologize for any inconvenience.

Best regards,
Maritime Onboarding Security Team
```

### Regulatory Notification (NIS2)

**Timeline**: Within 24 hours for significant incidents

**Required Information**:
- Entity identification
- Incident classification
- Impact assessment
- Mitigation measures
- Cross-border impact

## 6. Evidence Collection

### Chain of Custody
```bash
# Create evidence directory
mkdir -p /evidence/$(date +%Y%m%d_%H%M%S)
cd /evidence/$(date +%Y%m%d_%H%M%S)

# Collect logs
docker compose logs > docker_logs.txt
journalctl -u docker --since "1 hour ago" > system_logs.txt

# Database snapshot
docker compose exec database pg_dump -U postgres maritime > database_backup.sql

# Redis snapshot
docker compose exec redis redis-cli BGSAVE
docker cp employee-onboarding-redis:/data/dump.rdb ./redis_dump.rdb

# Network connections
netstat -an > network_connections.txt
ss -tulpn > listening_ports.txt

# Process list
ps aux > process_list.txt
docker ps -a > docker_containers.txt

# Calculate hashes
find . -type f -exec sha256sum {} \; > evidence_hashes.txt
```

## 7. Recovery Procedures

### Backup Restoration
```bash
# Stop services
docker compose down

# Restore database
docker compose up -d database
docker compose exec database psql -U postgres -c "DROP DATABASE IF EXISTS maritime;"
docker compose exec database psql -U postgres -c "CREATE DATABASE maritime;"
docker compose exec database psql -U postgres maritime < /backup/maritime_backup.sql

# Restart all services
docker compose up -d
```

### Secret Rotation
```bash
# Generate new secrets
./scripts/rotate-secrets.sh

# Update Kubernetes secrets (if applicable)
kubectl delete secret app-secrets
kubectl create secret generic app-secrets --from-env-file=.env.production

# Restart applications
docker compose restart backend
```

## 8. Testing & Maintenance

### Monthly Tests
- [ ] Alert detection
- [ ] Communication channels
- [ ] Backup restoration
- [ ] Access to tools

### Quarterly Exercises
- [ ] Tabletop exercise
- [ ] Red team simulation
- [ ] Recovery drill
- [ ] Communication test

### Annual Review
- [ ] Full plan review
- [ ] Compliance audit
- [ ] Tool evaluation
- [ ] Training update

## 9. Tools & Resources

### Security Tools
- **Monitoring**: GitHub Security, Datadog, CloudWatch
- **SIEM**: Splunk, ELK Stack
- **Vulnerability Scanning**: Snyk, OWASP ZAP
- **Forensics**: Volatility, Wireshark

### Useful Commands
```bash
# Find recently modified files
find / -type f -mtime -1 -ls

# Check for unauthorized SSH keys
find /home -name "authorized_keys" -exec cat {} \;

# List all cron jobs
for user in $(cat /etc/passwd | cut -f1 -d:); do 
  echo $user; crontab -u $user -l; 
done

# Check for listening services
lsof -i -P -n | grep LISTEN
```

## 10. Contact Information

### Internal Contacts
- **Security Team**: security@shipdocs.app
- **DevOps On-Call**: +31 XX XXX XXXX
- **Management**: management@shipdocs.app

### External Contacts
- **CERT/CSIRT**: cert@ncsc.nl
- **Law Enforcement**: cybercrime@politie.nl
- **Cyber Insurance**: claim@insurer.com
- **Legal Counsel**: legal@lawfirm.com

### Vendor Contacts
- **GitHub Security**: security@github.com
- **Cloud Provider**: support@cloudprovider.com
- **CDN/WAF**: support@cdn.com

## 11. Compliance Requirements

### NIS2 Requirements
- [x] Incident handling (Art. 21)
- [x] Incident notification (Art. 23)
- [x] Risk management (Art. 21)
- [x] Business continuity (Art. 21)

### ISO 27001 Controls
- [x] A.16.1.1 - Responsibilities and procedures
- [x] A.16.1.2 - Reporting information security events
- [x] A.16.1.3 - Reporting security weaknesses
- [x] A.16.1.4 - Assessment and decision
- [x] A.16.1.5 - Response to incidents
- [x] A.16.1.6 - Learning from incidents
- [x] A.16.1.7 - Collection of evidence

### GDPR Requirements
- [x] Breach notification (Art. 33)
- [x] Communication to data subjects (Art. 34)
- [x] Documentation (Art. 33.5)

---

**Document Control**
- Owner: Security Team
- Review Frequency: Quarterly
- Next Review: April 2025
- Distribution: Public (sanitized version)