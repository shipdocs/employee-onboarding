# Business Continuity Plan (BCP)
## Maritime Onboarding System - NIS2 Article 16 Compliance

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Classification:** Confidential  
**Owner:** Security Officer  
**Approval:** Management Board  

---

## 1. EXECUTIVE SUMMARY

This Business Continuity Plan ensures the Maritime Onboarding System maintains critical operations during disruptions, meeting NIS2 Article 16 requirements for essential service continuity.

**Critical Services:**
- User authentication and access
- Training content delivery
- Certificate generation
- Audit logging and compliance
- Incident response capabilities

**Recovery Objectives:**
- **RPO (Recovery Point Objective):** 1 hour
- **RTO (Recovery Time Objective):** 4 hours
- **Maximum Tolerable Downtime:** 8 hours
- **Service Level Target:** 99.9% uptime

---

## 2. RISK ASSESSMENT

### 2.1 Critical Threats
| Threat | Probability | Impact | Risk Level | Mitigation |
|--------|-------------|--------|------------|------------|
| **Cloud Provider Outage** | Medium | High | HIGH | Multi-region deployment |
| **Database Corruption** | Low | Critical | HIGH | Automated backups + replication |
| **Cyber Attack** | Medium | High | HIGH | Security monitoring + incident response |
| **Key Personnel Loss** | Medium | Medium | MEDIUM | Documentation + cross-training |
| **Network Connectivity** | Low | Medium | LOW | Multiple ISPs + CDN |
| **Regulatory Changes** | High | Medium | MEDIUM | Compliance monitoring |

### 2.2 Business Impact Analysis
```
Service Criticality Assessment:
├── CRITICAL (0-4 hours max downtime)
│   ├── User Authentication
│   ├── Emergency Training Access
│   └── Incident Response System
├── HIGH (4-8 hours max downtime)
│   ├── Certificate Generation
│   ├── Training Content Delivery
│   └── Manager Dashboard
└── MEDIUM (8-24 hours max downtime)
    ├── Reporting Functions
    ├── Analytics Dashboard
    └── Non-critical Admin Functions
```

---

## 3. CONTINUITY STRATEGIES

### 3.1 Infrastructure Resilience
**Primary Strategy: Cloud-Native Redundancy**
- **Application Layer:** Vercel automatic scaling and failover
- **Database Layer:** Supabase high availability with read replicas
- **CDN Layer:** Cloudflare global distribution
- **Monitoring:** 24/7 automated health checks

**Backup Strategy: Multi-Region Architecture**
```
Primary Region: eu-central-1 (Frankfurt)
├── Application: Vercel Edge Network
├── Database: Supabase Primary
├── Storage: Supabase Storage
└── Monitoring: Real-time health checks

Backup Region: eu-west-1 (Ireland)
├── Database: Read replica + backup storage
├── Application: Vercel automatic failover
├── Storage: Cross-region replication
└── Monitoring: Secondary monitoring stack
```

### 3.2 Data Protection Strategy
**Backup Schedule:**
- **Real-time:** Database replication to backup region
- **Hourly:** Transaction log backups
- **Daily:** Full database backup
- **Weekly:** Complete system backup including configurations
- **Monthly:** Backup verification and restore testing

**Backup Retention:**
- **Daily backups:** 30 days
- **Weekly backups:** 12 weeks
- **Monthly backups:** 12 months
- **Annual backups:** 7 years (compliance requirement)

---

## 4. INCIDENT RESPONSE PROCEDURES

### 4.1 Incident Classification
| Severity | Definition | Response Time | Escalation |
|----------|------------|---------------|------------|
| **P1 - Critical** | Complete service outage | 15 minutes | Immediate |
| **P2 - High** | Partial service degradation | 1 hour | Within 30 min |
| **P3 - Medium** | Minor service issues | 4 hours | Within 2 hours |
| **P4 - Low** | Cosmetic or documentation | 24 hours | Next business day |

### 4.2 Response Team Structure
```
Incident Commander (IC)
├── Technical Lead
├── Security Officer
├── Communications Lead
└── Business Stakeholder

On-Call Rotation:
├── Primary: Technical Lead
├── Secondary: DevOps Engineer
├── Escalation: Security Officer
└── Executive: CTO
```

### 4.3 Communication Plan
**Internal Communications:**
- **Incident Team:** Slack #incident-response
- **Management:** Email + SMS alerts
- **All Staff:** Company-wide announcement
- **Updates:** Every 30 minutes during P1/P2 incidents

**External Communications:**
- **Customers:** Status page + email notifications
- **Regulators:** Within 24 hours for security incidents
- **Vendors:** Direct contact for infrastructure issues
- **Media:** Prepared statements (if required)

---

## 5. RECOVERY PROCEDURES

### 5.1 Database Recovery
**Scenario: Database Corruption/Loss**
```bash
# 1. Assess damage and stop writes
kubectl scale deployment api --replicas=0

# 2. Identify latest clean backup
supabase db backup list --project-ref=ocqnnyxnqaedarcohywe

# 3. Restore from backup
supabase db backup restore <backup-id> --project-ref=ocqnnyxnqaedarcohywe

# 4. Verify data integrity
npm run db:verify-integrity

# 5. Resume operations
kubectl scale deployment api --replicas=3
```

**Recovery Time:** 2-4 hours  
**Data Loss:** Maximum 1 hour (RPO)

### 5.2 Application Recovery
**Scenario: Application Deployment Failure**
```bash
# 1. Rollback to previous version
vercel rollback --token=$VERCEL_TOKEN

# 2. Verify rollback success
curl -f https://onboarding.burando.online/api/health

# 3. If rollback fails, deploy from backup
git checkout <last-known-good-commit>
vercel deploy --prod

# 4. Update DNS if needed
cloudflare dns update
```

**Recovery Time:** 30 minutes - 2 hours  
**Data Loss:** None (stateless application)

### 5.3 Complete Disaster Recovery
**Scenario: Total Infrastructure Loss**
```
Phase 1: Emergency Response (0-1 hour)
├── Activate incident response team
├── Assess scope of damage
├── Communicate with stakeholders
└── Implement emergency workarounds

Phase 2: Infrastructure Recovery (1-4 hours)
├── Provision new infrastructure
├── Restore database from backup
├── Deploy application to new environment
└── Update DNS and routing

Phase 3: Service Restoration (4-8 hours)
├── Verify all services operational
├── Restore user access
├── Resume normal operations
└── Conduct post-incident review
```

---

## 6. TESTING & VALIDATION

### 6.1 Testing Schedule
| Test Type | Frequency | Scope | Success Criteria |
|-----------|-----------|-------|------------------|
| **Backup Verification** | Weekly | Data integrity | 100% restore success |
| **Failover Testing** | Monthly | Database failover | RTO < 4 hours |
| **DR Simulation** | Quarterly | Full disaster scenario | Complete recovery |
| **Tabletop Exercise** | Semi-annual | Team response | Process validation |

### 6.2 Test Procedures
**Monthly Failover Test:**
```bash
# 1. Schedule maintenance window
# 2. Simulate primary database failure
# 3. Verify automatic failover to backup region
# 4. Test application functionality
# 5. Measure recovery time
# 6. Document results and improvements
```

**Quarterly DR Test:**
```bash
# 1. Complete infrastructure simulation
# 2. Full backup restore procedure
# 3. Application redeployment
# 4. End-to-end functionality testing
# 5. Performance validation
# 6. Stakeholder communication test
```

---

## 7. VENDOR DEPENDENCIES

### 7.1 Critical Vendor SLAs
| Vendor | Service | SLA | Backup Plan |
|--------|---------|-----|-------------|
| **Vercel** | Application hosting | 99.99% | Manual deployment to backup |
| **Supabase** | Database | 99.9% | Restore to new instance |
| **Cloudflare** | CDN/DNS | 100% | Direct DNS management |
| **MailerSend** | Email delivery | 99.9% | Backup SMTP provider |

### 7.2 Vendor Escalation
**Vercel Support:**
- **Standard:** support@vercel.com
- **Emergency:** Enterprise support hotline
- **SLA:** 1 hour response for P1 issues

**Supabase Support:**
- **Standard:** support@supabase.com  
- **Emergency:** Enterprise support portal
- **SLA:** 2 hour response for P1 issues

---

## 8. COMPLIANCE REQUIREMENTS

### 8.1 NIS2 Article 16 Requirements
- ✅ **Risk Assessment:** Comprehensive threat analysis
- ✅ **Business Impact Analysis:** Service criticality mapping
- ✅ **Recovery Procedures:** Documented and tested
- ✅ **Communication Plans:** Internal and external
- ✅ **Testing Program:** Regular validation exercises
- ✅ **Vendor Management:** SLA monitoring and backup plans

### 8.2 Regulatory Reporting
**Incident Reporting Timeline:**
- **Internal notification:** Immediate (< 15 minutes)
- **Management notification:** Within 1 hour
- **Regulatory notification:** Within 24 hours (if required)
- **Customer notification:** Within 4 hours
- **Post-incident report:** Within 72 hours

---

## 9. PLAN MAINTENANCE

### 9.1 Review Schedule
- **Monthly:** Incident response procedures
- **Quarterly:** Full BCP review and testing
- **Semi-annually:** Risk assessment update
- **Annually:** Complete plan revision

### 9.2 Update Triggers
- Infrastructure changes
- New regulatory requirements
- Significant security incidents
- Vendor changes or SLA updates
- Organizational changes

---

**Document Control:**
- **Next Review:** April 2025
- **Review Frequency:** Quarterly
- **Approval Required:** Security Officer + Management
- **Distribution:** Incident Response Team, Management, Compliance
