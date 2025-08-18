# Service Level Agreement (SLA)
## Maritime Onboarding System 2025

**Effective Date:** August 2025  
**Version:** 1.0

---

## 1. Service Availability

### 1.1 Uptime Guarantee
- **Target Availability:** 99.0% per calendar month
- **Measurement Period:** Monthly (calendar month basis)
- **Exclusions:** Planned maintenance windows

### 1.2 Availability Calculation
```
Availability % = (Total Minutes - Downtime Minutes) / Total Minutes × 100
```

### 1.3 Service Credits
| Monthly Uptime % | Service Credit |
|-----------------|----------------|
| 99.0% - 100% | No credit |
| 95.0% - 98.99% | 10% of monthly fee |
| 90.0% - 94.99% | 25% of monthly fee |
| Below 90.0% | 50% of monthly fee |

---

## 2. Maintenance Windows

### 2.1 Planned Maintenance
- **Schedule:** Second Tuesday of each month, 02:00 - 06:00 CET
- **Notification:** Minimum 7 days advance notice
- **Duration:** Maximum 4 hours per month
- **Exclusion:** Not counted towards downtime

### 2.2 Emergency Maintenance
- **Notification:** As soon as reasonably possible
- **Duration:** Minimized to critical fixes only
- **Communication:** Real-time updates via status page

---

## 3. Response Times

### 3.1 Incident Priority Levels

| Priority | Definition | Response Time | Resolution Target |
|----------|------------|---------------|------------------|
| **Critical (P1)** | Complete service outage or data loss risk | 2 hours | 4 hours |
| **High (P2)** | Major feature unavailable, significant performance degradation | 4 hours | 8 hours |
| **Medium (P3)** | Minor feature issue, workaround available | 8 business hours | 2 business days |
| **Low (P4)** | Cosmetic issues, feature requests | 2 business days | 5 business days |

### 3.2 Business Hours
- **Standard Support:** Monday - Friday, 09:00 - 17:00 CET
- **Emergency Support:** 24/7 for Critical (P1) incidents
- **Holidays:** Dutch national holidays excluded

---

## 4. Performance Standards

### 4.1 Response Time
- **API Response:** 95% of requests < 500ms
- **Page Load:** 95% of pages < 3 seconds
- **File Upload:** 10MB file < 30 seconds

### 4.2 Concurrent Users
- **Minimum Supported:** 1,000 concurrent users
- **Performance Degradation:** < 10% with full load

### 4.3 Data Processing
- **Quiz Submission:** < 2 seconds
- **Certificate Generation:** < 10 seconds
- **Bulk Export (1000 users):** < 5 minutes

---

## 5. Security & Compliance

### 5.1 Security Measures
- **Encryption:** TLS 1.3 in transit, AES-256 at rest
- **Authentication:** JWT tokens with 24-hour expiration
- **MFA:** TOTP-based for admin/manager roles
- **Audit Logging:** All actions logged with 1-year retention

### 5.2 Compliance Standards
- **GDPR:** Full compliance with data protection regulations
- **Data Residency:** All data stored within EU (Frankfurt)
- **Backups:** Daily automated backups with 30-day retention
- **Disaster Recovery:** RTO 4 hours, RPO 1 hour

---

## 6. Support Services

### 6.1 Support Channels
- **Email:** info@shipdocs.app
- **Response Time:** Within 1 business day
- **Language:** English and Dutch

### 6.2 Included Support
- Technical issue resolution
- User access management
- Configuration assistance
- Security incident response

### 6.3 Additional Services
- Custom training: €500 per session
- Priority support: €2,000/month
- Dedicated account manager: Quote on request

---

## 7. Data Protection

### 7.1 Data Security
- **Hosting:** Vercel Pro (Frankfurt) + Supabase (Frankfurt)
- **Access Control:** Role-based with audit trails
- **Data Isolation:** Tenant data separation
- **Penetration Testing:** Annual third-party assessment

### 7.2 Data Portability
- **Export Formats:** JSON, CSV
- **Export Time:** < 24 hours for full data export
- **API Access:** RESTful API with OpenAPI documentation

### 7.3 Incident Response
- **Notification:** Within 48 hours of detection
- **Updates:** Every 24 hours during incident
- **Post-Mortem:** Within 5 business days

---

## 8. Service Monitoring

### 8.1 Monitoring Coverage
- **Uptime Monitoring:** 1-minute intervals
- **Performance Metrics:** Real-time dashboard
- **Security Monitoring:** 24/7 automated scanning
- **Capacity Planning:** Monthly reviews

### 8.2 Reporting
- **Monthly Reports:** Uptime, performance, incidents
- **Quarterly Reviews:** Service optimization
- **Annual Assessment:** Security and compliance audit

---

## 9. Limitations

### 9.1 Force Majeure
Service credits not applicable for:
- Natural disasters
- Government actions
- Internet backbone failures
- DDoS attacks exceeding mitigation capacity

### 9.2 Customer Responsibilities
- Maintain secure access credentials
- Reasonable use within licensed limits
- Timely reporting of issues
- Cooperation with troubleshooting

---

## 10. SLA Modifications

### 10.1 Change Process
- **Notice Period:** 30 days for SLA changes
- **Communication:** Email to designated contacts
- **Acceptance:** Continued use constitutes acceptance

### 10.2 Review Schedule
- **Quarterly:** Performance metric review
- **Annually:** Full SLA assessment and update

---

## Contact Information

**Service Provider:** Shipdocs  
**DPO/Security Contact:** M. Splinter  
**Email:** info@shipdocs.app  
**Emergency:** Available upon contract

---

## Appendix A: Definitions

**Downtime:** Period when service is unavailable or not meeting performance standards  
**Business Day:** Monday-Friday excluding Dutch national holidays  
**Incident:** Any event that impacts service availability or performance  
**Service Credit:** Reduction in monthly service fee as compensation  

---

## Appendix B: Measurement Tools

- **Uptime Monitoring:** Vercel Analytics + Custom monitoring
- **Performance Metrics:** Built-in application metrics
- **Incident Tracking:** Internal ticketing system
- **Customer Portal:** Real-time status dashboard

---

*This SLA is subject to the terms and conditions of the Master Service Agreement.*

---

## Service Provider Details

**Shipdocs**  
Middelweg 211  
1911 EE Uitgeest  
Nederland  

**Chamber of Commerce:** [KvK nummer]  
**VAT:** [BTW nummer]  

---

**Last Updated:** August 2025  
**Next Review:** November 2025  
**© 2025 Shipdocs - All rights reserved**