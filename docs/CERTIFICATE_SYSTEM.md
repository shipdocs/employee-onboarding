# Certificate System Documentation

This document provides comprehensive documentation for the automated PDF certificate generation and distribution system in the maritime onboarding application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
   - [Certificate Service](#certificate-service)
   - [API Endpoints](#api-endpoints)
   - [Email Distribution](#email-distribution)
   - [Frontend Components](#frontend-components)
4. [Certificate Types](#certificate-types)
5. [Configuration](#configuration)
6. [Usage Guide](#usage-guide)
   - [Generating Certificates](#generating-certificates)
   - [Managing Certificates](#managing-certificates)
   - [Regenerating Certificates](#regenerating-certificates)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Storage](#storage)
10. [Troubleshooting](#troubleshooting)
11. [Testing](#testing)

## Overview

The certificate system automatically generates, stores, and distributes PDF certificates for crew members who have completed their maritime onboarding training. The system supports multiple certificate types, including standard training completion certificates and specialized "Intro Kapitein" certificates.

Key features:
- PDF certificate generation with dynamic content based on user data
- Secure storage of certificates in Supabase Storage
- Email distribution to crew members and HR
- Manager interface for certificate management
- API endpoints for programmatic access

## Architecture

The certificate system follows a modular architecture with the following components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  API Endpoints  │────▶│  Core Services  │────▶│  PDF Generator  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend UI    │     │  Email Service  │     │  Storage Service│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

The system uses:
- **Node.js** for backend services
- **React** for frontend components
- **PDF-lib** for PDF generation
- **MailerSend** for email distribution
- **Supabase** for database and storage

## Components

### Certificate Service

The core of the system is the `AutomatedCertificateService` class, which handles the entire certificate lifecycle:

1. **Data Collection**: Fetches user data, quiz results, and training progress
2. **Template Preparation**: Formats data for the certificate template
3. **PDF Generation**: Creates the PDF certificate with dynamic content
4. **Storage**: Stores the certificate in Supabase Storage
5. **Database Recording**: Creates a record in the certificates table
6. **Distribution**: Sends the certificate via email to the user and HR

Location: `services/automated-certificate-service.js`

### API Endpoints

The system exposes several API endpoints for certificate management:

- **List Certificates**: `GET /api/manager/certificates`
- **Get Certificate**: `GET /api/manager/certificates/[id]`
- **Update Certificate**: `PUT /api/manager/certificates/[id]`
- **Delete Certificate**: `DELETE /api/manager/certificates/[id]`
- **Regenerate Certificate**: `POST /api/manager/certificates/regenerate`
- **Generate Intro Kapitein**: `POST /api/pdf/generate-intro-kapitein`

These endpoints are protected by authentication middleware and require manager role permissions.

### Email Distribution

The email service handles certificate distribution via email:

- **Standard Certificates**: Sent to the crew member and HR
- **Intro Kapitein Certificates**: Sent to the crew member, HR, and optionally a supervisor

The system uses MailerSend for email delivery and includes HTML templates for professional-looking emails.

Location: `services/email.js`

### Frontend Components

The frontend provides a user interface for managers to view and manage certificates:

- **CertificateList**: Displays a list of all certificates with filtering and pagination
- **CertificateDetails**: Shows detailed information about a specific certificate

These components are integrated into the Manager Dashboard.

## Certificate Types

The system supports multiple certificate types:

### Standard Training Certificate

- Generated upon completion of all training phases
- Includes training progress, quiz scores, and completion dates
- Valid for 1 year from issue date

### Intro Kapitein Certificate

- Specialized certificate for the Kapitein role
- Includes qualification details and validity period
- Requires specific training completion

## Configuration

The certificate system relies on several environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `MAILERSEND_API_KEY` | API key for MailerSend email service | Yes |
| `EMAIL_FROM` | Sender email address | Yes |
| `EMAIL_FROM_NAME` | Sender name | Yes |
| `HR_EMAIL` | HR department email for certificate copies | Yes |
| `SUPERVISOR_EMAIL` | Supervisor email for Intro Kapitein certificates | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase service role key | Yes |
| `BASE_URL` | Base URL of the application | Yes |

See `.env.example` for a template of required environment variables.

## Usage Guide

### Generating Certificates

Certificates are typically generated automatically when a crew member completes all training phases. However, managers can also manually generate certificates:

1. Navigate to the Manager Dashboard
2. Select a crew member from the list
3. Click "Generate Certificate" button
4. Choose the certificate type (Standard or Intro Kapitein)
5. Confirm the generation

The system will:
- Generate the PDF certificate
- Store it in Supabase Storage
- Create a database record
- Send the certificate via email
- Display a success message with a link to view the certificate

### Managing Certificates

Managers can view and manage all certificates through the Manager Dashboard:

1. Navigate to the Manager Dashboard
2. Click on the "Certificates" tab
3. Use filters to find specific certificates:
   - By crew member name
   - By certificate type
   - By date range
4. Click on a certificate to view details
5. Available actions:
   - View certificate (opens PDF)
   - Regenerate certificate
   - Delete certificate

### Regenerating Certificates

Certificates may need to be regenerated in certain situations:

- When user information has been updated
- When training data has been corrected
- When a certificate has been lost or corrupted

To regenerate a certificate:

1. Find the certificate in the Manager Dashboard
2. Click the "Regenerate" button
3. Confirm the regeneration

The system will mark the old certificate as replaced and generate a new one with updated information.

## API Reference

### List Certificates

```
GET /api/manager/certificates
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `user_id`: Filter by user ID
- `certificate_type`: Filter by certificate type
- `from_date`: Filter by issue date (start)
- `to_date`: Filter by issue date (end)
- `sort_by`: Field to sort by (default: created_at)
- `sort_order`: Sort order (asc or desc, default: desc)

Response:
```json
{
  "certificates": [
    {
      "id": "123",
      "user_id": "456",
      "certificate_type": "Maritime Onboarding Training",
      "certificate_number": "BMS-456-1621234567890",
      "issue_date": "2025-05-01",
      "expiry_date": "2026-05-01",
      "file_path": "456/John_Doe_Certificate_1621234567890.pdf",
      "verified": true,
      "users": {
        "id": "456",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "position": "Crew Member",
        "vessel_assignment": "Vessel A"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

### Get Certificate

```
GET /api/manager/certificates/[id]
```

Response:
```json
{
  "id": "123",
  "user_id": "456",
  "certificate_type": "Maritime Onboarding Training",
  "certificate_number": "BMS-456-1621234567890",
  "issue_date": "2025-05-01",
  "expiry_date": "2026-05-01",
  "file_path": "456/John_Doe_Certificate_1621234567890.pdf",
  "verified": true,
  "file_url": "https://example.com/storage/v1/object/public/certificates/456/John_Doe_Certificate_1621234567890.pdf",
  "users": {
    "id": "456",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "position": "Crew Member",
    "vessel_assignment": "Vessel A"
  }
}
```

### Regenerate Certificate

```
POST /api/manager/certificates/regenerate
```

Request body:
```json
{
  "userId": "456",
  "certificateType": "standard",
  "certificateId": "123" // Optional: ID of certificate to replace
}
```

Response:
```json
{
  "success": true,
  "message": "Certificate regenerated successfully",
  "certificate": {
    "id": "789",
    "certificateNumber": "BMS-456-1621234599999",
    "url": "https://example.com/storage/v1/object/public/certificates/456/John_Doe_Certificate_1621234599999.pdf",
    "filename": "John_Doe_Certificate_1621234599999.pdf"
  }
}
```

### Generate Intro Kapitein Certificate

```
POST /api/pdf/generate-intro-kapitein
```

Request body:
```json
{
  "targetUserId": "456"
}
```

Response:
```json
{
  "success": true,
  "message": "Intro Kapitein certificate generated and distributed successfully",
  "certificate": {
    "id": "789",
    "certificateNumber": "BMS-456-1621234599999",
    "filename": "John_Doe_Intro_Kapitein_Certificate_1621234599999.pdf",
    "url": "https://example.com/storage/v1/object/public/certificates/456/John_Doe_Intro_Kapitein_Certificate_1621234599999.pdf"
  },
  "user": {
    "id": "456",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

## Database Schema

The certificate system uses the following database tables:

### certificates

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to users table |
| certificate_type | text | Type of certificate |
| certificate_number | text | Unique certificate number |
| issue_date | date | Date of issuance |
| expiry_date | date | Expiration date |
| issuing_authority | text | Authority that issued the certificate |
| file_path | text | Path to the certificate file in storage |
| verified | boolean | Whether the certificate has been verified |
| metadata | jsonb | Additional certificate metadata |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

The `metadata` column contains additional information such as:
- Training phase completion dates
- Quiz scores
- Vessel assignment
- Position
- Replacement information (if applicable)

## Storage

Certificates are stored in Supabase Storage in the `certificates` bucket. The storage path follows this pattern:

```
[user_id]/[filename]
```

For example:
```
456/John_Doe_Certificate_1621234567890.pdf
```

The storage bucket is configured with the following settings:
- Public access: false (requires authentication)
- File size limit: 10MB
- Allowed MIME types: application/pdf

## Troubleshooting

### Common Issues

#### Certificate Generation Fails

Possible causes:
- Missing user data
- Incomplete training records
- PDF template issues
- Storage permission problems

Troubleshooting steps:
1. Check the server logs for specific error messages
2. Verify that the user has completed all required training phases
3. Ensure the PDF template file exists and is accessible
4. Check Supabase Storage permissions

#### Email Distribution Fails

Possible causes:
- MailerSend API key issues
- Invalid email addresses
- Email template problems

Troubleshooting steps:
1. Verify MailerSend API key is valid
2. Check that user email addresses are correct
3. Test email templates using the test scripts
4. Check server logs for specific error messages

#### Certificate Not Showing in Manager Dashboard

Possible causes:
- Database record issues
- Frontend caching
- Permission problems

Troubleshooting steps:
1. Check the database for the certificate record
2. Refresh the page and clear browser cache
3. Verify the user has manager permissions
4. Check for API errors in the browser console

### Logging

The certificate system uses extensive logging to help diagnose issues:

- Generation process logs: Console output with detailed steps
- Error logs: Detailed error information including stack traces
- Email logs: Stored in the `email_notifications` table

## Testing

The system includes several test scripts to verify functionality:

### Certificate Generation Testing

Test script: `scripts/test-certificate-generation.js`

This script tests the PDF certificate generation functionality without sending emails. It can use either mock data or real user data from the database.

Usage:
```
node scripts/test-certificate-generation.js [userId] [certificateType]
```

### Certificate Email Testing

Test script: `scripts/test-certificate-email.js`

This script tests the email distribution functionality for certificates without actually generating a certificate. It uses sample PDF files and mock user data.

Usage:
```
node scripts/test-certificate-email.js [emailType] [testEmail]
```

### Certificate API Testing

Test script: `scripts/test-certificate-api.js`

This script tests the API endpoints for certificate management, including listing certificates, getting certificate details, regenerating certificates, and deleting certificates.

Usage:
```
node scripts/test-certificate-api.js [authToken]
```

These test scripts provide comprehensive coverage of the certificate system's functionality and can be used for both development testing and production troubleshooting.