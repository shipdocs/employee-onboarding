# Compliance Documentatie Index
## Maritime Onboarding System 2025

Dit document biedt een overzicht van alle compliance-gerelateerde documentatie.

---

## 📊 Compliance Status: 95%

### Actuele Compliance Documenten

#### 1. **Hoofdrapport - Leveranciers Compliance**
**Bestand:** `/docs/LEVERANCIERS_COMPLIANCE_RAPPORT.md`  
**Status:** ✅ Bijgewerkt Augustus 2025  
**Score:** 95% compliant  
**Inhoud:** Volledige analyse van compliance met Nederlandse informatieveiligheidsvereisten

#### 2. **SaaS Leveranciersovereenkomst**
**Bestand:** `/docs/templates/SAAS_LEVERANCIERSOVEREENKOMST.md`  
**Status:** ✅ Compleet met alle vereiste clausules  
**Gebruik:** Template voor nieuwe klanten  
**Highlights:**
- EU data residency (Frankfurt)
- 48-uur incident notificatie
- 90 dagen exit termijn
- DPO contact informatie

#### 3. **Service Level Agreement (SLA)**
**Bestand:** `/docs/SLA.md`  
**Status:** ✅ Formeel gepubliceerd  
**Garanties:**
- 99% uptime per maand
- Service credits bij downtime
- Response tijden per prioriteit
- Performance standaarden

#### 4. **Verwerkersovereenkomst (DPA)**
**Bestand:** `/docs/GDPR_DATA_PROCESSING_AGREEMENT.md`  
**Status:** ✅ AVG/GDPR compliant  
**Inhoud:**
- Rollen en verantwoordelijkheden
- Technische maatregelen
- Subverwerkers lijst
- Audit rechten

#### 5. **Privacy & Security Contacten**
**Bestand:** `/docs/PRIVACY_SECURITY_CONTACT.md`  
**Status:** ✅ Actueel  
**DPO:** M. Splinter (info@shipdocs.app)

#### 6. **Compliance Berekening**
**Bestand:** `/docs/COMPLIANCE_PERCENTAGE_CALCULATION.md`  
**Status:** ✅ Gedetailleerde uitleg  
**Inhoud:** Hoe de 95% score is berekend

---

## 🛠️ Technische Implementaties

### GDPR Compliance Tools

#### 1. **Access Report Service**
**Bestand:** `/lib/services/accessReportService.js`  
**API Endpoint:** `/api/privacy/access-report`  
**Functionaliteit:**
- GDPR Article 15 compliance
- On-demand toegangsrapporten
- JSON/CSV export formaten
- Audit trail van wie data heeft ingezien

#### 2. **Account Deletion Service**
**Bestand:** `/lib/services/accountDeletionService.js`  
**API Endpoint:** `/api/privacy/delete-account`  
**Functionaliteit:**
- GDPR Article 17 "Right to be forgotten"
- Volledige data verwijdering
- Deletion certificaat generatie
- Audit log anonimisatie

---

## 📈 Compliance Metrics

### Huidige Status (Augustus 2025)

| Component | Score | Status |
|-----------|-------|--------|
| **Algemene Beveiliging** | 98% | ✅ Uitstekend |
| **Cloud/SaaS Vereisten** | 92% | ✅ Uitstekend |
| **Exit Strategie** | 95% | ✅ Uitstekend |
| **Totaal** | **95%** | ✅ Volledig Compliant |

### Optionele Verbeteringen
1. Externe security audits (op aanvraag)
2. Uitgebreide SIEM integratie
3. Jaarlijkse penetration testing
4. Geautomatiseerde compliance dashboards

---

## 🔐 Security Features

### Geïmplementeerd
- ✅ Multi-Factor Authentication (TOTP)
- ✅ AES-256-GCM encryptie
- ✅ Row Level Security (RLS)
- ✅ Comprehensive audit logging
- ✅ Rate limiting
- ✅ JWT token blacklisting
- ✅ Content Security Policy (CSP)

### Infrastructure
- ✅ Vercel Pro (Frankfurt)
- ✅ Supabase (Frankfurt)
- ✅ EU data residency
- ✅ Daily backups
- ✅ Disaster recovery plan

---

## 📋 Checklist voor Nieuwe Klanten

Bij het onboarden van nieuwe klanten:

1. **Contract Setup**
   - [ ] Gebruik SaaS Leveranciersovereenkomst template
   - [ ] Vul klantspecifieke details in
   - [ ] Voeg Verwerkersovereenkomst toe als bijlage
   - [ ] Reference naar SLA document

2. **Compliance Verificatie**
   - [ ] Bevestig EU data residency vereisten
   - [ ] Deel DPO contact informatie
   - [ ] Demonstreer audit log functionaliteit
   - [ ] Toon data export mogelijkheden

3. **Security Briefing**
   - [ ] MFA setup voor admin/managers
   - [ ] Access control uitleg
   - [ ] Incident response procedure
   - [ ] Support kanalen

---

## 🚀 Deployment Compliance

### Environments
| Environment | Compliance | Database | Hosting |
|-------------|------------|----------|---------|
| Production | ✅ 95% | Frankfurt | Frankfurt |
| Preview | ✅ 95% | Frankfurt | Frankfurt |
| Testing | ⚠️ 85% | Shared | Frankfurt |

### Monitoring
- Vercel Analytics (performance)
- Supabase Dashboard (database)
- Custom audit logs (security)
- Uptime monitoring (SLA)

---

## 📞 Quick Contacts

**DPO/Security:** M. Splinter - info@shipdocs.app  
**Support:** support@shipdocs.app  
**Emergency:** Via contract  

**Business Hours:** Mon-Fri 09:00-17:00 CET  
**Languages:** Nederlands, English

---

## Bedrijfsgegevens

**Shipdocs**  
Middelweg 211  
1911 EE Uitgeest  
Nederland  

**Website:** www.shipdocs.app  
**Email:** info@shipdocs.app  
**DPO:** M. Splinter  

---

*Laatste update: Augustus 2025*  
*Volgende review: November 2025*  
*© 2025 Shipdocs - Alle rechten voorbehouden*