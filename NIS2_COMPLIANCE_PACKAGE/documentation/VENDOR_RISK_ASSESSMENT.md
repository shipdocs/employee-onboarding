# Vendor Risk Assessment Framework
## Maritime Onboarding System - NIS2 Article 22 Compliance

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Classification:** Confidential  
**Owner:** Security Officer  
**Approved By:** Management Board  

---

## 1. EXECUTIVE SUMMARY

This Vendor Risk Assessment Framework ensures compliance with NIS2 Article 22 requirements for supply chain security and third-party risk management in the Maritime Onboarding System.

**Objectives:**
- Identify and assess risks from third-party vendors
- Ensure vendor security controls meet our standards
- Maintain continuous monitoring of vendor security posture
- Comply with NIS2 supply chain security requirements
- Protect against supply chain attacks

**Scope:** All vendors providing services to the Maritime Onboarding System

---

## 2. VENDOR INVENTORY & CLASSIFICATION

### 2.1 Critical Vendors (Tier 1)
| Vendor | Service | Risk Level | Data Access | Criticality |
|--------|---------|------------|-------------|-------------|
| **Vercel Inc.** | Application hosting | HIGH | Application code, logs | CRITICAL |
| **Supabase Inc.** | Database & storage | CRITICAL | All user data, PII | CRITICAL |
| **Cloudflare Inc.** | CDN & security | MEDIUM | Traffic metadata | HIGH |
| **MailerSend** | Email delivery | MEDIUM | Email addresses | MEDIUM |

### 2.2 Secondary Vendors (Tier 2)
| Vendor | Service | Risk Level | Data Access | Criticality |
|--------|---------|------------|-------------|-------------|
| **AWS** | Infrastructure (via Supabase) | HIGH | All data (indirect) | CRITICAL |
| **GitHub** | Code repository | MEDIUM | Source code | HIGH |
| **PagerDuty** | Incident management | LOW | Alert metadata | MEDIUM |

### 2.3 Development Tools (Tier 3)
| Vendor | Service | Risk Level | Data Access | Criticality |
|--------|---------|------------|-------------|-------------|
| **npm Registry** | Package dependencies | MEDIUM | None (build-time) | MEDIUM |
| **React/Meta** | Frontend framework | LOW | None (build-time) | LOW |
| **Node.js Foundation** | Runtime environment | MEDIUM | None (build-time) | MEDIUM |

---

## 3. RISK ASSESSMENT METHODOLOGY

### 3.1 Risk Scoring Matrix
```
Risk Score = (Likelihood × Impact × Data Sensitivity × Business Criticality) / 4

Likelihood (1-5):
1 = Very Low (< 5% chance)
2 = Low (5-25% chance)
3 = Medium (25-50% chance)
4 = High (50-75% chance)
5 = Very High (> 75% chance)

Impact (1-5):
1 = Minimal (< 1 hour downtime)
2 = Minor (1-4 hours downtime)
3 = Moderate (4-24 hours downtime)
4 = Major (1-7 days downtime)
5 = Severe (> 7 days downtime)

Data Sensitivity (1-5):
1 = Public data
2 = Internal data
3 = Confidential data
4 = Personal data (PII)
5 = Highly sensitive data

Business Criticality (1-5):
1 = Non-essential
2 = Useful
3 = Important
4 = Critical
5 = Mission critical
```

### 3.2 Risk Categories
- **Security Risk**: Data breaches, unauthorized access
- **Operational Risk**: Service outages, performance issues
- **Compliance Risk**: Regulatory violations, audit failures
- **Financial Risk**: Cost overruns, contract disputes
- **Reputational Risk**: Brand damage, customer loss

---

## 4. DETAILED VENDOR ASSESSMENTS

### 4.1 Vercel Inc. - Application Hosting
**Risk Assessment Date:** January 2025  
**Next Review:** July 2025  

**Security Controls:**
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 compliant infrastructure
- ✅ TLS 1.3 encryption in transit
- ✅ DDoS protection via Cloudflare
- ✅ Automated security scanning
- ✅ GDPR Data Processing Agreement signed

**Risk Analysis:**
| Risk Category | Likelihood | Impact | Score | Mitigation |
|---------------|------------|--------|-------|------------|
| Data Breach | 2 | 4 | 8 | SOC 2 compliance, encryption |
| Service Outage | 2 | 3 | 6 | 99.99% SLA, automatic failover |
| Compliance Violation | 1 | 3 | 3 | GDPR DPA, regular audits |

**Overall Risk Score:** 5.7/25 (MEDIUM)

**Recommendations:**
- Monitor Vercel security bulletins
- Review access logs quarterly
- Maintain backup deployment strategy

### 4.2 Supabase Inc. - Database & Storage
**Risk Assessment Date:** January 2025  
**Next Review:** April 2025  

**Security Controls:**
- ✅ SOC 2 Type II certified
- ✅ AWS infrastructure (Frankfurt)
- ✅ AES-256-GCM encryption at rest
- ✅ Row Level Security (RLS) enabled
- ✅ Automated backups with encryption
- ✅ GDPR Data Processing Agreement signed

**Risk Analysis:**
| Risk Category | Likelihood | Impact | Score | Mitigation |
|---------------|------------|--------|-------|------------|
| Data Breach | 2 | 5 | 10 | Encryption, access controls |
| Service Outage | 2 | 5 | 10 | 99.9% SLA, automated backups |
| Compliance Violation | 1 | 4 | 4 | EU hosting, GDPR compliance |

**Overall Risk Score:** 8.0/25 (HIGH)

**Recommendations:**
- Implement additional database monitoring
- Regular backup restoration testing
- Enhanced access logging and monitoring

### 4.3 Cloudflare Inc. - CDN & Security
**Risk Assessment Date:** January 2025  
**Next Review:** July 2025  

**Security Controls:**
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 certified
- ✅ DDoS protection (up to 100 Tbps)
- ✅ Web Application Firewall (WAF)
- ✅ TLS 1.3 support
- ✅ GDPR compliant

**Risk Analysis:**
| Risk Category | Likelihood | Impact | Score | Mitigation |
|---------------|------------|--------|-------|------------|
| Security Bypass | 2 | 3 | 6 | Multi-layer security, monitoring |
| Service Outage | 1 | 2 | 2 | Global network, redundancy |
| Data Exposure | 1 | 2 | 2 | No sensitive data cached |

**Overall Risk Score:** 3.3/25 (LOW)

**Recommendations:**
- Monitor security rule effectiveness
- Regular WAF rule updates
- Maintain direct access capability

### 4.4 MailerSend - Email Delivery
**Risk Assessment Date:** January 2025  
**Next Review:** July 2025  

**Security Controls:**
- ✅ EU-based company (Latvia)
- ✅ GDPR native compliance
- ✅ TLS encryption for email delivery
- ✅ DKIM/SPF/DMARC support
- ✅ API rate limiting
- ✅ Data Processing Agreement signed

**Risk Analysis:**
| Risk Category | Likelihood | Impact | Score | Mitigation |
|---------------|------------|--------|-------|------------|
| Email Interception | 2 | 2 | 4 | TLS encryption, DKIM |
| Service Outage | 2 | 2 | 4 | Backup SMTP provider ready |
| Data Breach | 1 | 2 | 2 | Minimal data stored |

**Overall Risk Score:** 3.3/25 (LOW)

**Recommendations:**
- Monitor email delivery rates
- Maintain backup email service
- Regular security configuration review

---

## 5. SUPPLY CHAIN SECURITY CONTROLS

### 5.1 Vendor Onboarding Process
```
1. Initial Risk Assessment
   ├── Security questionnaire
   ├── Compliance documentation review
   ├── Financial stability check
   └── Reference verification

2. Security Evaluation
   ├── Penetration testing (if applicable)
   ├── Vulnerability assessment
   ├── Compliance audit review
   └── Data handling procedures

3. Contract Negotiation
   ├── Security requirements
   ├── Data Processing Agreement
   ├── SLA definitions
   └── Incident response procedures

4. Ongoing Monitoring
   ├── Quarterly security reviews
   ├── Annual risk reassessment
   ├── Incident tracking
   └── Performance monitoring
```

### 5.2 Vendor Security Requirements
**Mandatory Requirements:**
- SOC 2 Type II certification (or equivalent)
- GDPR compliance and DPA
- Encryption in transit and at rest
- Incident response procedures
- Regular security assessments
- Business continuity planning

**Preferred Requirements:**
- ISO 27001 certification
- Penetration testing reports
- Bug bounty programs
- Zero-trust architecture
- Multi-factor authentication
- Security awareness training

### 5.3 Continuous Monitoring
**Monthly:**
- Service availability monitoring
- Security incident review
- Performance metrics analysis
- Cost optimization review

**Quarterly:**
- Security posture assessment
- Compliance status review
- Contract performance evaluation
- Risk score recalculation

**Annually:**
- Comprehensive vendor audit
- Contract renewal negotiation
- Alternative vendor evaluation
- Business continuity testing

---

## 6. INCIDENT RESPONSE & VENDOR MANAGEMENT

### 6.1 Vendor Security Incident Response
```
Incident Detection:
├── Vendor notification received
├── Security monitoring alerts
├── Customer reports
└── Media/public disclosure

Immediate Response (0-4 hours):
├── Assess impact on our systems
├── Activate incident response team
├── Implement containment measures
└── Notify stakeholders

Investigation (4-24 hours):
├── Gather incident details from vendor
├── Assess data exposure risk
├── Determine regulatory obligations
└── Document timeline and impact

Recovery (24-72 hours):
├── Implement vendor-provided fixes
├── Verify system integrity
├── Resume normal operations
└── Conduct lessons learned review
```

### 6.2 Vendor Performance Metrics
| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| **Availability** | 99.9% | Uptime monitoring | Real-time |
| **Response Time** | < 2 seconds | Performance monitoring | Real-time |
| **Security Incidents** | 0 critical | Incident tracking | Monthly |
| **Compliance Status** | 100% | Audit results | Quarterly |
| **SLA Compliance** | 95% | Contract metrics | Monthly |

### 6.3 Vendor Exit Strategy
**Preparation:**
- Data export procedures documented
- Alternative vendors identified
- Migration timeline established
- Cost analysis completed

**Execution:**
- Data extraction and verification
- Service migration testing
- Parallel operation period
- Final cutover and validation

**Post-Migration:**
- Data deletion verification
- Contract termination
- Lessons learned documentation
- Vendor relationship closure

---

## 7. COMPLIANCE MAPPING

### 7.1 NIS2 Article 22 Requirements
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Supply chain risk assessment** | Vendor risk scoring matrix | ✅ COMPLETE |
| **Vendor security requirements** | Mandatory security controls | ✅ COMPLETE |
| **Continuous monitoring** | Quarterly reviews, metrics | ✅ COMPLETE |
| **Incident response procedures** | Vendor incident response plan | ✅ COMPLETE |
| **Documentation and reporting** | This framework document | ✅ COMPLETE |

### 7.2 GDPR Article 28 (Processors)
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Data Processing Agreements** | All critical vendors | ✅ COMPLETE |
| **Processor security measures** | Security requirements matrix | ✅ COMPLETE |
| **Sub-processor management** | Vendor chain mapping | ✅ COMPLETE |
| **Data breach notification** | Incident response procedures | ✅ COMPLETE |

---

## 8. ACTION PLAN & NEXT STEPS

### 8.1 Immediate Actions (Next 30 Days)
- [ ] Complete security questionnaires for all Tier 1 vendors
- [ ] Verify all DPAs are current and comprehensive
- [ ] Implement automated vendor monitoring dashboard
- [ ] Establish vendor incident notification procedures

### 8.2 Short-term Actions (Next 90 Days)
- [ ] Conduct vendor security assessments
- [ ] Implement vendor performance metrics tracking
- [ ] Develop vendor exit strategies for critical services
- [ ] Create vendor security training program

### 8.3 Long-term Actions (Next 12 Months)
- [ ] Annual vendor risk assessment cycle
- [ ] Vendor security audit program
- [ ] Supply chain security maturity assessment
- [ ] Vendor consolidation and optimization

---

**Document Control:**
- **Next Review:** April 2025
- **Review Frequency:** Quarterly
- **Approval Required:** Security Officer + Management
- **Distribution:** Security Team, Management, Compliance, Procurement
