# Maritime Onboarding Database

This directory contains the complete database setup for the Maritime Onboarding System.

## 🗄️ **Database Architecture**

### **Files Overview**

- **`schema.sql`** - Complete database schema with all tables, indexes, functions, and triggers
- **`install.sql`** - Initial data and system settings for fresh installations
- **`init/01-init.sql`** - Docker initialization script that loads schema and install data
- **`init/schema.sql`** - Copy of schema.sql for Docker init
- **`init/install.sql`** - Copy of install.sql for Docker init

### **Database Structure**

The database contains **36 tables** organized into logical groups:

#### **🔐 Core System Tables**
- `users` - User management and authentication
- `system_settings` - Application configuration
- `managers` - Manager roles and permissions
- `manager_permissions` - Granular permission system

#### **🛡️ Authentication & Security**
- `magic_links` - Passwordless authentication
- `token_blacklist` - Security token management
- `audit_log` - Security audit trail
- `security_events` - Security incident logging
- `user_mfa_settings` - Multi-factor authentication
- `mfa_failure_log` - MFA security tracking
- `user_sessions` - Session management
- `refresh_tokens` - Token refresh system
- `password_history` - Password change tracking

#### **📚 Training & Content**
- `training_items` - Training content and modules
- `training_sessions` - User training progress
- `content_media` - Media file management
- `content_versions` - Content versioning system

#### **🔄 Workflow Management**
- `workflows` - Workflow definitions
- `workflow_phases` - Workflow structure
- `workflow_instances` - User workflow instances
- `workflow_progress` - Progress tracking

#### **❓ Quiz & Assessment**
- `quiz_content` - Quiz questions and answers
- `quiz_results` - User quiz results
- `quiz_history` - Quiz attempt history

#### **👥 Crew Management**
- `crew_assignments` - Vessel and position assignments

#### **📋 Forms & Documents**
- `forms` - Dynamic form definitions
- `certificates` - Certificate management

#### **📊 Monitoring & Logging**
- `api_logs` - API request logging
- `error_logs` - Error tracking
- `email_logs` - Email delivery tracking
- `email_notifications` - Email queue management

#### **📁 File Management**
- `file_uploads` - File upload tracking

#### **🌐 Internationalization**
- `maritime_terminology` - Maritime terms dictionary
- `translation_memory` - Translation cache

#### **🔔 System Features**
- `system_notifications` - System announcements
- `feature_flags` - Feature toggle management

## 🚀 **Getting Started**

### **Docker Setup (Recommended)**

The database is automatically set up when you run:

```bash
docker compose up -d
```

This will:
1. Create a PostgreSQL database
2. Load the complete schema (36 tables)
3. Insert initial data and settings
4. Create an admin user
5. Start Supabase Studio GUI

### **Manual Setup**

If you want to set up the database manually:

```bash
# 1. Create database
createdb maritime_onboarding

# 2. Load schema
psql -d maritime_onboarding -f database/schema.sql

# 3. Load initial data
psql -d maritime_onboarding -f database/install.sql
```

## 🎯 **Default Configuration**

### **Admin User**
- **Email**: `admin@maritime-onboarding.local`
- **Password**: `password`
- **Role**: `admin`

### **System Settings**
- **App Name**: Maritime Onboarding System
- **Version**: 2.0.1
- **Environment**: docker
- **Session Timeout**: 8 hours
- **Max Login Attempts**: 5
- **Password Min Length**: 8 characters

### **Training Content**
- 8 basic training modules pre-loaded
- Maritime terminology dictionary (20 terms)
- 4 default workflows

### **Feature Flags**
- Real-time notifications: ✅ Enabled
- Video training: ✅ Enabled
- MFA authentication: ❌ Disabled
- Advanced reporting: ❌ Disabled

## 🔧 **Database Management**

### **Accessing the Database**

#### **Via Supabase Studio (GUI)**
- URL: http://localhost:3002
- Visual table browser and editor
- SQL query interface
- Real-time data viewer

#### **Via Command Line**
```bash
# Connect to database
docker exec -it maritime_database psql -U postgres -d postgres

# Run queries
docker exec maritime_database psql -U postgres -d postgres -c "SELECT * FROM users;"
```

### **Common Operations**

#### **View All Tables**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
ORDER BY table_name;
```

#### **Check System Settings**
```sql
SELECT key, value, category FROM system_settings ORDER BY category, key;
```

#### **View Training Content**
```sql
SELECT title, category, difficulty_level FROM training_items;
```

#### **Check User Accounts**
```sql
SELECT email, role, status, created_at FROM users;
```

## 🛠️ **Maintenance**

### **Cleanup Functions**

The database includes automated cleanup functions:

```sql
-- Clean up expired tokens
SELECT cleanup_expired_tokens();
```

### **Backup & Restore**

```bash
# Backup
docker exec maritime_database pg_dump -U postgres postgres > backup.sql

# Restore
docker exec -i maritime_database psql -U postgres -d postgres < backup.sql
```

## 📈 **Performance**

The database includes optimized indexes for:
- User lookups by email and role
- Authentication token searches
- Training progress queries
- Workflow status tracking
- Audit log searches
- API performance monitoring

## 🔒 **Security Features**

- **Row Level Security (RLS)** ready (disabled for Docker)
- **Audit logging** for all critical operations
- **Token blacklisting** for security
- **Password history** tracking
- **MFA support** (configurable)
- **Session management** with automatic cleanup
- **Security event logging**

## 🌍 **URLs & Access**

- **Supabase Studio**: http://localhost:3002
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432
- **MailHog**: http://localhost:8025

## 📝 **Notes**

- The schema is designed to be compatible with both Docker and Supabase environments
- All timestamps use UTC timezone
- Foreign key constraints ensure data integrity
- Triggers automatically update `updated_at` timestamps
- The system supports multi-language content (i18n ready)
