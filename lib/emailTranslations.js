// lib/emailTranslations.js - Email Translation System
/**
 * Email Translation System
 * 
 * Provides translations for all email templates in the system.
 * Supports English (en) and Dutch (nl) languages.
 * 
 * Structure:
 * - Each email type has its own translation key
 * - Translations include subject lines and content sections
 * - Supports interpolation with {{variable}} syntax
 */

const emailTranslations = {
  en: {
    // Manager Magic Link Email
    managerMagicLink: {
      subject: 'Maritime Training Portal - Manager Login Instructions',
      header: '🚢 Manager Portal Access',
      greeting: 'Hello {{firstName}},',
      intro: 'You have been granted access to the Burando Maritime Services Manager Portal. Use the link below to access your management dashboard.',
      ctaButton: '🎯 Access Manager Portal',
      securityNotice: '🔒 Important Notice:',
      securityText: 'This link is unique to you and will expire in 3 hours. You can use this link multiple times within the 3-hour window. Do not share this link with anyone else for security reasons.',
      capabilitiesTitle: 'Your Management Capabilities',
      capabilities: {
        crew: 'Crew Management: Add, edit, and monitor crew members',
        training: 'Training Oversight: Track training progress and completion',
        certificates: 'Certificate Management: Generate and distribute certificates',
        compliance: 'Compliance Dashboard: Monitor safety compliance and reports',
        communication: 'Communication Tools: Send notifications and updates to crew'
      },
      supportText: 'As a manager, you play a crucial role in ensuring our crew receives comprehensive safety training and maintains the highest standards of maritime operations.',
      helpText: 'If you need assistance or have questions about the platform, our support team is here to help.',
      linkExpired: 'Link expired or need a new one?',
      requestNewLink: 'Request New Magic Link',
      closing: 'Safe sailing!',
      signature: 'Burando Maritime Services Management Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Manager Portal',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Crew Magic Link Email
    crewMagicLink: {
      subject: 'Maritime Training - Getting Started Instructions',
      header: '🚢 Begin Your Training Journey',
      welcomeBanner: 'Welcome Aboard!',
      welcomeSubtext: 'Your maritime training is ready to begin',
      greeting: 'Dear {{firstName}},',
      intro: 'Welcome to Burando Maritime Services! We\'re excited to have you join our crew. Your comprehensive onboarding training program is now ready, and you can begin immediately using the secure link below.',
      assignmentTitle: '📋 Your Assignment Details',
      position: 'Position:',
      vessel: 'Vessel:',
      boardingDate: 'Expected Boarding:',
      ctaButton: '🎯 Start Training Now',
      trainingTitle: '🎓 Your Training Program',
      trainingPhases: {
        phase1: 'Phase 1: Safety Fundamentals & Emergency Procedures (24 hours)',
        phase2: 'Phase 2: Operational Training & Equipment (72 hours)',
        phase3: 'Phase 3: Advanced Procedures & Policies (1 week)'
      },
      trainingNote: 'Complete at your own pace with interactive modules, quizzes, and practical demonstrations',
      securityNotice: '🔒 Security Notice:',
      securityText: 'This training link is unique to you and will expire in 3 hours. You can use this link multiple times within the 3-hour window. Do not share this link with others.',
      progressNote: 'You\'ll receive email notifications as you progress through each phase. Our support team is available if you have any questions or technical issues during your training.',
      linkExpired: 'Link expired or need a new one?',
      requestNewLink: 'Request New Magic Link',
      welcomeMessage: 'We look forward to welcoming you aboard and wish you success in your maritime career with Burando Maritime Services!',
      closing: 'Fair winds and following seas!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Crew Training System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Safety Management Email
    safetyManagement: {
      subject: 'Welcome to Burando Maritime Services - Pre-boarding Information',
      header: 'Welcome to Burando Maritime Services',
      greeting: 'Dear {{firstName}} {{lastName}},',
      intro: 'Welcome to the Burando Maritime Services family! We are excited to have you join our crew and look forward to working with you aboard our vessels.',
      assignmentTitle: 'Your Assignment Details',
      vessel: 'Vessel:',
      boardingDate: 'Expected Boarding Date:',
      position: 'Position:',
      safetyNote: 'As part of our commitment to safety and excellence, you will participate in our comprehensive crew onboarding training program. This program ensures you have all the knowledge and skills necessary for safe and effective operations.',
      attachmentNote: '📋 Important: Attached to this email is our complete Safety Management System (SMS) document. Please review this critical document before your boarding date, as it contains essential safety information and procedures covered in your training.',
      trainingOverview: 'Training Program Overview',
      phases: {
        phase1: 'Phase 1: Immediate Safety Training (24 hours)',
        phase2: 'Phase 2: Operational Training (72 hours)',
        phase3: 'Phase 3: Advanced Training & Policies (1 week)'
      },
      trainingDetails: 'Each phase includes interactive learning modules, quizzes, and practical demonstrations. You\'ll receive email notifications as you progress through each phase.',
      nextSteps: 'On your boarding date, you\'ll receive a secure access link to begin your training. If you have any questions or technical issues, please contact our support team.',
      closing: 'Welcome aboard!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Crew Onboarding System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Phase Completion Email
    phaseCompletion: {
      subject: '🎉 Phase {{phase}} Completed - Congratulations!',
      header: '🎉 Congratulations!',
      subheader: 'Phase {{phase}} Successfully Completed',
      greeting: 'Dear {{firstName}} {{lastName}},',
      banner: '🚢 Excellent Work!',
      achievement: 'You have successfully completed <strong>Phase {{phase}}</strong> of your maritime safety training.',
      recognition: 'Your dedication to safety and professional development is commendable.',
      nextStepsTitle: '📚 Next Steps',
      nextSteps: {
        review: 'Review your progress in the dashboard',
        continue: 'Continue to the next training phase if available',
        access: 'Access training materials for reference',
        contact: 'Contact your manager with any questions'
      },
      ctaButton: '📊 View Dashboard',
      progressNote: 'Your progress has been automatically recorded in the system. Keep up the excellent work as you continue your training journey.',
      closing: 'Best of luck with your continued training!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Training System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Progress Reminder Email
    progressReminder: {
      overdue: {
        subject: '⚠️ Overdue Training - Phase {{phase}} Action Required',
        headerText: 'Overdue Training',
        icon: '⚠️'
      },
      dueSoon: {
        subject: '📅 Training Reminder - Phase {{phase}} Due Soon',
        headerText: 'Training Deadline Approaching',
        icon: '⏰'
      },
      upcoming: {
        subject: '📋 Upcoming Training - Phase {{phase}} Preparation',
        headerText: 'Training Reminder',
        icon: '📅'
      },
      inactive: {
        subject: '🔔 Training Progress Check-in Required',
        headerText: 'Resume Your Training',
        icon: '🔔'
      },
      greeting: 'Hello {{firstName}},',
      trainingStatus: 'Training Status:',
      phase: 'Phase {{phase}}',
      deadline: 'Deadline:',
      reminderText: 'This is a reminder to continue your onboarding training. It\'s important that you complete all modules before boarding.',
      ctaButton: '🎯 Continue Training',
      supportText: 'If you have any questions about the training, please contact your manager or our support team.',
      closing: 'Thank you for your commitment to safety!',
      signature: 'Burando Maritime Services',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Training System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Manager Welcome Email
    managerWelcome: {
      subject: 'Welcome to Maritime Onboarding System - Manager Account Created',
      header: 'Welcome to the Management Team',
      greeting: 'Dear {{firstName}} {{lastName}},',
      intro: 'Welcome to Burando Maritime Services! Your manager account has been successfully created and you now have access to our crew onboarding management system.',
      quickAccessTitle: '🚀 Direct Access - No Password Needed',
      quickAccessText: 'Use the button below to access your manager dashboard:',
      ctaButton: '🔐 Access Dashboard Now',
      linkNote: 'This secure link expires in 3 hours and can be used multiple times',
      alternativeTitle: 'Alternative Login Method',
      alternativeText: 'You can also log in using these credentials:',
      email: 'Email:',
      password: 'Temporary Password:',
      position: 'Position:',
      passwordWarning: '⚠️ Please change your password after first login',
      capabilitiesTitle: 'Your Management Capabilities',
      capabilities: {
        crew: 'Crew Management: Add, edit, and monitor crew members',
        training: 'Training Oversight: Track training progress and completion',
        certificates: 'Certificate Management: Generate and distribute certificates',
        compliance: 'Compliance Dashboard: Monitor safety compliance and reports',
        communication: 'Communication Tools: Send notifications and updates to crew'
      },
      viewGuideButton: '📚 View Manager Guide',
      roleText: 'As a manager, you play a crucial role in ensuring our crew receives comprehensive safety training and maintains the highest standards of maritime operations.',
      supportText: 'If you have any questions about using the management system or need technical support, please don\'t hesitate to contact our support team.',
      linkExpiredText: 'Need a new access link?',
      requestNewLink: 'Request New Magic Link',
      closing: 'Welcome to the team!',
      signature: 'Burando Maritime Services Administration',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Crew Onboarding System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Welcome Email
    welcome: {
      subject: 'Welcome to Burando Maritime Services - Onboarding Training',
      header: '🚢 Welcome Aboard!',
      welcomeBanner: 'Welcome to Burando Maritime Services',
      welcomeSubtext: 'Your maritime career journey begins here',
      greeting: 'Dear {{firstName}},',
      intro: 'Welcome to the Burando Maritime Services family! We are excited to have you join our team and begin your maritime training journey.',
      assignmentTitle: 'Your Assignment Details',
      position: 'Position:',
      vessel: 'Vessel:',
      boardingDate: 'Expected Boarding:',
      nextSteps: 'You will receive additional training instructions and access to your onboarding portal soon. Please ensure all your documentation is ready for your boarding date.',
      closing: 'We look forward to working with you!',
      signature: 'Burando Maritime Services HR Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Training System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Safety Management Email
    safetyManagement: {
      subject: 'Important: Safety Management System Documentation',
      header: '🔴 Safety Management System',
      safetyBanner: 'Safety First - Always',
      safetySubtext: 'Critical safety information for your vessel assignment',
      greeting: 'Dear {{firstName}},',
      intro: 'As part of your pre-boarding preparation, please review the attached Safety Management System documentation. This is essential reading before your boarding date.',
      documentTitle: 'Safety Management System PDF',
      documentDescription: 'This document contains critical safety procedures, emergency protocols, and compliance requirements for your vessel.',
      boardingDate: 'Boarding Date:',
      safetyTopicsTitle: 'Key Safety Topics Covered',
      safetyTopics: {
        emergency: 'Emergency response procedures and evacuation protocols',
        equipment: 'Personal protective equipment requirements and usage',
        procedures: 'Standard operating procedures for safe vessel operations',
        compliance: 'International maritime safety regulations and compliance'
      },
      importance: 'Understanding these safety procedures is mandatory before boarding. Please review thoroughly and contact us with any questions.',
      closing: 'Thank you for your commitment to safety!',
      signature: 'Burando Maritime Services Safety Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Training System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Onboarding Start Email
    onboardingStart: {
      subject: 'Welcome Aboard! Start Your Onboarding Training Today',
      header: '🚀 Training Starts Now',
      welcomeBanner: 'Welcome Aboard!',
      welcomeSubtext: 'Your onboarding training is ready to begin',
      greeting: 'Dear {{firstName}},',
      intro: 'Today marks the beginning of your journey aboard {{vessel}}. Please begin your onboarding training as soon as possible.',
      ctaButton: '🚀 Begin Onboarding Training',
      securityNotice: '🔒 Important Notice:',
      securityText: 'This secure link will expire in 3 hours and can be used multiple times within that window.',
      importance: 'Completing your onboarding training promptly is essential for your safety and the safety of your crewmates.',
      closing: 'Welcome to the team!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'This email was sent from the Burando Maritime Services Training System',
        line2: '© 2024 Burando Maritime Services. All rights reserved.'
      }
    },

    // Completion Certificate Email
    completionCertificate: {
      subject: '🎉 Congratulations! Your Maritime Training Certificate',
      greeting: 'Dear {{firstName}},',
      message: 'You have successfully completed your maritime training.',
      closing: 'Congratulations!',
      signature: 'Burando Maritime Services'
    },

    // Common elements
    common: {
      toBeConfirmed: 'To be confirmed',
      toBeAssigned: 'To be assigned',
      crewMember: 'Crew Member',
      manager: 'Manager'
    }
  },

  nl: {
    // Manager Magic Link Email - Dutch
    managerMagicLink: {
      subject: 'Maritieme Training Portal - Manager Login Instructies',
      header: '🚢 Manager Portal Toegang',
      greeting: 'Hallo {{firstName}},',
      intro: 'U heeft toegang gekregen tot het Burando Maritime Services Manager Portal. Klik op de beveiligde link hieronder om toegang te krijgen tot uw beheerdersdashboard.',
      ctaButton: '🎯 Toegang Manager Portal',
      securityNotice: '🔒 Beveiligingsmelding:',
      securityText: 'Deze link is uniek voor u en verloopt na 3 uur. U kunt deze link meerdere keren gebruiken binnen het 3-uurs venster. Deel deze link om veiligheidsredenen niet met anderen.',
      capabilitiesTitle: 'Uw Beheermogelijkheden',
      capabilities: {
        crew: 'Bemanning Beheer: Toevoegen, bewerken en monitoren van bemanningsleden',
        training: 'Training Toezicht: Volg trainingsvoortgang en voltooiing',
        certificates: 'Certificaat Beheer: Genereer en distribueer certificaten',
        compliance: 'Compliance Dashboard: Monitor veiligheidsnalevering en rapporten',
        communication: 'Communicatie Tools: Verstuur meldingen en updates naar bemanning'
      },
      supportText: 'Als manager speelt u een cruciale rol in het waarborgen dat onze bemanning uitgebreide veiligheidstraining ontvangt en de hoogste normen van maritieme operaties handhaaft.',
      helpText: 'Als u hulp nodig heeft of vragen heeft over het platform, staat ons ondersteuningsteam voor u klaar.',
      linkExpired: 'Link verlopen of heeft u een nieuwe nodig?',
      requestNewLink: 'Vraag Nieuwe Magic Link Aan',
      closing: 'Veilige vaart!',
      signature: 'Burando Maritime Services Management Team',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Manager Portal',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Crew Magic Link Email - Dutch
    crewMagicLink: {
      subject: 'Maritieme Training - Instructies om te Beginnen',
      header: '🚢 Begin uw Trainingsreis',
      welcomeBanner: 'Welkom aan Boord!',
      welcomeSubtext: 'Uw maritieme training is klaar om te beginnen',
      greeting: 'Beste {{firstName}},',
      intro: 'Welkom bij Burando Maritime Services! We zijn verheugd dat u zich bij onze bemanning voegt. Uw uitgebreide onboarding trainingsprogramma is nu klaar en u kunt direct beginnen met de beveiligde link hieronder.',
      assignmentTitle: '📋 Uw Toewijzingsgegevens',
      position: 'Positie:',
      vessel: 'Schip:',
      boardingDate: 'Verwachte Inscheping:',
      ctaButton: '🎯 Start Training Nu',
      trainingTitle: '🎓 Uw Trainingsprogramma',
      trainingPhases: {
        phase1: 'Fase 1: Veiligheidsfundamenten & Noodprocedures (24 uur)',
        phase2: 'Fase 2: Operationele Training & Uitrusting (72 uur)',
        phase3: 'Fase 3: Geavanceerde Procedures & Beleid (1 week)'
      },
      trainingNote: 'Voltooi in uw eigen tempo met interactieve modules, quizzen en praktische demonstraties',
      securityNotice: '🔒 Beveiligingsmelding:',
      securityText: 'Deze trainingslink is uniek voor u en verloopt na 3 uur. U kunt deze link meerdere keren gebruiken binnen het 3-uurs venster. Deel deze link niet met anderen.',
      progressNote: 'U ontvangt e-mailmeldingen naarmate u door elke fase vordert. Ons ondersteuningsteam is beschikbaar als u vragen of technische problemen heeft tijdens uw training.',
      linkExpired: 'Link verlopen of heeft u een nieuwe nodig?',
      requestNewLink: 'Vraag Nieuwe Magic Link Aan',
      welcomeMessage: 'We kijken ernaar uit u aan boord te verwelkomen en wensen u succes in uw maritieme carrière bij Burando Maritime Services!',
      closing: 'Gunstige wind en volgende zeeën!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Crew Training Systeem',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Safety Management Email - Dutch
    safetyManagement: {
      subject: 'Belangrijk: Safety Management System Documentatie',
      header: '🔴 Safety Management System',
      safetyBanner: 'Veiligheid Eerst - Altijd',
      safetySubtext: 'Kritieke veiligheidsinformatie voor uw scheepstoewijzing',
      greeting: 'Beste {{firstName}},',
      intro: 'Als onderdeel van uw pre-boarding voorbereiding, bekijk alstublieft de bijgevoegde Safety Management System documentatie. Dit is essentiële lectuur voor uw inschepingsdatum.',
      documentTitle: 'Safety Management System PDF',
      documentDescription: 'Dit document bevat kritieke veiligheidsprocedures, noodprotocollen en nalevingsvereisten voor uw schip.',
      boardingDate: 'Inschepingsdatum:',
      safetyTopicsTitle: 'Belangrijke Veiligheidsonderwerpen Behandeld',
      safetyTopics: {
        emergency: 'Noodresponsprocedures en evacuatieprotocollen',
        equipment: 'Persoonlijke beschermingsmiddelen vereisten en gebruik',
        procedures: 'Standaard operatieprocedures voor veilige scheepsoperaties',
        compliance: 'Internationale maritieme veiligheidsreglementen en naleving'
      },
      importance: 'Het begrijpen van deze veiligheidsprocedures is verplicht voor het inschepen. Bekijk grondig en neem contact met ons op bij vragen.',
      closing: 'Veilige vaart!',
      signature: 'Burando Maritime Services Veiligheidsteam',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Safety Management System',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Phase Completion Email - Dutch
    phaseCompletion: {
      subject: '🎉 Fase {{phase}} Voltooid - Gefeliciteerd!',
      header: '🎉 Gefeliciteerd!',
      subheader: 'Fase {{phase}} Succesvol Voltooid',
      greeting: 'Beste {{firstName}} {{lastName}},',
      banner: '🚢 Uitstekend Werk!',
      achievement: 'Je hebt <strong>Fase {{phase}}</strong> van je maritime veiligheidstraining succesvol afgerond.',
      recognition: 'Je toewijding aan veiligheid en professionele ontwikkeling is prijzenswaardig.',
      nextStepsTitle: '📚 Volgende Stappen',
      nextSteps: {
        review: 'Bekijk je voortgang in het dashboard',
        continue: 'Ga door naar de volgende trainingsfase indien beschikbaar',
        access: 'Toegang tot trainingsmateriaal voor referentie',
        contact: 'Neem contact op met je manager bij vragen'
      },
      ctaButton: '📊 Bekijk Dashboard',
      progressNote: 'Je voortgang is automatisch geregistreerd in het systeem. Ga zo door terwijl je je trainingsreis voortzet.',
      closing: 'Veel succes met je verdere training!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'Dit bericht is verzonden vanuit het Burando Maritime Services Training Systeem',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Progress Reminder Email - Dutch
    progressReminder: {
      overdue: {
        subject: '⚠️ Achterstallige Training - Fase {{phase}} Actie Vereist',
        headerText: 'Achterstallige Training',
        icon: '⚠️'
      },
      dueSoon: {
        subject: '📅 Training Herinnering - Fase {{phase}} Binnenkort Te Voltooien',
        headerText: 'Training Deadline Nadert',
        icon: '⏰'
      },
      upcoming: {
        subject: '📋 Aankomende Training - Fase {{phase}} Voorbereiding',
        headerText: 'Training Herinnering',
        icon: '📅'
      },
      inactive: {
        subject: '🔔 Training Voortgang Check-in Vereist',
        headerText: 'Hervat je Training',
        icon: '🔔'
      },
      greeting: 'Hallo {{firstName}},',
      trainingStatus: 'Training Status:',
      phase: 'Fase {{phase}}',
      deadline: 'Deadline:',
      reminderText: 'Dit is een herinnering om je inwerk training voort te zetten. Het is belangrijk dat je alle modules voltooit voordat je aan boord gaat.',
      ctaButton: '🎯 Ga naar Training',
      supportText: 'Als je vragen hebt over de training, neem dan contact op met je manager of ons ondersteuningsteam.',
      closing: 'Bedankt voor je toewijding aan veiligheid!',
      signature: 'Burando Maritime Services',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Training Systeem',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Manager Welcome Email - Dutch
    managerWelcome: {
      subject: 'Welkom bij Maritime Onboarding Systeem - Manager Account Aangemaakt',
      header: 'Welkom bij het Management Team',
      greeting: 'Beste {{firstName}} {{lastName}},',
      intro: 'Welkom bij Burando Maritime Services! Uw manager account is succesvol aangemaakt en u heeft nu toegang tot ons bemanning onboarding beheersysteem.',
      quickAccessTitle: '🚀 Directe Toegang - Geen Wachtwoord Nodig',
      quickAccessText: 'Gebruik de knop hieronder voor toegang tot uw manager dashboard:',
      ctaButton: '🔐 Dashboard Openen',
      linkNote: 'Deze beveiligde link verloopt na 3 uur en kan meerdere keren worden gebruikt',
      alternativeTitle: 'Alternatieve Inlogmethode',
      alternativeText: 'U kunt ook inloggen met deze gegevens:',
      email: 'E-mail:',
      password: 'Tijdelijk Wachtwoord:',
      position: 'Positie:',
      passwordWarning: '⚠️ Wijzig uw wachtwoord na de eerste keer inloggen',
      capabilitiesTitle: 'Uw Beheermogelijkheden',
      capabilities: {
        crew: 'Bemanning Beheer: Toevoegen, bewerken en monitoren van bemanningsleden',
        training: 'Training Toezicht: Volg trainingsvoortgang en voltooiing',
        certificates: 'Certificaat Beheer: Genereer en distribueer certificaten',
        compliance: 'Compliance Dashboard: Monitor veiligheidsnalevering en rapporten',
        communication: 'Communicatie Tools: Verstuur meldingen en updates naar bemanning'
      },
      viewGuideButton: '📚 Bekijk Manager Handleiding',
      roleText: 'Als manager speelt u een cruciale rol in het waarborgen dat onze bemanning uitgebreide veiligheidstraining ontvangt en de hoogste normen van maritieme operaties handhaaft.',
      supportText: 'Als u vragen heeft over het gebruik van het beheersysteem of technische ondersteuning nodig heeft, aarzel dan niet om contact op te nemen met ons ondersteuningsteam.',
      linkExpiredText: 'Heeft u een nieuwe toegangslink nodig?',
      requestNewLink: 'Vraag Nieuwe Magic Link Aan',
      closing: 'Welkom bij het team!',
      signature: 'Burando Maritime Services Administratie',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Crew Onboarding Systeem',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Welcome Email - Dutch
    welcome: {
      subject: 'Welkom bij Burando Maritime Services - Inwerk Training',
      header: '🚢 Welkom aan Boord!',
      welcomeBanner: 'Welkom bij Burando Maritime Services',
      welcomeSubtext: 'Uw maritieme carrière begint hier',
      greeting: 'Beste {{firstName}},',
      intro: 'Welkom bij de Burando Maritime Services familie! We zijn verheugd dat u zich bij ons team voegt en uw maritieme trainingsreis begint.',
      assignmentTitle: 'Uw Toewijzingsgegevens',
      position: 'Positie:',
      vessel: 'Schip:',
      boardingDate: 'Verwachte Inscheping:',
      nextSteps: 'U ontvangt binnenkort aanvullende trainingsinstructies en toegang tot uw inwerk portal. Zorg ervoor dat al uw documentatie klaar is voor uw inschepingsdatum.',
      closing: 'We kijken ernaar uit om met u samen te werken!',
      signature: 'Burando Maritime Services HR Team',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Training Systeem',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Onboarding Start Email - Dutch
    onboardingStart: {
      subject: 'Welkom aan Boord! Start Vandaag uw Inwerk Training',
      header: '🚀 Training Begint Nu',
      welcomeBanner: 'Welkom aan Boord!',
      welcomeSubtext: 'Uw inwerk training is klaar om te beginnen',
      greeting: 'Beste {{firstName}},',
      intro: 'Vandaag markeert het begin van uw reis aan boord van {{vessel}}. Begin zo spoedig mogelijk met uw inwerk training.',
      ctaButton: '🚀 Begin Inwerk Training',
      securityNotice: '🔒 Belangrijke Melding:',
      securityText: 'Deze beveiligde link verloopt na 3 uur en kan meerdere keren worden gebruikt binnen dat tijdsvenster.',
      importance: 'Het snel voltooien van uw inwerk training is essentieel voor uw veiligheid en die van uw bemanningsgenoten.',
      closing: 'Welkom bij het team!',
      signature: 'Burando Maritime Services Training Team',
      footer: {
        line1: 'Deze e-mail is verzonden vanuit het Burando Maritime Services Training Systeem',
        line2: '© 2024 Burando Maritime Services. Alle rechten voorbehouden.'
      }
    },

    // Completion Certificate Email - Dutch
    completionCertificate: {
      subject: '🎉 Gefeliciteerd! Uw Maritieme Training Certificaat',
      greeting: 'Beste {{firstName}},',
      message: 'U heeft uw maritieme training succesvol voltooid.',
      closing: 'Gefeliciteerd!',
      signature: 'Burando Maritime Services'
    },

    // Common elements - Dutch
    common: {
      toBeConfirmed: 'Nog te bevestigen',
      toBeAssigned: 'Nog toe te wijzen',
      crewMember: 'Bemanningslid',
      manager: 'Manager'
    }
  }
};

/**
 * Get translation for a specific key and language
 * @param {string} lang - Language code (en or nl)
 * @param {string} key - Translation key (e.g., 'managerMagicLink.subject')
 * @param {Object} params - Parameters for interpolation
 * @returns {string} - Translated string
 */
function getTranslation(lang, key, params = {}) {
  const keys = key.split('.');
  let translation = emailTranslations[lang] || emailTranslations.en;
  
  for (const k of keys) {
    translation = translation?.[k];
    if (!translation) {
      // Fallback to English if translation not found
      translation = emailTranslations.en;
      for (const fallbackKey of keys) {
        translation = translation?.[fallbackKey];
        if (!translation) break;
      }
      break;
    }
  }
  
  if (!translation) {
    
    return key;
  }
  
  // Replace parameters
  let result = translation;
  if (typeof result === 'string') {
    Object.keys(params).forEach(param => {
      result = result.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    });
  }
  
  return result;
}

/**
 * Get all translations for a specific email type
 * @param {string} lang - Language code (en or nl)
 * @param {string} emailType - Email type (e.g., 'managerMagicLink')
 * @returns {Object} - All translations for the email type
 */
function getEmailTranslations(lang, emailType) {
  const translations = emailTranslations[lang]?.[emailType] || emailTranslations.en[emailType];
  if (!translations) {
    
    return {};
  }
  return translations;
}

/**
 * Get common translations
 * @param {string} lang - Language code (en or nl)
 * @returns {Object} - Common translations
 */
function getCommonTranslations(lang) {
  return emailTranslations[lang]?.common || emailTranslations.en.common;
}

module.exports = {
  emailTranslations,
  getTranslation,
  getEmailTranslations,
  getCommonTranslations
};