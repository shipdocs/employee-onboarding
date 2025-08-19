# 🚢 Maritime Onboarding System - Installatie Gids

**Stap-voor-stap installatie van het Maritime Onboarding System voor lokale ontwikkeling en testing.**

---

## 📋 **Wat heb je nodig?**

### **Computer Vereisten**
- **Besturingssysteem**: Windows 10/11, macOS, of Linux
- **Geheugen (RAM)**: Minimaal 8GB
- **Schijfruimte**: Minimaal 10GB vrije ruimte
- **Internet**: Stabiele internetverbinding

### **Software die je moet installeren**
1. **Docker Desktop** (gratis)
2. **Git** (gratis)
3. **Een teksteditor** zoals Notepad++ of Visual Studio Code (gratis)

---

## 🔧 **Stap 1: Software Installeren**

### **Docker Installeren**

#### **Voor Development/Testing (lokaal)**
1. **Docker Desktop** (Windows/Mac):
   - Ga naar: https://www.docker.com/products/docker-desktop/
   - Alleen voor lokale development en testing

#### **Voor Productie/Server gebruik**
1. **Linux Server** (aanbevolen):
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo systemctl enable docker
   ```

2. **Cloud Platforms**:
   - **DigitalOcean Droplet** met Docker
   - **AWS EC2** met Docker Engine
   - **Google Cloud VM** met Container-Optimized OS
   - **Hetzner Cloud** server

### **Git Installeren**
1. Ga naar: https://git-scm.com/downloads
2. Download Git voor jouw besturingssysteem
3. Installeer met standaard instellingen

---

## 📥 **Stap 2: Het Systeem Downloaden**

### **Windows Gebruikers**
1. Open **Command Prompt** (zoek naar "cmd" in het startmenu)
2. Typ deze commando's (druk Enter na elke regel):
```
cd Desktop
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
```

### **Mac/Linux Gebruikers**
1. Open **Terminal**
2. Typ deze commando's:
```
cd Desktop
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
```

---

## ⚙️ **Stap 3: Configuratie**

### **Configuratiebestand Maken**
1. In de `employee-onboarding` map, zoek het bestand `.env.example`
2. Kopieer dit bestand en hernoem de kopie naar `.env`
3. Open `.env` met een teksteditor

### **Belangrijke Instellingen Aanpassen**
Zoek deze regels in het `.env` bestand en pas ze aan:

```bash
# Database wachtwoord (verzin een sterk wachtwoord)
POSTGRES_PASSWORD=jouw_sterke_wachtwoord_hier

# JWT geheimen (gebruik een wachtwoordgenerator)
JWT_SECRET=een_lange_willekeurige_tekst_hier
NEXTAUTH_SECRET=nog_een_lange_willekeurige_tekst_hier

# MinIO wachtwoord (voor bestandsopslag)
MINIO_ROOT_PASSWORD=nog_een_sterk_wachtwoord

# Email instellingen (optioneel voor nu)
SMTP_HOST=smtp.gmail.com
SMTP_USER=jouw_email@gmail.com
SMTP_PASS=jouw_email_wachtwoord
```

**💡 Tip**: Gebruik een wachtwoordgenerator zoals https://passwordsgenerator.net/ voor sterke wachtwoorden.

---

## 🚀 **Stap 4: Het Systeem Starten**

### **Eerste Keer Opstarten**
1. Zorg dat Docker Desktop draait
2. Open Command Prompt/Terminal in de `employee-onboarding` map
3. Typ dit commando:
```
docker compose up -d
```

### **Wachten op Installatie**
- Dit kan 5-15 minuten duren (afhankelijk van je internetsnelheid)
- Docker downloadt alle benodigde onderdelen automatisch
- Je ziet verschillende berichten voorbijkomen - dit is normaal

### **Controleren of het werkt**
1. Open je webbrowser
2. Ga naar: http://localhost
3. Je zou de Maritime Onboarding System homepage moeten zien

---

## 🎯 **Stap 5: Eerste Gebruik**

### **Toegang tot het Systeem**
- **Hoofdapplicatie**: http://localhost
- **Database beheer**: http://localhost:5050
- **Email testing**: http://localhost:8025
- **Bestandsopslag**: http://localhost:9001

### **✅ Login met standaard admin account**

Het systeem heeft werkende admin accounts:

#### **Hoofd Admin Account**
- **Email**: `admin@maritime-onboarding.local`
- **Wachtwoord**: `password`
- **Rol**: System Administrator

#### **Test Admin Account**
- **Email**: `test@maritime.com`
- **Wachtwoord**: `password`
- **Rol**: Administrator

#### **Hoe in te loggen:**
1. Ga naar http://localhost
2. Klik op **"Staff Login"** (voor admin/manager)
3. Gebruik een van bovenstaande accounts
4. Wijzig het wachtwoord na eerste login

---

## 🛠️ **Dagelijks Gebruik**

### **Systeem Starten**
```
cd Desktop/employee-onboarding
docker compose up -d
```

### **Systeem Stoppen**
```
cd Desktop/employee-onboarding
docker compose down
```

### **Status Controleren**
```
docker ps
```

---

## 🆘 **Hulp Nodig?**

### **Veelvoorkomende Problemen**

**"Docker is niet gevonden"**
- Zorg dat Docker Desktop draait
- Herstart je computer na Docker installatie

**"Poort 80 is al in gebruik"**
- Stop andere webservers (Apache, IIS, etc.)
- Of wijzig de poort in docker-compose.yml

**"Kan niet verbinden met database"**
- Wacht 2-3 minuten na opstarten
- Controleer of alle containers draaien: `docker ps`

### **Logbestanden Bekijken**
```
docker logs maritime_backend
docker logs maritime_frontend
docker logs maritime_database
```

### **Alles Opnieuw Installeren**
```
docker compose down
docker system prune -a
docker compose up -d
```

---

## 📞 **Contact & Support**

- **GitHub Issues**: https://github.com/shipdocs/employee-onboarding/issues
- **Email**: info@shipdocs.app
- **Documentatie**: Zie de `docs/` map voor meer technische details

---

## 🔒 **Beveiliging Tips**

1. **Wijzig alle standaard wachtwoorden** in het `.env` bestand
2. **Gebruik sterke wachtwoorden** (minimaal 12 karakters)
3. **Houd Docker Desktop up-to-date**
4. **Maak regelmatig backups** van je data
5. **Gebruik HTTPS** in productie (zie technische documentatie)

---

**🎉 Gefeliciteerd! Je hebt het Maritime Onboarding System succesvol geïnstalleerd!**

Voor meer geavanceerde configuratie en productie-deployment, zie de technische documentatie in de `docs/` map.
