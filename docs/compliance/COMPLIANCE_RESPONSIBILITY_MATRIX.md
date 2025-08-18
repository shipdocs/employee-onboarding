# Compliance Responsibility Matrix
## Maritime Onboarding System - Deployment Models

Last Updated: January 2025  
Version: 1.0

---

## Executive Summary

This matrix clearly defines compliance responsibilities across three deployment models:
1. **Essentials** (Self-Hosted) - €199/month
2. **Professional** (Managed Cloud) - €999/month  
3. **Enterprise** (Full Compliance) - €3,999/month

Legend:
- ✅ **Included** - We handle this completely
- 🤝 **Shared** - Joint responsibility
- 👤 **Customer** - Customer's responsibility
- 💰 **Paid Add-on** - Available for additional fee
- ❌ **Not Included** - Not available in this tier

---

## Deployment Model Comparison

| Aspect | Essentials (€199) | Professional (€999) | Enterprise (€3,999) |
|--------|------------------|-------------------|---------------------|
| **Deployment Type** | On-Premise/Private Cloud | Shared Cloud | Dedicated Cloud |
| **Target Customer** | Small operators (<50 crew/month) | Medium operators (50-200 crew/month) | Large operators (200+ crew/month) |
| **Support Level** | Email (48h) | Priority (24h) | Dedicated (4h) |
| **Uptime SLA** | None | 99.5% | 99.9% |
| **Data Location** | Customer chooses | EU (Frankfurt) | Customer chooses |

---

## 1. Infrastructure & Hosting Responsibilities

| Requirement | Essentials | Professional | Enterprise | Notes |
|------------|------------|--------------|------------|-------|
| **Server Infrastructure** | 👤 Customer | ✅ Included | ✅ Included | Hardware, OS, network |
| **Database Management** | 👤 Customer | ✅ Included | ✅ Included | PostgreSQL/Supabase |
| **SSL Certificates** | 👤 Customer | ✅ Included | ✅ Included | TLS 1.3 required |
| **CDN & Edge Network** | 👤 Customer | ✅ Included | ✅ Included | Global distribution |
| **Load Balancing** | 👤 Customer | ✅ Included | ✅ Included | Auto-scaling |
| **Backup Infrastructure** | 👤 Customer | ✅ Included | ✅ Included | Daily backups |
| **Disaster Recovery Site** | 👤 Customer | ❌ Not Included | ✅ Included | Secondary region |
| **Network Security** | 👤 Customer | 🤝 Shared | ✅ Included | Firewall, DDoS protection |

**Cost Justification:**
- Essentials: Customer uses existing infrastructure (€0 for us)
- Professional: Shared Vercel/Supabase (~€300/month per instance)
- Enterprise: Dedicated resources (~€1,500/month infrastructure)

---

## 2. Security & Compliance (NIS2 Article 21)

| Requirement | Essentials | Professional | Enterprise | NIS2 Reference |
|------------|------------|--------------|------------|----------------|
| **Risk Assessment** | 👤 Customer | 🤝 Shared | ✅ Included | Art. 21(1) |
| **Security Policies** | Templates provided | 🤝 Shared | ✅ Included | Art. 21(2)(a) |
| **Incident Handling** | 👤 Customer | 🤝 Shared | ✅ Included | Art. 21(2)(b) |
| **Business Continuity** | 👤 Customer | 🤝 Shared | ✅ Included | Art. 21(2)(c) |
| **Supply Chain Security** | 👤 Customer | Documentation provided | ✅ Included | Art. 21(2)(d) |
| **Vulnerability Management** | Security bulletins | Quarterly scans | Monthly scans | Art. 21(2)(e) |
| **Penetration Testing** | 👤 Customer | 💰 Add-on (€5k/year) | ✅ Included (annual) | Art. 21(3) |
| **Security Monitoring** | 👤 Customer | Basic monitoring | 24/7 SOC | Art. 21(2)(f) |
| **Encryption at Rest** | ✅ Included | ✅ Included | ✅ Included | Art. 21(2)(g) |
| **Encryption in Transit** | ✅ Included | ✅ Included | ✅ Included | Art. 21(2)(g) |

**Compliance Score:**
- Essentials: Customer can achieve 100% with own efforts
- Professional: 70% compliance out-of-box
- Enterprise: 95% compliance out-of-box

---

## 3. Incident Response (NIS2 Article 23)

| Requirement | Essentials | Professional | Enterprise | Timeline |
|------------|------------|--------------|------------|----------|
| **Incident Detection** | 👤 Customer tools | Basic alerting | AI-powered detection | Real-time |
| **Initial Assessment** | 👤 Customer | 👤 Customer | ✅ Our team | <1 hour |
| **CSIRT Notification** | 👤 Customer | 👤 Customer | 🤝 We assist | <24 hours |
| **Incident Investigation** | 👤 Customer | 💰 Add-on | ✅ Included | <72 hours |
| **Root Cause Analysis** | 👤 Customer | 💰 Add-on | ✅ Included | <1 week |
| **Remediation Support** | 👤 Customer | Email guidance | Hands-on support | Varies |
| **Post-Incident Report** | 👤 Customer | Template provided | ✅ Full report | <1 month |

**24-Hour Rule Compliance:**
- Essentials: Customer must have own process
- Professional: We provide notification templates
- Enterprise: We help prepare CSIRT notifications

---

## 4. Access Control & Authentication (ISO 27001)

| Requirement | Essentials | Professional | Enterprise | ISO Control |
|------------|------------|--------------|------------|-------------|
| **Multi-Factor Auth** | ✅ Included | ✅ Included | ✅ Included | A.9.4.2 |
| **SSO Integration** | 👤 Self-configure | ✅ Included | ✅ Included | A.9.2.1 |
| **Password Policies** | ✅ Enforced | ✅ Enforced | ✅ Enforced | A.9.4.3 |
| **Access Reviews** | 👤 Customer | Reports provided | ✅ Managed | A.9.2.5 |
| **Privileged Access Mgmt** | Basic RBAC | Advanced RBAC | ✅ Full PAM | A.9.2.3 |
| **Session Management** | ✅ Included | ✅ Included | ✅ Included | A.9.4.2 |
| **Account Provisioning** | Manual/API | API + UI | ✅ Automated | A.9.2.1 |
| **De-provisioning** | Manual/API | API + UI | ✅ Automated | A.9.2.6 |

---

## 5. Audit & Logging (NIS2 Article 21)

| Requirement | Essentials | Professional | Enterprise | Retention |
|------------|------------|--------------|------------|-----------|
| **Application Logs** | Local storage | ✅ 30 days | ✅ 90 days | Configurable |
| **Security Event Logs** | Local storage | ✅ 90 days | ✅ 1 year | Encrypted |
| **Audit Trail** | ✅ Included | ✅ Included | ✅ Included | Immutable |
| **Log Analysis** | 👤 Customer tools | Basic analytics | ✅ Advanced SIEM | Real-time |
| **Log Export** | ✅ API/CSV | ✅ API/CSV | ✅ Multiple formats | On-demand |
| **Compliance Reports** | 👤 Generate own | Monthly reports | ✅ Custom reports | Automated |
| **Log Monitoring** | 👤 Customer | Anomaly alerts | ✅ 24/7 monitoring | Continuous |
| **Forensic Support** | 👤 Customer | 💰 Add-on | ✅ Included | As needed |

---

## 6. Data Protection & Privacy (GDPR)

| Requirement | Essentials | Professional | Enterprise | GDPR Article |
|------------|------------|--------------|------------|--------------|
| **Privacy by Design** | ✅ Built-in | ✅ Built-in | ✅ Built-in | Art. 25 |
| **Data Minimization** | ✅ Enforced | ✅ Enforced | ✅ Enforced | Art. 5(1)(c) |
| **Right to Access** | ✅ Self-service | ✅ Self-service | ✅ Managed service | Art. 15 |
| **Right to Deletion** | ✅ Self-service | ✅ Self-service | ✅ Managed service | Art. 17 |
| **Data Portability** | ✅ Export tools | ✅ Export tools | ✅ Custom formats | Art. 20 |
| **Consent Management** | ✅ Included | ✅ Included | ✅ Advanced | Art. 7 |
| **DPO Support** | Documentation | 🤝 Shared | ✅ Dedicated contact | Art. 37 |
| **DPIA Support** | Templates | 🤝 Assistance | ✅ Full support | Art. 35 |
| **Breach Notification** | 👤 Customer | 🤝 We alert | ✅ We manage | Art. 33-34 |

---

## 7. Business Continuity & Disaster Recovery

| Requirement | Essentials | Professional | Enterprise | Target |
|------------|------------|--------------|------------|--------|
| **RPO (Data Loss)** | Customer defined | 24 hours | 1 hour | Maximum |
| **RTO (Recovery Time)** | Customer defined | 8 hours | 2 hours | Maximum |
| **Backup Frequency** | 👤 Customer | Daily | Hourly | Automated |
| **Backup Testing** | 👤 Customer | Quarterly | Monthly | Verified |
| **DR Plan** | Template provided | 🤝 Shared | ✅ Full plan | Documented |
| **DR Testing** | 👤 Customer | Annual | Bi-annual | Mandatory |
| **Failover Capability** | 👤 Customer | Manual | ✅ Automatic | <15 min |
| **Data Replication** | 👤 Customer | Daily sync | ✅ Real-time | Multi-region |
| **Runbook Documentation** | ✅ Provided | ✅ Updated | ✅ Maintained | Current |

---

## 8. Operational Support

| Service | Essentials | Professional | Enterprise | Availability |
|---------|------------|--------------|------------|--------------|
| **Technical Support** | Email only | Email + Phone | Dedicated team | Business hours |
| **Response Time SLA** | 48 hours | 24 hours | 4 hours | Initial response |
| **Security Updates** | ✅ Included | ✅ Included | ✅ Priority | As released |
| **Feature Updates** | Quarterly | Monthly | ✅ Priority access | Continuous |
| **Training** | Documentation | 2 sessions/year | ✅ Unlimited | On-demand |
| **Onboarding Support** | Self-service | ✅ Guided setup | ✅ White-glove | One-time |
| **API Support** | Community | ✅ Included | ✅ Priority | Dev support |
| **Custom Development** | ❌ Not available | 💰 Quoted | ✅ 20 hours/year | Included hours |

---

## 9. Compliance Certifications & Audits

| Certification/Audit | Essentials | Professional | Enterprise | Validity |
|--------------------|------------|--------------|------------|----------|
| **ISO 27001** | 👤 Customer | Alignment guide | ✅ Certified* | Annual |
| **SOC 2 Type II** | 👤 Customer | 💰 Report access | ✅ Included | Annual |
| **ISAE 3402** | 👤 Customer | ❌ Not available | ✅ On request | Annual |
| **Penetration Test** | 👤 Customer | 💰 €5k/year | ✅ 2x per year | Bi-annual |
| **Vulnerability Scan** | 👤 Customer | Quarterly | ✅ Monthly | Continuous |
| **Compliance Audit** | 👤 Customer | 💰 Available | ✅ Annual | Yearly |
| **Security Questionnaires** | 👤 Self-complete | 🤝 We assist | ✅ We complete | As needed |
| **Audit Support** | Documentation | 💰 Hourly rate | ✅ Included | During audits |

*Through infrastructure provider inheritance

---

## 10. Pricing Justification Breakdown

### Essentials (€199/month)
```
Software License:        €150
Basic Support:           €30
Security Updates:        €19
Infrastructure:          €0 (customer provides)
Compliance:             €0 (customer manages)
---
Total:                  €199/month
```

### Professional (€999/month)
```
Software License:        €150
Priority Support:        €150
Infrastructure:          €300 (shared cloud)
Monitoring:             €100
Backup & Recovery:      €100
Compliance Support:     €100
Security Scanning:      €99
---
Total:                  €999/month
```

### Enterprise (€3,999/month)
```
Software License:        €150
Dedicated Support:       €500
Infrastructure:          €1,500 (dedicated)
24/7 SOC:               €800
Compliance Management:   €500
Penetration Testing:     €200 (amortized)
DR Site:                €200
Custom Development:      €149 (20h/year amortized)
---
Total:                  €3,999/month
```

---

## Upgrade Paths

| From → To | Migration Effort | Data Migration | Downtime | Support Included |
|-----------|-----------------|----------------|----------|------------------|
| Essentials → Professional | 1 week | ✅ Assisted | <4 hours | ✅ Full support |
| Essentials → Enterprise | 2 weeks | ✅ Managed | <2 hours | ✅ White-glove |
| Professional → Enterprise | 1 week | ✅ Managed | <1 hour | ✅ Full support |
| Any → Essentials (downgrade) | Self-service | Export tools | N/A | Documentation |

---

## Service Level Agreements (SLAs)

### Essentials
- **No SLA** - Best effort support
- Security updates within 30 days
- No uptime guarantees

### Professional
- **99.5% Uptime** (excluding planned maintenance)
- 24-hour support response
- Security patches within 7 days
- 4-hour maintenance windows (monthly)

### Enterprise
- **99.9% Uptime** guarantee
- 4-hour critical issue response
- Security patches within 72 hours
- Zero-downtime deployments
- Financial penalties for SLA breaches

---

## Compliance Achievement Summary

| Deployment Model | NIS2 Compliance | ISO 27001 Ready | GDPR Compliant | Audit Ready |
|-----------------|-----------------|-----------------|----------------|-------------|
| **Essentials** | 40%* | 50%* | 80% | 60%* |
| **Professional** | 70% | 75% | 95% | 80% |
| **Enterprise** | 95% | 95% | 100% | 100% |

*Customer can achieve 100% with additional controls

---

## Key Decision Factors

### Choose **Essentials** if:
- ✅ You have in-house IT expertise
- ✅ You already have security infrastructure
- ✅ You can handle your own compliance
- ✅ Budget is primary concern
- ✅ <50 crew onboardings per month

### Choose **Professional** if:
- ✅ You need reliable cloud hosting
- ✅ You want vendor support for compliance
- ✅ You need basic monitoring
- ✅ 50-200 crew onboardings per month
- ✅ Budget allows €1k/month

### Choose **Enterprise** if:
- ✅ You need full compliance support
- ✅ You require 24/7 monitoring
- ✅ You need dedicated support
- ✅ You face regulatory audits
- ✅ 200+ crew onboardings per month

---

## Legal Disclaimers

1. **Compliance Responsibility**: Ultimate compliance responsibility remains with the customer as the data controller and/or NIS2 operator.

2. **Shared Responsibility**: In shared responsibility items (🤝), specific divisions of responsibility will be documented in the service agreement.

3. **Regulatory Changes**: This matrix is based on regulations as of January 2025. Customers must monitor regulatory changes.

4. **Audit Outcomes**: We do not guarantee successful audit outcomes, only that we provide the tools and support indicated.

5. **Service Modifications**: Service levels and responsibilities may be adjusted with 90 days notice.

---

## Contact for Questions

**Sales Inquiries**: sales@maritime-onboarding.com  
**Compliance Questions**: compliance@maritime-onboarding.com  
**Technical Support**: Per your service tier

---

*This document is version controlled and updated quarterly. Last review: January 2025*