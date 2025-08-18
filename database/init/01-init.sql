-- Maritime Onboarding System - Database Initialization
-- This script loads the complete database schema and initial data

-- Load complete database schema
\i /docker-entrypoint-initdb.d/schema.sql

-- Load initial data and settings
\i /docker-entrypoint-initdb.d/install.sql
