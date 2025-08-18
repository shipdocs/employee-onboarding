# APPENDIX B: DATA FLOW DIAGRAMS
## Maritime Onboarding System 2025
### System Data Processing and Security Architecture

---

## EXECUTIVE SUMMARY

This appendix provides comprehensive data flow diagrams illustrating how data moves through the Maritime Onboarding System. Each diagram shows data processing points, security controls, and compliance checkpoints to ensure full transparency of data handling.

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

```mermaid
graph TB
    subgraph "EU Region - Frankfurt"
        subgraph "Frontend - Vercel"
            UI[React Application]
            CDN[CDN Edge Network]
        end
        
        subgraph "Backend - Vercel Functions"
            API[API Endpoints]
            AUTH[Auth Service]
            PROC[Processing Layer]
        end
        
        subgraph "Database - Supabase"
            PG[(PostgreSQL)]
            STOR[Object Storage]
            RLS[Row Level Security]
        end
        
        subgraph "External Services"
            EMAIL[MailerSend EU]
            MFA[TOTP Service]
        end
    end
    
    subgraph "Users"
        ADMIN[Admin Users]
        MGR[Manager Users]
        CREW[Crew Members]
    end
    
    ADMIN -->|HTTPS/TLS 1.3| CDN
    MGR -->|HTTPS/TLS 1.3| CDN
    CREW -->|HTTPS/TLS 1.3| CDN
    
    CDN -->|Encrypted| UI
    UI -->|JWT + API Call| API
    API -->|Verify Token| AUTH
    AUTH -->|Authorized| PROC
    PROC -->|Encrypted Query| RLS
    RLS -->|Filtered Data| PG
    PROC -->|Send Email| EMAIL
    AUTH -->|MFA Check| MFA
    PROC -->|Store Files| STOR
```

---

## 2. AUTHENTICATION FLOW

### 2.1 Admin/Manager Password Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as API Gateway
    participant AUTH as Auth Service
    participant MFA as MFA Service
    participant DB as Database
    participant LOG as Security Logger
    
    U->>UI: Enter credentials
    UI->>API: POST /api/auth/admin-login
    API->>AUTH: Validate credentials
    AUTH->>DB: Check user + password hash
    
    alt Invalid Credentials
        DB-->>AUTH: User not found/wrong password
        AUTH->>LOG: Log failed attempt
        AUTH-->>API: Authentication failed
        API-->>UI: Error (401)
        UI-->>U: Show error
    else Valid Credentials
        DB-->>AUTH: User verified
        AUTH->>MFA: Check MFA requirement
        
        alt MFA Required
            MFA-->>AUTH: MFA needed
            AUTH-->>API: Request MFA token
            API-->>UI: MFA challenge
            UI-->>U: Request TOTP
            U->>UI: Enter TOTP
            UI->>API: Submit TOTP
            API->>MFA: Verify TOTP
            
            alt Invalid TOTP
                MFA-->>API: Invalid
                API-->>UI: Error
                UI-->>U: Try again
            else Valid TOTP
                MFA-->>API: Valid
                API->>AUTH: Generate JWT
                AUTH->>DB: Store session
                AUTH->>LOG: Log successful login
                AUTH-->>API: JWT token
                API-->>UI: Success + JWT
                UI-->>U: Dashboard access
            end
        else No MFA
            AUTH->>AUTH: Generate JWT
            AUTH->>DB: Store session
            AUTH->>LOG: Log successful login
            AUTH-->>API: JWT token
            API-->>UI: Success + JWT
            UI-->>U: Dashboard access
        end
    end
```

### 2.2 Crew Magic Link Authentication

```mermaid
sequenceDiagram
    participant C as Crew Member
    participant UI as Frontend
    participant API as API Gateway
    participant AUTH as Auth Service
    participant EMAIL as Email Service
    participant DB as Database
    participant LOG as Security Logger
    
    C->>UI: Enter email
    UI->>API: POST /api/auth/request-magic-link
    API->>AUTH: Validate crew email
    AUTH->>DB: Check crew member exists
    
    alt Not Crew or Invalid
        DB-->>AUTH: Not found/not crew
        AUTH->>LOG: Log invalid attempt
        AUTH-->>API: Error
        API-->>UI: Generic message
        UI-->>C: "Check email" (security)
    else Valid Crew Member
        DB-->>AUTH: Crew confirmed
        AUTH->>AUTH: Generate magic token
        AUTH->>DB: Store token (3hr expiry)
        AUTH->>EMAIL: Send magic link
        EMAIL-->>C: Email with link
        AUTH->>LOG: Log magic link sent
        AUTH-->>API: Success
        API-->>UI: Check email message
        UI-->>C: Check email prompt
        
        C->>EMAIL: Click magic link
        EMAIL->>UI: Open link
        UI->>API: GET /api/auth/magic-login
        API->>AUTH: Validate token
        AUTH->>DB: Check token validity
        
        alt Invalid/Expired Token
            DB-->>AUTH: Invalid
            AUTH->>LOG: Log failed attempt
            AUTH-->>API: Error
            API-->>UI: Token invalid
            UI-->>C: Request new link
        else Valid Token
            DB-->>AUTH: Token valid
            AUTH->>AUTH: Generate JWT
            AUTH->>DB: Mark token used
            AUTH->>DB: Update crew status
            AUTH->>LOG: Log successful login
            AUTH-->>API: JWT token
            API-->>UI: Success + JWT
            UI-->>C: Training dashboard
        end
    end
```

---

## 3. DATA PROCESSING FLOWS

### 3.1 Training Content Delivery

```mermaid
graph LR
    subgraph "Content Request Flow"
        U[User] -->|1. Request| API[API Gateway]
        API -->|2. Verify Auth| AUTH[Auth Check]
        AUTH -->|3. Check Role| RBAC[Role Validation]
        RBAC -->|4. Query| DB[(Database)]
        DB -->|5. Apply RLS| RLS[Row Security]
        RLS -->|6. Filter by Company| FILTER[Company Filter]
        FILTER -->|7. Return Data| CACHE[Cache Layer]
        CACHE -->|8. Encrypted Response| U
    end
    
    subgraph "Security Layers"
        SEC1[TLS 1.3]
        SEC2[JWT Validation]
        SEC3[Role Check]
        SEC4[RLS Policies]
        SEC5[Company Isolation]
        SEC6[Response Encryption]
    end
```

### 3.2 Quiz Submission and Scoring

```mermaid
stateDiagram-v2
    [*] --> QuizStart: User starts quiz
    QuizStart --> LoadQuestions: Fetch questions
    LoadQuestions --> DisplayQuiz: Encrypted delivery
    DisplayQuiz --> AnswerSubmit: User submits
    
    AnswerSubmit --> Validation: Server validation
    Validation --> ScoreCalc: Calculate score
    
    ScoreCalc --> PassCheck: Check pass threshold
    PassCheck --> Pass: Score >= 80%
    PassCheck --> Fail: Score < 80%
    
    Pass --> SaveResult: Store result
    Fail --> SaveAttempt: Store attempt
    
    SaveResult --> CertGen: Generate certificate
    SaveAttempt --> RetryOption: Allow retry
    
    CertGen --> Notification: Send notifications
    RetryOption --> DisplayQuiz: New attempt
    
    Notification --> Complete: Training complete
    Complete --> [*]
    
    SaveResult --> AuditLog: Log completion
    SaveAttempt --> AuditLog: Log attempt
    AuditLog --> SecurityLog: Security event
```

---

## 4. DATA STORAGE AND ENCRYPTION

### 4.1 Encryption Layers

```mermaid
graph TD
    subgraph "Data at Rest"
        D1[User Data] -->|AES-256-GCM| ENC1[Encrypted Storage]
        D2[Training Records] -->|AES-256-GCM| ENC1
        D3[Certificates] -->|AES-256-GCM| ENC1
        D4[Audit Logs] -->|AES-256-GCM| ENC1
        D5[MFA Secrets] -->|AES-256-GCM + AT| ENC2[Double Encrypted]
    end
    
    subgraph "Data in Transit"
        T1[Client Request] -->|TLS 1.3| T2[API Gateway]
        T2 -->|TLS 1.3| T3[Database]
        T3 -->|TLS 1.3| T4[Backup Storage]
        T2 -->|TLS 1.3| T5[Email Service]
    end
    
    subgraph "Key Management"
        K1[Master Key] -->|Derived| K2[Data Keys]
        K2 -->|Rotation| K3[Key Rotation]
        K3 -->|30 days| K1
    end
```

### 4.2 Backup and Recovery Flow

```mermaid
sequenceDiagram
    participant SCHED as Scheduler
    participant DB as Primary DB
    participant BACKUP as Backup Service
    participant STOR as Storage (EU)
    participant MON as Monitoring
    participant ALERT as Alerts
    
    loop Daily at 02:00 UTC
        SCHED->>DB: Initiate backup
        DB->>DB: Create snapshot
        DB->>BACKUP: Transfer snapshot
        BACKUP->>BACKUP: Compress data
        BACKUP->>BACKUP: Encrypt (AES-256)
        BACKUP->>STOR: Store in EU region
        STOR-->>BACKUP: Confirm storage
        BACKUP->>MON: Log success
        MON->>MON: Update metrics
    end
    
    alt Backup Failure
        BACKUP--xMON: Report failure
        MON->>ALERT: Trigger P2 alert
        ALERT->>ALERT: Notify team
        ALERT->>SCHED: Retry backup
    end
    
    Note over STOR: 30-day retention
    Note over STOR: Point-in-time recovery (7 days)
```

---

## 5. GDPR DATA FLOWS

### 5.1 Data Subject Request Processing

```mermaid
graph TB
    subgraph "Data Request Types"
        REQ1[Access Request]
        REQ2[Portability Request]
        REQ3[Deletion Request]
        REQ4[Correction Request]
    end
    
    subgraph "Processing Pipeline"
        VAL[Validate Identity]
        AUTH[Authorize Request]
        PROC[Process Request]
        GEN[Generate Response]
        AUDIT[Audit Trail]
    end
    
    subgraph "Data Sources"
        DB[(Primary Database)]
        LOGS[(Audit Logs)]
        STOR[(File Storage)]
        BACKUP[(Backups)]
    end
    
    REQ1 --> VAL
    REQ2 --> VAL
    REQ3 --> VAL
    REQ4 --> VAL
    
    VAL --> AUTH
    AUTH --> PROC
    
    PROC --> DB
    PROC --> LOGS
    PROC --> STOR
    PROC --> BACKUP
    
    DB --> GEN
    LOGS --> GEN
    STOR --> GEN
    
    GEN --> AUDIT
    AUDIT --> Response[Encrypted Response]
```

### 5.2 Data Retention and Deletion

```mermaid
gantt
    title Data Retention Timeline
    dateFormat YYYY-MM-DD
    section User Data
    Active Account          :active, 2025-01-01, 365d
    Post-Contract Retention :crit, 730d
    Deletion               :milestone, 2028-01-01, 0d
    
    section Training Records
    Initial Storage        :2025-01-01, 2555d
    Legal Retention (7yr)  :active, 2025-01-01, 2555d
    Deletion              :milestone, 2032-01-01, 0d
    
    section Certificates
    Initial Storage        :2025-01-01, 3650d
    Retention (10yr)       :active, 2025-01-01, 3650d
    Deletion              :milestone, 2035-01-01, 0d
    
    section Audit Logs
    Active Logging         :active, 2025-01-01, 365d
    Rolling Deletion       :crit, 2026-01-01, 1d
    
    section Session Data
    Active Session         :active, 2025-01-01, 30d
    Auto Deletion         :crit, 2025-01-31, 1d
```

---

## 6. SECURITY MONITORING FLOWS

### 6.1 Threat Detection Pipeline

```mermaid
graph LR
    subgraph "Input Sources"
        E1[API Requests]
        E2[Login Attempts]
        E3[File Access]
        E4[Admin Actions]
        E5[Error Events]
    end
    
    subgraph "Processing"
        AGG[Event Aggregation]
        ENRICH[Context Enrichment]
        SCORE[Risk Scoring]
        CLASS[Classification]
    end
    
    subgraph "Detection Rules"
        R1[Brute Force]
        R2[Privilege Escalation]
        R3[Data Exfiltration]
        R4[Anomaly Detection]
        R5[Compliance Violation]
    end
    
    subgraph "Response"
        ALERT[Alert Generation]
        BLOCK[Auto Block]
        LOG[Security Log]
        NOTIFY[Notification]
    end
    
    E1 --> AGG
    E2 --> AGG
    E3 --> AGG
    E4 --> AGG
    E5 --> AGG
    
    AGG --> ENRICH
    ENRICH --> SCORE
    SCORE --> CLASS
    
    CLASS --> R1
    CLASS --> R2
    CLASS --> R3
    CLASS --> R4
    CLASS --> R5
    
    R1 --> ALERT
    R2 --> ALERT
    R3 --> BLOCK
    R4 --> LOG
    R5 --> NOTIFY
```

### 6.2 Incident Response Flow

```mermaid
stateDiagram-v2
    [*] --> Detection: Security Event
    
    Detection --> Triage: Automated Analysis
    Triage --> P1: Critical
    Triage --> P2: High
    Triage --> P3: Medium
    Triage --> P4: Low
    
    P1 --> ImmediateResponse: < 15 min
    P2 --> QuickResponse: < 2 hours
    P3 --> StandardResponse: < 8 hours
    P4 --> ScheduledResponse: < 2 days
    
    ImmediateResponse --> Containment
    QuickResponse --> Containment
    StandardResponse --> Investigation
    ScheduledResponse --> Investigation
    
    Containment --> Eradication
    Investigation --> Eradication
    
    Eradication --> Recovery
    Recovery --> PostIncident
    
    PostIncident --> Documentation
    Documentation --> LessonsLearned
    LessonsLearned --> [*]
    
    state Notification {
        [*] --> Internal: Team Alert
        Internal --> Customer: If Required
        Customer --> Regulatory: If Breach
    }
    
    Containment --> Notification
```

---

## 7. INTEGRATION FLOWS

### 7.1 Email Service Integration

```mermaid
sequenceDiagram
    participant APP as Application
    participant QUEUE as Email Queue
    participant VAL as Validator
    participant TEMP as Template Engine
    participant TRANS as Translator
    participant MAIL as MailerSend EU
    participant LOG as Audit Log
    
    APP->>QUEUE: Queue email
    QUEUE->>VAL: Validate recipient
    
    alt Invalid Email
        VAL-->>LOG: Log invalid attempt
        VAL-->>QUEUE: Reject
    else Valid Email
        VAL->>TEMP: Load template
        TEMP->>TRANS: Translate content
        TRANS->>TRANS: Apply language
        TRANS->>MAIL: Send via API
        
        alt Success
            MAIL-->>LOG: Log success
            MAIL-->>APP: Confirmation
        else Failure
            MAIL-->>QUEUE: Retry queue
            QUEUE->>QUEUE: Wait & retry (3x)
            alt Final Failure
                QUEUE-->>LOG: Log failure
                QUEUE-->>APP: Error notification
            end
        end
    end
```

### 7.2 Certificate Generation Flow

```mermaid
graph TD
    subgraph "Certificate Generation Process"
        START[Quiz Passed] --> VERIFY[Verify Completion]
        VERIFY --> GATHER[Gather Data]
        GATHER --> TEMPLATE[Load Template]
        TEMPLATE --> POPULATE[Populate Fields]
        POPULATE --> QR[Generate QR Code]
        QR --> SIGN[Digital Signature]
        SIGN --> PDF[Create PDF]
        PDF --> ENCRYPT[Encrypt Document]
        ENCRYPT --> STORE[Store in EU]
        STORE --> NOTIFY[Send Notification]
        NOTIFY --> END[Process Complete]
    end
    
    subgraph "Data Elements"
        D1[User Details]
        D2[Training Info]
        D3[Completion Date]
        D4[Certificate ID]
        D5[Verification URL]
    end
    
    subgraph "Security Controls"
        S1[Access Control]
        S2[Encryption]
        S3[Audit Trail]
        S4[Tamper Protection]
    end
    
    D1 --> GATHER
    D2 --> GATHER
    D3 --> GATHER
    D4 --> GATHER
    D5 --> QR
    
    S1 -.-> VERIFY
    S2 -.-> ENCRYPT
    S3 -.-> STORE
    S4 -.-> SIGN
```

---

## 8. COMPLIANCE CHECKPOINTS

### 8.1 Data Processing Compliance Map

```mermaid
graph TB
    subgraph "Data Entry Points"
        E1[User Registration]
        E2[Training Data]
        E3[Quiz Responses]
        E4[File Uploads]
    end
    
    subgraph "Compliance Checks"
        C1{GDPR Consent?}
        C2{Data Minimization?}
        C3{Purpose Limitation?}
        C4{Retention Policy?}
        C5{Encryption Active?}
        C6{Audit Logged?}
    end
    
    subgraph "Processing"
        P1[Process Data]
        P2[Store Data]
        P3[Transfer Data]
    end
    
    subgraph "Controls"
        ACCEPT[✓ Accept]
        REJECT[✗ Reject]
    end
    
    E1 --> C1
    E2 --> C1
    E3 --> C1
    E4 --> C1
    
    C1 -->|Yes| C2
    C1 -->|No| REJECT
    
    C2 -->|Yes| C3
    C2 -->|No| REJECT
    
    C3 -->|Yes| C4
    C3 -->|No| REJECT
    
    C4 -->|Yes| C5
    C4 -->|No| REJECT
    
    C5 -->|Yes| C6
    C5 -->|No| REJECT
    
    C6 -->|Yes| ACCEPT
    C6 -->|No| REJECT
    
    ACCEPT --> P1
    P1 --> P2
    P2 --> P3
```

---

## 9. NETWORK ARCHITECTURE

### 9.1 Network Security Zones

```mermaid
graph TB
    subgraph "Internet Zone"
        USERS[External Users]
        ATTACK[Potential Threats]
    end
    
    subgraph "DMZ - Vercel Edge"
        CDN[CDN Network]
        WAF[Web App Firewall]
        DDOS[DDoS Protection]
    end
    
    subgraph "Application Zone - Vercel"
        API[API Functions]
        STATIC[Static Assets]
    end
    
    subgraph "Data Zone - Supabase"
        DB[(Database)]
        STORAGE[(Object Storage)]
    end
    
    subgraph "Security Controls"
        FW1[Firewall Layer 1]
        FW2[Firewall Layer 2]
        IDS[Intrusion Detection]
        SIEM[Security Monitoring]
    end
    
    USERS -->|HTTPS| CDN
    ATTACK -->|Blocked| WAF
    
    CDN --> FW1
    FW1 --> API
    API --> FW2
    FW2 --> DB
    
    WAF -.-> IDS
    IDS -.-> SIEM
    DDOS -.-> SIEM
```

---

## 10. DATA LIFECYCLE MANAGEMENT

### 10.1 Complete Data Lifecycle

```mermaid
journey
    title Data Lifecycle Journey
    section Collection
      User Registration: 5: User, System
      Consent Obtained: 5: System
      Data Validated: 5: System
    section Processing
      Store in Database: 5: System
      Apply Encryption: 5: System
      Create Audit Log: 5: System
    section Usage
      Training Delivery: 5: User, System
      Progress Tracking: 5: System
      Certificate Generation: 5: System
    section Retention
      Active Period: 5: System
      Archive Phase: 3: System
      Retention Check: 4: System
    section Deletion
      Deletion Trigger: 4: System
      Secure Wipe: 5: System
      Confirmation: 5: System
```

---

## DIAGRAM LEGEND

### Symbols and Notation

| Symbol | Meaning |
|--------|---------|
| `[Component]` | System Component |
| `(Database)` | Data Storage |
| `{Decision}` | Decision Point |
| `-->` | Data Flow |
| `-.->` | Control/Monitor Flow |
| `==>` | Encrypted Flow |
| `--x` | Blocked/Failed |
| `✓` | Approved/Valid |
| `✗` | Rejected/Invalid |

### Security Levels

| Color | Security Level |
|-------|---------------|
| 🟢 Green | Secure/Encrypted |
| 🟡 Yellow | Monitored |
| 🔴 Red | Blocked/Alert |
| 🔵 Blue | Public/CDN |

### Compliance Indicators

| Indicator | Meaning |
|-----------|---------|
| GDPR | GDPR Compliant |
| ISO | ISO 27001 Control |
| LOG | Audit Logged |
| ENC | Encrypted |
| MFA | MFA Protected |

---

## NOTES

1. **All data flows** within EU boundaries (Frankfurt region)
2. **All transmissions** use TLS 1.3 minimum
3. **All storage** uses AES-256-GCM encryption
4. **All actions** create audit log entries
5. **All sensitive operations** require authentication
6. **All high-privilege actions** require MFA

---

*These data flow diagrams are maintained by the Security Architecture team and updated with any system changes. Last update: January 2025*