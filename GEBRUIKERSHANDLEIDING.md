# 👥 Gebruikershandleiding - Maritime Onboarding System

**Een eenvoudige gids voor het gebruik van het Maritime Onboarding System**

---

## 🎯 **Wat is het Maritime Onboarding System?**

Het Maritime Onboarding System is een digitaal platform voor:
- **Training van scheepsbemanningen**
- **Beheer van certificaten**
- **Voortgang bijhouden van trainingen**
- **Automatische workflows voor onboarding**

---

## 👤 **Gebruikersrollen**

### **🔧 Administrator (Admin)**
- Volledige toegang tot het systeem
- Kan managers aanmaken en beheren
- Kan trainingen en workflows instellen
- Kan rapporten genereren

### **👨‍💼 Manager**
- Kan trainingen beheren
- Kan gebruikers/crew aanmaken en beheren
- Kan voortgang van crew bekijken
- Kan certificaten goedkeuren
- Kan quizzen beoordelen

### **⚓ Crew (Bemanning)**
- Kan trainingen volgen
- Kan quizzen maken
- Kan eigen voortgang bekijken
- Kan certificaten downloaden
- kan zijn data exporteren en verwijderen

---

## 🚪 **Inloggen**

### **⚠️ BELANGRIJK: Er is GEEN registratie!**

Het systeem heeft **geen openbare registratie functie**. Accounts worden alleen aangemaakt door administrators en managers.

### **Inloggen als Administrator/Manager**
1. Ga naar http://localhost (of de URL die je hebt gekregen)
2. Selecteer **"Staff Login"** (voor admin/manager)
3. Vul je e-mailadres en wachtwoord in
4. Klik op **"Login"**
5. Als MFA is ingeschakeld, voer je 6-cijferige code in

### **Inloggen als Crew (Bemanning)**
1. Ga naar http://localhost
2. Selecteer **"Magic Link Login"** (voor crew)
3. Vul je e-mailadres in
4. Klik op **"Request Magic Link"**
5. Check je e-mail voor de magic link
6. Klik op de link in je e-mail om in te loggen

### **Standaard Admin Account (voor eerste gebruik)**
- **Email**: `admin@maritime-onboarding.local`
- **Wachtwoord**: `password`
- **⚠️ Wijzig dit wachtwoord direct na eerste login!**

---

## 🏠 **Dashboard Overzicht**

### **Admin Dashboard**
- **Gebruikersbeheer**: Overzicht van alle gebruikers
- **Trainingsoverzicht**: Alle actieve trainingen
- **Systeemstatistieken**: Gebruik en prestaties
- **Instellingen**: Systeemconfiguratie

### **Manager Dashboard**
- **Mijn Teams**: Overzicht van toegewezen crew
- **Trainingsvoortgang**: Status van alle trainingen
- **Te Beoordelen**: Quizzen die wachten op goedkeuring
- **Certificaten**: Uit te geven certificaten

### **Crew Dashboard**
- **Mijn Trainingen**: Actieve en voltooide trainingen
- **Voortgang**: Persoonlijke voortgang overzicht
- **Certificaten**: Behaalde certificaten
- **Agenda**: Komende trainingsactiviteiten

---

## 📚 **Trainingen Volgen (Voor Crew)**

### **Training Starten**
1. Ga naar **"Mijn Trainingen"**
2. Klik op een training om te starten
3. Lees de instructies zorgvuldig
4. Klik op **"Training Beginnen"**

### **Training Modules**
1. **Leesmateriaal**: Bestudeer de documenten
2. **Video's**: Bekijk instructievideo's
3. **Praktijkopdrachten**: Voer opdrachten uit
4. **Quiz**: Beantwoord vragen over het materiaal

### **Quiz Maken**
1. Lees elke vraag zorgvuldig
2. Selecteer het juiste antwoord
3. Gebruik **"Vorige"** en **"Volgende"** om te navigeren
4. Klik op **"Quiz Indienen"** als je klaar bent
5. Wacht op beoordeling door een manager

### **Voortgang Bekijken**
- **Groene vinkjes**: Voltooide onderdelen
- **Gele klok**: Bezig met onderdeel
- **Rode kruis**: Nog niet gestart
- **Percentage**: Totale voortgang van de training

---

## 👨‍💼 **Trainingen Beheren (Voor Managers)**

### **Crew Voortgang Bekijken**
1. Ga naar **"Mijn Teams"**
2. Selecteer een crew member
3. Bekijk hun trainingsvoortgang
4. Zie welke onderdelen voltooid zijn

### **Quizzen Beoordelen**
1. Ga naar **"Te Beoordelen"**
2. Klik op een quiz om te bekijken
3. Controleer de antwoorden
4. Geef feedback in het commentaarveld
5. Klik op **"Goedkeuren"** of **"Afwijzen"**

### **Certificaten Uitgeven**
1. Ga naar **"Certificaten"**
2. Selecteer een voltooide training
3. Controleer of alle vereisten zijn behaald
4. Klik op **"Certificaat Uitgeven"**
5. Het certificaat wordt automatisch gegenereerd

### **Nieuwe Training Toewijzen**
1. Ga naar **"Trainingen"**
2. Klik op **"Nieuwe Training Toewijzen"**
3. Selecteer de crew member(s)
4. Kies de training
5. Stel een deadline in
6. Klik op **"Toewijzen"**

---

## 🔧 **Systeem Beheren (Voor Admins)**

### **Gebruikers Beheren**
1. Ga naar het **Admin Dashboard**
2. **Nieuwe crew member toevoegen**:
   - Klik op **"Add New Crew"** of **"Crew toevoegen"**
   - Vul gegevens in:
     - E-mailadres
     - Voornaam en achternaam
     - Positie (bijv. "Deck Officer")
     - Vessel assignment
     - Verwachte boarding datum
     - Telefoonnummer
     - Taalvoorkeur
   - Klik op **"Create Crew Member"**
   - **Belangrijk**: Klik daarna op **"Send Magic Link"** om de crew member toegang te geven

### **⚠️ Trainingen zijn vooraf geconfigureerd**
Het systeem heeft een vaste training workflow met fasen:
- **Phase 1**: Safety Training
- **Phase 2**: Team Integration
- **Phase 3**: Operational Training
- **Phase 4**: Final Assessment

Deze kunnen alleen worden aangepast door de code te wijzigen, niet via de interface.

### **Systeeminstellingen**
1. Ga naar **"Instellingen"**
2. **E-mail configuratie**: SMTP instellingen
3. **Certificaat templates**: Upload nieuwe templates
4. **Backup instellingen**: Automatische backups
5. **Gebruikersrechten**: Standaard permissies

---

## 📄 **Certificaten**

### **Certificaat Downloaden (Crew)**
1. Ga naar **"Mijn Certificaten"**
2. Klik op het certificaat dat je wilt downloaden
3. Klik op **"Download PDF"**
4. Het certificaat wordt gedownload naar je computer

### **Certificaat Delen**
1. Download het certificaat
2. Upload naar je LinkedIn profiel
3. E-mail naar werkgevers
4. Print voor fysieke kopie

---

## 🆘 **Hulp & Ondersteuning**

### **Veelgestelde Vragen**

**Q: Ik kan niet inloggen, wat nu?**
A: Controleer je e-mailadres en wachtwoord. Gebruik "Wachtwoord vergeten?" als nodig.

**Q: Mijn quiz is afgekeurd, wat betekent dit?**
A: Lees de feedback van je manager en probeer de quiz opnieuw.

**Q: Waar vind ik mijn certificaten?**
A: Ga naar "Mijn Certificaten" in het hoofdmenu.

**Q: Hoe lang duurt een training?**
A: Dit verschilt per training. De geschatte tijd staat bij elke training vermeld.

### **Contact Opnemen**
- **E-mail**: info@shipdocs.app
- **Telefoon**: [Telefoonnummer invullen]
- **Help Desk**: Binnen het systeem via "Help" knop

### **Technische Problemen**
1. **Refresh de pagina** (F5 of Ctrl+R)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Probeer een andere browser** (Chrome, Firefox, Safari)
4. **Check je internetverbinding**
5. **Contact de IT-afdeling** als het probleem blijft

---

## 🔒 **Beveiliging & Privacy**

### **Wachtwoord Beveiliging**
- Gebruik een sterk wachtwoord (minimaal 8 karakters)
- Combineer letters, cijfers en symbolen
- Deel je wachtwoord nooit met anderen
- Wijzig je wachtwoord regelmatig

### **Gegevens Privacy**
- Je persoonlijke gegevens worden veilig opgeslagen
- Alleen geautoriseerde personen hebben toegang
- Gegevens worden gebruikt voor training doeleinden
- Je kunt je gegevens inzien en wijzigen

### **Uitloggen**
- Log altijd uit na gebruik
- Vooral op gedeelde computers
- Klik op je naam → "Uitloggen"

---

**🎉 Succes met het gebruik van het Maritime Onboarding System!**

Voor meer gedetailleerde informatie, zie de technische documentatie in de `docs/` map.
