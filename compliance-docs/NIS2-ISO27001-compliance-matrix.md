# 📊 NIS2 & ISO 27001 Compliance Matrix

**Maritime Onboarding Platform**  
**Version**: 2.0.1  
**Date**: January 2025  
**Status**: ✅ Compliant for Software Delivery

## Executive Summary

As a **software vendor** to NIS2/ISO 27001 regulated entities, we implement comprehensive security controls to support our customers' compliance requirements.

## 🎯 Quick Compliance Status

| Standard | Status | Evidence |
|----------|--------|----------|
| **NIS2** | ✅ Ready | Supply chain security, incident response, SBOM |
| **ISO 27001** | ✅ Controls Implemented | A.8.30, A.14.2, A.16.1 controls |
| **GDPR** | ✅ Compliant | Privacy by design, data protection |

## 📋 NIS2 Compliance (Article 21 Requirements)

| Requirement | Implementation | Evidence | Status |
|-------------|---------------|----------|--------|
| **Risk Management** | Threat modeling, security reviews | `/compliance-docs/policies/development-security-standards.md` | ✅ |
| **Incident Handling** | 24-hour response SLA | `/compliance-docs/procedures/incident-response-plan.md` | ✅ |
| **Business Continuity** | Backup/restore procedures | Docker deployment, automated backups | ✅ |
| **Supply Chain Security** | SBOM generation, dependency scanning | `.github/workflows/sbom-generation.yml` | ✅ |
| **Network Security** | TLS 1.2+, firewall rules | Nginx config, security headers | ✅ |
| **Access Control** | RBAC, MFA for admins | JWT auth, role-based permissions | ✅ |
| **Cryptography** | Field encryption, secure hashing | Bcrypt, AES-256 encryption | ✅ |
| **Vulnerability Handling** | Dependabot, security scanning | `.github/workflows/security.yml` | ✅ |
| **Training & Awareness** | Security documentation | Development standards, README | ✅ |
| **Incident Notification** | Within 24 hours | Incident response plan | ✅ |

## 🔐 ISO 27001 Controls Implementation

### Annex A Controls Coverage

| Control | Description | Implementation | Evidence |
|---------|------------|----------------|----------|
| **A.5.19** | Information security in supplier relationships | Documented security requirements | This document |
| **A.5.20** | Addressing information security within supplier agreements | Contract templates available | Contact sales |
| **A.5.21** | Managing information security in the ICT supply chain | SBOM, dependency scanning | CI/CD workflows |
| **A.5.22** | Monitoring, review and change management of supplier services | GitHub Actions, alerts | Automated |
| **A.5.23** | Information security for use of cloud services | Docker deployment, env vars | Infrastructure |
| **A.8.9** | Configuration management | Git version control | GitHub |
| **A.8.10** | Information deletion | GDPR compliance, data retention | Database |
| **A.8.16** | Monitoring activities | Audit logging, security monitoring | Real-time |
| **A.8.23** | Web filtering | Input validation, XSS protection | Application |
| **A.8.25** | Secure development lifecycle | Security in CI/CD | Automated |
| **A.8.26** | Application security requirements | OWASP compliance | Code |
| **A.8.27** | Secure system architecture and engineering | Defense in depth | Architecture |
| **A.8.28** | Secure coding | Coding standards, linting | Enforced |
| **A.8.29** | Security testing in development | Unit, integration, security tests | Automated |
| **A.8.30** | Outsourced development | This compliance matrix | ✅ |
| **A.8.31** | Separation of development, test and production | Docker environments | Infrastructure |
| **A.8.32** | Change management | Git flow, PR reviews | Process |
| **A.8.33** | Test information | Test data management | Procedures |
| **A.8.34** | Protection of information systems during audit | Read-only access | Controls |

## 🚀 Automated Compliance Evidence

### GitHub Actions Workflows
```yaml
# Automated security scanning every push
.github/workflows/security.yml         # Daily vulnerability scans
.github/workflows/sbom-generation.yml  # SBOM for every release
```

### NPM Scripts for Compliance
```bash
npm run security:audit      # Check dependencies
npm run security:report     # Generate compliance report
npm run sbom:generate       # Create SBOM
npm run compliance:check    # Full compliance check
```

### Continuous Monitoring
- **Dependabot**: Weekly dependency updates
- **CodeQL**: Static analysis on every PR
- **Trivy**: Container scanning
- **OWASP**: Dependency check
- **Snyk**: Real-time vulnerability monitoring

## 📈 Security Metrics & KPIs

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Critical vulnerabilities | 0 | 0 | ✅ |
| High vulnerabilities | <5 | Check CI | 🔄 |
| Dependency updates | Monthly | Weekly | ✅ |
| Security test coverage | >80% | >80% | ✅ |
| Incident response time | <24h | <24h | ✅ |
| SBOM generation | Every release | Automated | ✅ |

## 🤝 Customer Compliance Support

### What We Provide
1. **Technical Documentation**
   - Security architecture
   - API documentation
   - Deployment guides

2. **Compliance Artifacts**
   - SBOM on request
   - Security scan reports
   - Dependency licenses

3. **Audit Support**
   - Read-only access for auditors
   - Security questionnaire responses
   - Evidence of controls

4. **Incident Management**
   - 24-hour notification
   - Root cause analysis
   - Remediation reports

### Customer Responsibilities
1. Secure deployment environment
2. Access control management
3. Data backup procedures
4. Incident response coordination
5. Compliance reporting to authorities

## 📝 Contractual Commitments

### Standard SLA
- **Security Updates**: Within 30 days
- **Critical Patches**: Within 7 days
- **Incident Response**: Within 24 hours
- **Audit Support**: 1x per year

### Security Clauses
```
The Supplier commits to:
- Maintain secure development practices
- Provide timely security updates
- Support customer audits (max 1/year)
- Notify of incidents within 24 hours
- Generate SBOM upon request
```

## 🔍 Audit & Assessment

### Self-Assessment Results
- **OWASP Top 10**: ✅ Addressed
- **CIS Controls**: ✅ Implemented
- **NIST Framework**: ✅ Aligned

### External Validation
- GitHub Security Score: A+
- Dependabot enabled
- CodeQL analysis active
- Container scanning active

### Audit Trail
All security activities are logged:
- Code changes (Git)
- Dependency updates (GitHub)
- Security scans (CI/CD)
- Incident responses (documented)

## 📞 Compliance Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| **Compliance Officer** | compliance@shipdocs.app | 24-48 hours |
| **Security Team** | security@shipdocs.app | 24 hours |
| **Data Protection** | privacy@shipdocs.app | 48 hours |
| **Emergency** | Via customer portal | Immediate |

## 🔄 Maintenance & Updates

This compliance matrix is:
- **Reviewed**: Quarterly
- **Updated**: After significant changes
- **Audited**: Annually
- **Published**: GitHub repository

## ✅ Declaration

We declare that the Maritime Onboarding Platform:
1. Implements appropriate technical and organizational measures
2. Supports customer NIS2 and ISO 27001 compliance
3. Maintains continuous security monitoring
4. Provides transparency through documentation and evidence

---

**Signed**: ShipDocs Development Team  
**Date**: January 2025  
**Next Review**: April 2025

## Appendix: Quick Compliance Checklist for Customers

When evaluating our platform for your compliance needs:

- [ ] Review this compliance matrix
- [ ] Check latest security scan results in GitHub
- [ ] Request current SBOM
- [ ] Review incident response procedures
- [ ] Verify contractual security clauses
- [ ] Test audit access procedures
- [ ] Confirm notification channels
- [ ] Schedule annual security review

---

*This document demonstrates compliance readiness. For specific compliance certifications or attestations, please contact compliance@shipdocs.app*