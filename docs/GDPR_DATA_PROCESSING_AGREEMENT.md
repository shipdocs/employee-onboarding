# Verwerkersovereenkomst (Data Processing Agreement)
## Maritime Onboarding System 2025

**Deze Verwerkersovereenkomst** ("Overeenkomst") vormt een integraal onderdeel van de Hoofdovereenkomst tussen:

**Verwerkingsverantwoordelijke:** [KLANT NAAM]  
**Verwerker:** Shipdocs

---

## Artikel 1 - Definities

1.1 Termen in deze Overeenkomst hebben dezelfde betekenis als in de AVG (Algemene Verordening Gegevensbescherming) tenzij anders gedefinieerd.

1.2 **"Persoonsgegevens"**: Alle informatie over geïdentificeerde of identificeerbare natuurlijke personen die via de Dienst worden verwerkt.

1.3 **"Datalek"**: Een inbreuk op de beveiliging die leidt tot vernietiging, verlies, wijziging of ongeoorloofde verstrekking van Persoonsgegevens.

---

## Artikel 2 - Onderwerp en Duur

2.1 **Onderwerp van verwerking:**
- Training en onboarding data van maritiem personeel
- Gebruikersaccounts en authenticatiegegevens
- Quiz resultaten en certificaten
- Audit logs en toegangsrapportages

2.2 **Categorieën betrokkenen:**
- Crew members (bemanningsleden)
- Managers
- Administrators

2.3 **Categorieën persoonsgegevens:**
- NAW-gegevens (naam, email)
- Functie en werkgever informatie
- Training voortgang en resultaten
- Login gegevens en MFA settings
- IP-adressen en apparaat informatie

2.4 **Duur:** Gelijk aan de hoofdovereenkomst

---

## Artikel 3 - Verplichtingen Verwerker

3.1 **Verwerker zal:**
- Persoonsgegevens uitsluitend verwerken op basis van schriftelijke instructies
- Waarborgen dat personen die toegang hebben tot de gegevens gebonden zijn aan geheimhouding
- Alle passende technische en organisatorische maatregelen treffen (Artikel 32 AVG)
- Geen subverwerkers inschakelen zonder voorafgaande schriftelijke toestemming
- Bijstand verlenen bij verzoeken van betrokkenen
- Meewerken aan audits en inspecties

3.2 **Technische en Organisatorische Maatregelen:**
- **Encryptie:** TLS 1.3 in transit, AES-256-GCM at rest
- **Toegangscontrole:** Role-Based Access Control (RBAC)
- **Authenticatie:** Multi-Factor Authentication (MFA)
- **Logging:** Comprehensive audit trails
- **Backup:** Dagelijkse backups met 30 dagen retentie
- **Incident Response:** 48-uur notificatie bij datalekken

---

## Artikel 4 - Subverwerkers

4.1 **Goedgekeurde subverwerkers:**
| Subverwerker | Dienst | Locatie | Doel |
|--------------|--------|---------|------|
| Vercel Inc. | Hosting | Frankfurt, DE | Applicatie hosting |
| Supabase Inc. | Database | Frankfurt, DE | Data opslag |
| MailerSend | Email | EU | Transactionele emails |

4.2 Verwerker informeert Verwerkingsverantwoordelijke 30 dagen vooraf over wijzigingen in subverwerkers.

4.3 Verwerkingsverantwoordelijke heeft 14 dagen om bezwaar te maken tegen nieuwe subverwerkers.

---

## Artikel 5 - Internationale Doorgifte

5.1 Alle persoonsgegevens blijven binnen de Europese Economische Ruimte (EER).

5.2 Geen doorgifte naar derde landen zonder:
- Adequaatheidsbesluit van de Europese Commissie, of
- Passende waarborgen (Standard Contractual Clauses)

---

## Artikel 6 - Rechten van Betrokkenen

6.1 **Verwerker biedt ondersteuning bij:**
- Inzageverzoeken (via AccessReportService)
- Rectificatie en wissing (via admin dashboard)
- Dataportabiliteit (JSON/CSV export)
- Recht van bezwaar
- Geautomatiseerde besluitvorming (n.v.t.)

6.2 **Response tijd:** Binnen 5 werkdagen na ontvangst verzoek

---

## Artikel 7 - Datalekken

7.1 **Notificatie:** Binnen 48 uur na ontdekking

7.2 **Informatie bij melding:**
- Aard van het datalek
- Categorieën en aantal betrokkenen
- Waarschijnlijke gevolgen
- Genomen/voorgestelde maatregelen

7.3 **Documentatie:** Alle datalekken worden gedocumenteerd

---

## Artikel 8 - Audit en Controle

8.1 Verwerkingsverantwoordelijke heeft recht op:
- Jaarlijkse security audit
- Inzage in compliance rapporten
- Toegang tot audit logs via dashboard

8.2 Audits worden uitgevoerd:
- Met 30 dagen vooraankondiging
- Maximaal 1x per jaar (tenzij incident)
- Op kosten van Verwerkingsverantwoordelijke

---

## Artikel 9 - Beëindiging en Verwijdering

9.1 **Bij beëindiging:**
- Alle persoonsgegevens retourneren of vernietigen
- Binnen 30 dagen na beëindiging
- Schriftelijke verklaring van vernietiging

9.2 **Uitzonderingen:**
- Wettelijke bewaartermijnen
- Geanonimiseerde audit logs

---

## Artikel 10 - Aansprakelijkheid

10.1 Verwerker is aansprakelijk voor schade veroorzaakt door:
- Niet-nakoming van AVG verplichtingen
- Handelen buiten of in strijd met instructies

10.2 Aansprakelijkheid beperkt tot hoofdovereenkomst bepalingen

---

## Artikel 11 - Contact Gegevensbescherming

**Data Protection Officer (DPO):**  
M. Splinter  
Email: info@shipdocs.app  
Telefoon: Op aanvraag

**Privacy Contact:**  
Shipdocs
Amsterdam, Nederland  
privacy@shipdocs.app

---

## BIJLAGE A - Technische en Organisatorische Maatregelen

### A.1 Fysieke Beveiliging
- Datacenters Vercel/Supabase met ISO 27001 certificatie
- 24/7 bewaking en toegangscontrole
- Redundante stroomvoorziening

### A.2 Logische Toegangsbeveiliging
- Unieke gebruikersaccounts
- Sterke wachtwoordvereisten
- MFA voor privileged accounts
- Automatische sessie timeout

### A.3 Data Beveiliging
- Encryptie in rust: AES-256-GCM
- Encryptie in transit: TLS 1.3
- Key management via secure vault
- Data segregatie per tenant

### A.4 Incident Management
- 24/7 monitoring
- Incident response team
- Gedocumenteerde procedures
- Regelmatige DR tests

### A.5 Business Continuity
- RPO: 1 uur
- RTO: 4 uur
- Dagelijkse backups
- Geografisch gescheiden replica's

---

## BIJLAGE B - Verwerkingenregister

| Verwerkingsactiviteit | Rechtsgrond | Bewaartermijn | Ontvangers |
|---------------------|-------------|---------------|------------|
| Account registratie | Overeenkomst | Duur contract + 2 jaar | Geen |
| Training tracking | Overeenkomst | 7 jaar (wettelijk) | Certificerende instanties |
| Quiz resultaten | Overeenkomst | 5 jaar | Managers, Admin |
| Certificaten | Wettelijke verplichting | 10 jaar | Toezichthouders |
| Audit logs | Gerechtvaardigd belang | 1 jaar | Security team |
| Support tickets | Overeenkomst | 2 jaar | Support team |

---

**Datum:** _____________

**Namens Verwerkingsverantwoordelijke:**  
Naam: _______________________  
Functie: ____________________  
Handtekening: _______________

**Namens Verwerker:**  
Naam: _______________________  
Functie: ____________________  
Handtekening: _______________

---

*Versie 1.0 - Augustus 2025*  
*Deze overeenkomst voldoet aan alle vereisten van de AVG/GDPR*