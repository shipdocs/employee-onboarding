---
project_name: "Maritime Onboarding System 2025"
version: "2.0.0"
status: "active_development"
current_milestone: "M01_System_Stabilization"
current_sprint: "S01_M01_Critical_Bug_Fixes"
current_task: null
last_updated: "2025-06-10 10:13"
---

# Maritime Onboarding System 2025 - Project Manifest

## 🚢 Project Overzicht

Het Maritime Onboarding System is een uitgebreid crew onboarding en training management systeem voor de maritieme industrie. Het systeem biedt geautomatiseerde training workflows, interactieve quizzen, en certificaat generatie.

### Kernfunctionaliteiten
- **Role-Based Access Control**: Admin, Manager, en Crew rollen met hiërarchische permissies
- **Magic Link Authentication**: Passwordless login systeem voor crew leden
- **Training Workflow**: Drie-fase training systeem met progress tracking
- **Certificate Generation**: Geautomatiseerde PDF certificaat creatie met custom templates
- **Multilingual Support**: Ondersteuning voor meerdere talen
- **Offline Capability**: Training completion zonder internetverbinding

## 🏗️ Technische Architectuur

### Technology Stack
- **Frontend**: React (client/src) met Vercel deployment
- **Backend**: Vercel API routes (api/) met Supabase database
- **Database**: Supabase PostgreSQL met Row Level Security (RLS)
- **Authentication**: Magic link systeem via email
- **Storage**: Supabase Storage voor file uploads en PDF backgrounds
- **Email**: MailerSend voor email delivery
- **PDF Generation**: pdf-lib voor dynamische certificaat generatie

### Environment Structure
```
localhost (vercel dev) → testing → preview → main/production
```

### Belangrijkste Database Tabellen
- `users` - Admin, Manager, Crew gebruikers
- `pdf_templates` - Template definities met JSONB fields
- `training_sessions` - Gebruiker training progress
- `quiz_results` - Quiz scores en antwoorden
- `magic_links` - Authentication tokens
- `audit_log` - Systeem activiteit tracking

## 🎯 Project Doelen

### Primaire Doelen
1. **Streamline Crew Training**: Automatiseer en vereenvoudig het onboarding proces
2. **Compliance Management**: Zorg voor naleving van maritieme regelgeving
3. **Certificate Automation**: Automatiseer certificaat generatie en distributie
4. **Multi-language Support**: Ondersteuning voor internationale crews
5. **Offline Capability**: Training completion in maritieme omgevingen zonder internet

### Secundaire Doelen
1. **Scalability**: Ondersteuning voor grote aantallen gebruikers
2. **Performance**: Snelle response times en optimale gebruikerservaring
3. **Security**: Robuuste beveiliging en data protection
4. **Maintainability**: Eenvoudig te onderhouden en uit te breiden

## 📋 Huidige Status

### ✅ Wat Werkt
- Complete database schema met alle tabellen
- Admin authentication systeem
- PDF template editor met real-time name editing
- Magic link authentication voor managers/crew
- Proper migration systeem met clean workflow
- Role-based access control implementatie
- Basic training workflow

### 🔄 In Progress
- PDF template name editing feature testing
- Certificate generation systeem optimalisatie
- Training progress tracking verbetering
- Multilingual workflow systeem

### ✅ Recently Completed
- **Sprint S01**: Critical Bug Fixes & System Stabilization (2025-06-10)
  - Manager login bug verification and testing
  - Database migration consolidation (23→18 files)
  - API error handling standardization (35+ error codes)
  - Frontend error boundaries implementation (6 components)
  - Production deployment validation (100% success rate)

### 📝 Technical Debt
- Remove unused migration files from early development
- Standardize error handling across API routes
- Improve TypeScript coverage
- Add comprehensive test suite
- Optimize database queries en indexing

## 🚀 Development Workflow

### Daily Development
```bash
# Setup (first time)
npm install && cd client && npm install && cd ..

# Daily development
npm run start  # vercel dev (localhost:3000)

# After React changes
npm run build  # cd client && npm run build && cd .. && cp -r client/build ./build
```

### Testing
```bash
npm run test              # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:onboarding  # Onboarding flow tests
```

### Deployment
```bash
npm run deploy  # vercel --prod
```

## 🔧 Key Development Areas

### 1. Training System Enhancement
- Verbeter training progress tracking
- Implementeer advanced quiz randomization
- Optimaliseer offline capability

### 2. Certificate System
- Uitbreiden van template editor functionaliteit
- Implementeren van bulk certificate generation
- Verbeteren van PDF generation performance

### 3. User Experience
- Responsive design optimalisatie
- Performance improvements
- Accessibility enhancements

### 4. System Reliability
- Error handling standardization
- Monitoring en logging improvements
- Automated testing coverage

## 📊 Project Metrics

### Performance Targets
- Page load time: < 2 seconds
- API response time: < 500ms
- Certificate generation: < 5 seconds
- Offline sync: < 30 seconds

### Quality Targets
- Test coverage: > 80%
- TypeScript coverage: > 90%
- Accessibility score: > 95%
- Security audit: 0 critical issues

## 🎯 Success Criteria

### Technical Success
- [ ] All core features fully functional
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Test coverage targets achieved

### Business Success
- [ ] Reduced onboarding time by 50%
- [ ] 99.9% uptime achieved
- [ ] User satisfaction > 4.5/5
- [ ] Compliance requirements met

## 📚 Documentation Links

- **[Complete Documentation](docs/README.md)** - Comprehensive guides
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation
- **[Development Workflow](docs/DEVELOPMENT_WORKFLOW.md)** - Development processes
- **[Architecture Guide](docs/architecture/README.md)** - System architecture
- **[Feature Overview](docs/features/README.md)** - Feature documentation