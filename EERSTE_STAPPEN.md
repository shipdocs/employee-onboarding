# 🚀 Eerste Stappen - Maritime Onboarding System

**Een realistische gids voor je eerste gebruik van het systeem**

---

## ✅ **Systeem Status**

Dit is een **volledig werkend maritime onboarding systeem** dat direct gebruikt kan worden na Docker setup.

### **Wat dit systeem IS:**
- Een complete maritime training en onboarding applicatie
- Volledig werkende database met admin accounts
- 4-fase training workflow systeem
- User management voor admin, manager en crew rollen
- Quiz en certificaat systeem

### **Wat je nodig hebt:**
- Docker Desktop geïnstalleerd
- Basis kennis van Docker commando's
- 10-15 minuten voor eerste setup

---

## 🎯 **Stap 1: Systeem Opstarten**

### **Zorg dat het systeem draait**
```bash
# In de project directory
docker compose up -d

# Controleer of alles draait
docker ps
```

### **Toegang tot de applicatie**
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Database Admin**: http://localhost:5050

---

## 🔐 **Stap 2: Eerste Login**

### **Gebruik de standaard admin account**
1. Ga naar http://localhost
2. Selecteer **"Staff Login"**
3. Vul in:
   - **Email**: `admin@maritime-onboarding.local`
   - **Wachtwoord**: `password`
4. Klik op **"Login"**

**Alternatieve admin account:**
- **Email**: `test@maritime.com`
- **Wachtwoord**: `password`

### **⚠️ Wijzig direct het wachtwoord!**
1. Ga naar je profiel (klik op je naam rechtsboven)
2. Wijzig het standaard wachtwoord naar iets veiligs

---

## 👥 **Stap 3: Je Eerste Crew Member Toevoegen**

### **Via het Admin Dashboard**
1. Je bent nu in het Admin Dashboard
2. Zoek naar **"Add New Crew"** of een vergelijkbare knop
3. Vul de crew member gegevens in:
   ```
   Email: test.crew@example.com
   Voornaam: Test
   Achternaam: Crew
   Positie: Deck Officer
   Vessel Assignment: Training Vessel
   Expected Boarding Date: [Kies een datum]
   Telefoonnummer: +31612345678
   Taalvoorkeur: English of Nederlands
   ```
4. Klik op **"Create Crew Member"**

### **Magic Link Versturen**
1. **Belangrijk**: Na het aanmaken, klik op **"Send Magic Link"**
2. Dit genereert een login link voor de crew member
3. **Probleem**: E-mails werken waarschijnlijk niet zonder SMTP configuratie

---

## 📧 **Stap 4: E-mail Configuratie (Optioneel maar Belangrijk)**

### **Waarom e-mails belangrijk zijn**
- Crew members loggen in via "magic links" die per e-mail worden verstuurd
- Zonder werkende e-mail kunnen crew members niet inloggen

### **E-mail Testen**
1. Ga naar http://localhost:8025 (MailHog - lokale e-mail testing)
2. Hier zie je alle e-mails die het systeem probeert te versturen
3. Als je een magic link hebt verstuurd, zie je deze hier

### **Magic Link Handmatig Gebruiken**
1. Ga naar MailHog (http://localhost:8025)
2. Zoek de magic link e-mail
3. Kopieer de link uit de e-mail
4. Open deze link in een nieuwe browser tab
5. Je wordt automatisch ingelogd als de crew member

---

## 🎓 **Stap 5: Training Workflow Testen**

### **Als Crew Member**
1. Log in via de magic link
2. Je ziet het **Crew Dashboard**
3. Er zijn 4 training fasen:
   - **Phase 1**: Safety Training
   - **Phase 2**: Team Integration
   - **Phase 3**: Operational Training
   - **Phase 4**: Final Assessment

### **Training Fase Starten**
1. Klik op een training fase
2. Lees het trainingsmateriaal
3. Maak de quiz
4. Wacht op goedkeuring van een manager

### **✅ Training Content**
- De training content is volledig geïmplementeerd voor 4 fasen
- Quizzen hebben werkende vragen en antwoorden
- Content kan aangepast worden aan jouw specifieke behoeften

---

## 👨‍💼 **Stap 6: Manager Functionaliteit Testen**

### **Manager Account Aanmaken**
1. Log in als admin
2. Maak een nieuwe gebruiker aan met rol "manager"
3. Geef deze manager een wachtwoord (via database of code aanpassing)

### **Als Manager Inloggen**
1. Gebruik "Staff Login" met manager credentials
2. Je ziet het **Manager Dashboard**
3. Je kunt:
   - Crew voortgang bekijken
   - Quizzen beoordelen
   - Certificaten goedkeuren

---

## 🔧 **Stap 7: Wat Je Kunt Aanpassen**

### **Via de Interface (Beperkt)**
- Crew member gegevens
- Quiz beoordelingen
- Certificaat goedkeuringen
- Gebruiker profielen

### **Via Code Aanpassingen (Uitgebreid)**
- Training content en materialen
- Quiz vragen en antwoorden
- E-mail templates
- Certificaat templates
- Workflow stappen
- UI teksten en vertalingen

---

## 🚨 **Veelvoorkomende Problemen**

### **"Ik kan niet inloggen"**
- Controleer of je de juiste login methode gebruikt:
  - **Admin/Manager**: Staff Login met email/wachtwoord
  - **Crew**: Magic Link Login via e-mail

### **"Magic links werken niet"**
- Check MailHog: http://localhost:8025
- Kopieer de link handmatig uit MailHog
- Configureer echte SMTP voor productie gebruik

### **"Er is geen content in de trainingen"**
- Dit is normaal - het systeem heeft placeholder content
- Je moet zelf training materialen toevoegen via code aanpassingen

### **"Ik zie geen registratie knop"**
- Correct - er is geen openbare registratie
- Alleen admins kunnen nieuwe gebruikers aanmaken

### **"De interface is in het Engels"**
- Het systeem ondersteunt meerdere talen
- Wijzig je taalvoorkeur in je profiel
- Nederlandse vertalingen zijn gedeeltelijk beschikbaar

---

## 📋 **Realistische Verwachtingen**

### **Wat werkt direct:**
- ✅ Complete login systeem (admin, manager, crew)
- ✅ User management met werkende admin accounts
- ✅ 4-fase training workflow volledig geïmplementeerd
- ✅ Quiz systeem met vragen en beoordeling
- ✅ Dashboard interfaces voor alle rollen
- ✅ Magic link authenticatie voor crew
- ✅ Certificate generation (PDF)
- ✅ Email systeem (lokaal via MailHog)
- ✅ Progress tracking en reporting

### **Wat je kunt aanpassen:**
- ⚙️ Training content aan jouw specifieke behoeften
- ⚙️ Quiz vragen en antwoorden
- ⚙️ E-mail configuratie (SMTP voor productie)
- ⚙️ Certificaat templates en branding
- ⚙️ User interface styling
- ⚙️ Workflow stappen en processen

---

## 🎯 **Volgende Stappen voor Echte Implementatie**

### **Voor Developers**
1. **Content Management**: Voeg echte training materialen toe
2. **Quiz System**: Configureer relevante vragen
3. **Email Setup**: Configureer SMTP voor productie
4. **Customization**: Pas UI en workflows aan
5. **Deployment**: Setup productie omgeving

### **Voor Business Users**
1. **Requirement Analysis**: Definieer exacte training behoeften
2. **Content Creation**: Ontwikkel training materialen
3. **Process Design**: Ontwerp specifieke workflows
4. **User Training**: Train administrators en managers
5. **Pilot Testing**: Test met kleine groep gebruikers

---

## 📞 **Hulp Nodig?**

### **Technische Ondersteuning**
- **GitHub Issues**: Voor bugs en feature requests
- **Documentation**: Zie `docs/` folder voor technische details
- **Code Review**: Bekijk de source code voor implementatie details

### **Business Implementatie**
- **Professional Services**: Overweeg professionele implementatie
- **Custom Development**: Voor specifieke aanpassingen
- **Training Services**: Voor gebruiker training

---

**🎉 Je hebt nu een realistisch beeld van wat het Maritime Onboarding System kan en wat het vereist voor echte implementatie!**
