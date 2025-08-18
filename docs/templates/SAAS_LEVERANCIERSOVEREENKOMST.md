# Software-as-a-Service Leveranciersovereenkomst
## Maritime Onboarding System 2025

**DEZE OVEREENKOMST** wordt aangegaan op [DATUM]

**TUSSEN:**

**Shipdocs**
Gevestigd te Amsterdam, Nederland  
KvK-nummer: [KVK_NUMMER]  
Hierna te noemen: "Leverancier"

**EN:**

**[KLANT NAAM]**  
Gevestigd te [KLANT_ADRES]  
KvK-nummer: [KLANT_KVK]  
Hierna te noemen: "Afnemer"

---

## 1. DEFINITIES

1.1 **"Dienst"** betekent het Maritime Onboarding System 2025, een cloud-based platform voor maritieme crew onboarding en training management.

1.2 **"Data"** betekent alle informatie, documenten en gegevens die door Afnemer worden ingevoerd, opgeslagen of verwerkt via de Dienst.

1.3 **"Gebruikers"** betekent de geautoriseerde medewerkers van Afnemer die toegang hebben tot de Dienst.

1.4 **"DPO"** betekent de Data Protection Officer aangewezen door Leverancier.

---

## 2. DIENSTVERLENING

### 2.1 Omvang Dienstverlening
Leverancier verleent Afnemer toegang tot de Dienst omvattende:
- [ ] Training Management Module
- [ ] Quiz & Assessment Module  
- [ ] Certificate Generation
- [ ] Multi-Factor Authentication (MFA)
- [ ] Offline Synchronisatie
- [ ] Meertalige ondersteuning (NL/EN)

### 2.2 Gebruikerslicenties
- Aantal Admin gebruikers: [AANTAL]
- Aantal Manager gebruikers: [AANTAL]
- Aantal Crew gebruikers: [AANTAL]
- Totaal: [TOTAAL] gebruikers

### 2.3 Service Level Agreement (SLA)
- **Beschikbaarheid**: 99% uptime per kalendermaand
- **Geplande onderhoud**: Maximaal 4 uur per maand, buiten kantooruren
- **Response tijd incidenten**:
  - Critical: 2 uur
  - High: 4 uur  
  - Medium: 8 kantooruren
  - Low: 2 werkdagen

---

## 3. INFORMATIEBEVEILIGING

### 3.1 Algemene Beveiligingsvereisten

✅ **Data wordt gehost binnen de Europese Unie**
- Applicatie hosting: Vercel Pro - Frankfurt, Duitsland
- Database hosting: Supabase - Frankfurt, Duitsland
- Alle data blijft binnen de EU

✅ **Toegangsinzicht**
- Op aanvraag binnen 5 werkdagen inzicht in toegang tot data
- Audit logs beschikbaar via admin dashboard
- Exporteerbare toegangsrapporten

✅ **Data Retention**
- Data wordt niet langer bewaard dan operationeel/legaal noodzakelijk
- Automatische data cleanup volgens AVG vereisten
- Configureerbare retention periodes

✅ **Security Contact**
- Data Protection Officer: M. Splinter
- Email: info@shipdocs.app
- Responstijd: 24 uur voor eerste reactie

✅ **Data Encryptie**
- Transport: TLS 1.3
- Opslag: AES-256-GCM encryptie
- MFA secrets: Additionele applicatie-level encryptie

✅ **Incident Notificatie**
- Notificatie binnen 48 uur bij beveiligingsincidenten
- Directe escalatie bij critical incidents
- Regelmatige updates tijdens incident resolution

✅ **Auditrecht**
- Afnemer heeft recht op security audit 1x per jaar door een samen te bepalen onafhankelijk partij
- Audit rapporten op aanvraag beschikbaar

### 3.2 Cloud/SaaS-specifieke Vereisten

✅ **ISO 27001 Compliance**
- Technische controls geïmplementeerd volgens ISO 27001
- Formele certificatie niet geplanned
- Jaarlijkse security assessments

✅ **Multi-Factor Authenticatie**
- TOTP-based MFA voor alle gebruikersrollen
- Verplicht voor Admin en Manager rollen
- Optioneel (aanbevolen) voor Crew rollen
- Backup codes voor account recovery

✅ **Logging & Auditing**
- Alle acties worden gelogd met timestamp en user ID
- Audit trails minimaal 1 jaar bewaard
- Exporteerbaar in CSV/JSON formaat
- Real-time monitoring dashboard

---

## 4. GEGEVENSVERWERKING

### 4.1 AVG/GDPR Compliance
- Leverancier treedt op als Verwerker
- Afnemer is Verwerkingsverantwoordelijke
- Separaat Verwerkersovereenkomst van toepassing

### 4.2 Data Categorieën
Afnemer mag uitsluitend de volgende data verwerken:
- Personeelsgegevens (naam, email, functie)
- Training voortgang en resultaten
- Certificaat informatie
- Geen bijzondere persoonsgegevens zonder voorafgaande toestemming

### 4.3 Sub-verwerkers
Leverancier maakt gebruik van:
- Vercel (hosting)
- Supabase (database)
- MailerSend (email)
Wijzigingen worden 30 dagen vooraf gemeld

---

## 5. EXIT STRATEGIE

### 5.1 Data Export
✅ **Volledige data export beschikbaar**
- JSON en CSV formaten
- Bulk export tot 1000 gebruikers
- Inclusief alle training data, certificaten, audit logs

### 5.2 Contractbeëindiging
- Opzegtermijn: 90 dagen
- Data beschikbaar tot 30 dagen na beëindiging
- Ondersteuning tijdens transitie: 14 dagen

### 5.3 Data Verwijdering
- Volledige data verwijdering na transitieperiode
- Verklaring van vernietiging op aanvraag
- Audit log van deletion proces

### 5.4 Exit Kosten
- Eerste volledige export: Gratis
- Additionele exports: €500 per export
- Transitie ondersteuning: €150 per uur

---

## 6. FINANCIËLE VOORWAARDEN

### 6.1 Tarieven
- Maandelijkse licentiekosten: €[BEDRAG]
- Setup kosten (eenmalig): €[BEDRAG]
- Training (optioneel): €[BEDRAG] per sessie

### 6.2 Facturatie
- Facturatie: [Maandelijks/Jaarlijks] vooruit
- Betalingstermijn: 30 dagen
- Automatische incasso mogelijk

### 6.3 Prijsindexatie
- Jaarlijkse indexatie volgens CBS index
- Maximaal 5% per jaar
- 60 dagen vooraf aangekondigd

---

## 7. AANSPRAKELIJKHEID

### 7.1 Beperking Aansprakelijkheid
- Maximaal het jaarbedrag van de overeenkomst
- Geen aansprakelijkheid voor indirecte schade
- Uitsluiting niet bij opzet of grove schuld

### 7.2 Vrijwaring
- Afnemer vrijwaart voor claims derden
- Leverancier vrijwaart voor IP-inbreuken

---

## 8. DUUR EN BEËINDIGING

### 8.1 Looptijd
- Ingangsdatum: [DATUM]
- Initiële looptijd: [1/2/3] jaar
- Automatische verlenging: [Ja/Nee]

### 8.2 Opzegging
- Schriftelijk met 90 dagen opzegtermijn
- Per aangetekende brief of email met ontvangstbevestiging
- Geen opzegging tijdens initiële looptijd

### 8.3 Ontbinding
- Bij materiële tekortkoming
- Na schriftelijke ingebrekestelling
- 30 dagen hersteltermijn

---

## 9. SLOTBEPALINGEN

### 9.1 Geheimhouding
- Wederzijdse geheimhouding
- Geldt tijdens en 3 jaar na overeenkomst
- Gebruikelijke uitzonderingen van toepassing

### 9.2 Wijzigingen
- Alleen schriftelijk en door beide partijen ondertekend
- Service updates met 30 dagen vooraf kennisgeving
- Recht op beëindiging bij materiële nadelige wijzigingen

### 9.3 Toepasselijk Recht
- Nederlands recht van toepassing
- Geschillen voorleggen aan rechtbank Amsterdam
- Eerst minnelijke oplossing proberen

---

## ONDERTEKENING

**Leverancier:**

Naam: _______________________  
Functie: _____________________  
Datum: ______________________  
Handtekening:


**Afnemer:**

Naam: _______________________  
Functie: _____________________  
Datum: ______________________  
Handtekening:

---

## BIJLAGEN

**Bijlage A**: Verwerkersovereenkomst  
**Bijlage B**: Service Level Agreement Details  
**Bijlage C**: Technische Specificaties  
**Bijlage D**: Prijslijst en Modules  

---

*Versie 1.0 - Augustus 2025*
