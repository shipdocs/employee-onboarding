#!/usr/bin/env node

/**
 * Settings Optimization Script
 * Analyzes current .env and database settings to optimize configuration management
 * Moves appropriate settings from .env to database for better management
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const color = colors[level] || colors.reset;
    console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

// Configuration categories
const CONFIG_CATEGORIES = {
    // Should stay in .env (infrastructure secrets)
    INFRASTRUCTURE: {
        description: 'Infrastructure secrets and connection details',
        items: [
            'DB_PASSWORD', 'DB_USER', 'DB_NAME', 'DATABASE_URL',
            'JWT_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL',
            'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD',
            'PGADMIN_EMAIL', 'PGLADMIN_PASSWORD',
            'CRON_SECRET', 'API_KEY',
            'EMAIL_SERVER', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD',
            'VERCEL_OIDC_TOKEN', 'MFA_ENCRYPTION_KEY'
        ]
    },
    
    // Should move to database (application settings)
    APPLICATION: {
        description: 'Application settings that can be managed through UI',
        items: [
            'HR_EMAIL', 'QHSE_EMAIL',
            'EMAIL_VERIFICATION_ENABLED', 'EMAIL_VERIFICATION_TIMEOUT',
            'EMAIL_CLEANUP_ENABLED', 'EMAIL_CLEANUP_INTERVAL_HOURS',
            'EMAIL_CLEANUP_BATCH_SIZE', 'EMAIL_CLEANUP_MAX_BATCHES',
            'MFA_ENABLED', 'MFA_ENFORCEMENT', 'MFA_BACKUP_CODES',
            'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS',
            'MAGIC_LINK_EXPIRY'
        ]
    },
    
    // Environment-specific (should stay in .env)
    ENVIRONMENT: {
        description: 'Environment-specific configuration',
        items: [
            'NODE_ENV', 'BASE_URL', 'EMAIL_TLS'
        ]
    },
    
    // Testing (should stay in .env)
    TESTING: {
        description: 'Testing and development configuration',
        items: [
            'TEST_EMAIL_DOMAIN'
        ]
    }
};

// Database settings that should be created
const DATABASE_SETTINGS = [
    // Email settings
    { category: 'email', key: 'hr_email', value: 'hr@yourcompany.com', description: 'HR department email address', type: 'email' },
    { category: 'email', key: 'qhse_email', value: 'qhse@yourcompany.com', description: 'QHSE department email address', type: 'email' },
    { category: 'email', key: 'verification_enabled', value: 'true', description: 'Enable email verification', type: 'boolean' },
    { category: 'email', key: 'verification_timeout', value: '86400', description: 'Email verification timeout (seconds)', type: 'number' },
    { category: 'email', key: 'cleanup_enabled', value: 'true', description: 'Enable email cleanup', type: 'boolean' },
    { category: 'email', key: 'cleanup_interval_hours', value: '24', description: 'Email cleanup interval (hours)', type: 'number' },
    { category: 'email', key: 'cleanup_batch_size', value: '100', description: 'Email cleanup batch size', type: 'number' },
    { category: 'email', key: 'cleanup_max_batches', value: '10', description: 'Maximum cleanup batches', type: 'number' },
    
    // Security settings
    { category: 'security', key: 'mfa_enabled', value: 'true', description: 'Enable multi-factor authentication', type: 'boolean' },
    { category: 'security', key: 'mfa_enforcement', value: 'optional', description: 'MFA enforcement level', type: 'select', options: ['optional', 'required'] },
    { category: 'security', key: 'mfa_backup_codes', value: '8', description: 'Number of MFA backup codes', type: 'number' },
    { category: 'security', key: 'magic_link_expiry', value: '3600', description: 'Magic link expiry (seconds)', type: 'number' },
    { category: 'security', key: 'rate_limit_window', value: '60000', description: 'Rate limit window (milliseconds)', type: 'number' },
    { category: 'security', key: 'rate_limit_max_requests', value: '100', description: 'Maximum requests per window', type: 'number' },
    
    // Application settings
    { category: 'application', key: 'company_name', value: 'Maritime Onboarding System', description: 'Company name', type: 'text' },
    { category: 'application', key: 'support_email', value: 'support@yourcompany.com', description: 'Support email address', type: 'email' },
    { category: 'application', key: 'session_timeout', value: '28800', description: 'Session timeout (seconds)', type: 'number' },
    { category: 'application', key: 'max_login_attempts', value: '5', description: 'Maximum login attempts', type: 'number' },
    { category: 'application', key: 'password_min_length', value: '8', description: 'Minimum password length', type: 'number' },
    { category: 'application', key: 'onboarding_deadline_days', value: '14', description: 'Onboarding deadline (days)', type: 'number' },
    
    // Feature flags
    { category: 'features', key: 'real_time_notifications', value: 'true', description: 'Enable real-time notifications', type: 'boolean' },
    { category: 'features', key: 'video_training', value: 'true', description: 'Enable video training', type: 'boolean' },
    { category: 'features', key: 'advanced_reporting', value: 'false', description: 'Enable advanced reporting', type: 'boolean' },
    { category: 'features', key: 'api_access', value: 'true', description: 'Enable API access', type: 'boolean' }
];

// Analyze current .env file
function analyzeEnvFile() {
    log('blue', 'Analyzing current .env configuration...');
    
    const envPath = path.join(process.cwd(), '.env.example');
    if (!fs.existsSync(envPath)) {
        log('red', '.env.example file not found');
        return null;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            envVars[key] = valueParts.join('=');
        }
    });
    
    return envVars;
}

// Categorize environment variables
function categorizeEnvVars(envVars) {
    log('blue', 'Categorizing environment variables...');
    
    const categorized = {
        infrastructure: [],
        application: [],
        environment: [],
        testing: [],
        unknown: []
    };
    
    Object.keys(envVars).forEach(key => {
        let found = false;
        
        for (const [category, config] of Object.entries(CONFIG_CATEGORIES)) {
            if (config.items.includes(key)) {
                categorized[category.toLowerCase()].push(key);
                found = true;
                break;
            }
        }
        
        if (!found) {
            categorized.unknown.push(key);
        }
    });
    
    return categorized;
}

// Generate optimized .env template
function generateOptimizedEnv(envVars, categorized) {
    log('blue', 'Generating optimized .env template...');
    
    let optimizedEnv = `# Maritime Onboarding Platform - Optimized Environment Configuration
# This file contains only infrastructure secrets and environment-specific settings
# Application settings are managed through the database settings system

# ⚠️  SECURITY WARNING ⚠️
# NEVER commit this file with real values to version control!
# Generate strong, unique passwords for each service.

`;

    // Add infrastructure settings
    optimizedEnv += `# =============================================================================
# INFRASTRUCTURE SECRETS (Keep in .env)
# =============================================================================
`;
    
    categorized.infrastructure.forEach(key => {
        const value = envVars[key] || 'your_secure_value_here';
        const description = getEnvVarDescription(key);
        if (description) {
            optimizedEnv += `# ${description}\n`;
        }
        optimizedEnv += `${key}=${value}\n`;
    });
    
    // Add environment settings
    optimizedEnv += `\n# =============================================================================
# ENVIRONMENT CONFIGURATION (Keep in .env)
# =============================================================================
`;
    
    categorized.environment.forEach(key => {
        const value = envVars[key] || 'your_value_here';
        const description = getEnvVarDescription(key);
        if (description) {
            optimizedEnv += `# ${description}\n`;
        }
        optimizedEnv += `${key}=${value}\n`;
    });
    
    // Add testing settings
    if (categorized.testing.length > 0) {
        optimizedEnv += `\n# =============================================================================
# TESTING CONFIGURATION (Keep in .env)
# =============================================================================
`;
        
        categorized.testing.forEach(key => {
            const value = envVars[key] || 'your_test_value_here';
            const description = getEnvVarDescription(key);
            if (description) {
                optimizedEnv += `# ${description}\n`;
            }
            optimizedEnv += `${key}=${value}\n`;
        });
    }
    
    // Add note about moved settings
    optimizedEnv += `\n# =============================================================================
# MOVED TO DATABASE SETTINGS
# =============================================================================
# The following settings have been moved to the database for better management:
# - Email configuration (HR/QHSE emails, verification settings)
# - Security settings (MFA, rate limiting, magic links)
# - Application settings (company info, timeouts, limits)
# - Feature flags (notifications, training, reporting)
#
# These can now be managed through the admin interface at:
# https://yourdomain.com/admin/settings
# =============================================================================
`;

    return optimizedEnv;
}

// Get description for environment variable
function getEnvVarDescription(key) {
    const descriptions = {
        'DB_PASSWORD': 'Database password (minimum 16 characters)',
        'JWT_SECRET': 'JWT secret for token signing (minimum 32 characters)',
        'NEXTAUTH_SECRET': 'NextAuth secret (minimum 32 characters)',
        'MINIO_ROOT_PASSWORD': 'MinIO storage password',
        'PGLADMIN_PASSWORD': 'PgAdmin interface password',
        'NODE_ENV': 'Environment: development | test | production',
        'BASE_URL': 'Base URL for the application',
        'EMAIL_SERVER': 'SMTP server hostname',
        'EMAIL_PORT': 'SMTP server port',
        'EMAIL_USER': 'SMTP username',
        'EMAIL_PASSWORD': 'SMTP password'
    };
    
    return descriptions[key];
}

// Generate database settings migration
function generateDatabaseSettingsMigration() {
    log('blue', 'Generating database settings migration...');
    
    let migration = `-- Database Settings Migration
-- Moves application settings from .env to database for better management

-- Insert optimized system settings
INSERT INTO system_settings (category, key, value, description, type, options, is_required, created_at, updated_at)
VALUES
`;

    const values = DATABASE_SETTINGS.map(setting => {
        const options = setting.options ? `'${JSON.stringify(setting.options)}'` : 'NULL';
        return `  ('${setting.category}', '${setting.key}', '${setting.value}', '${setting.description}', '${setting.type}', ${options}, true, NOW(), NOW())`;
    });
    
    migration += values.join(',\n');
    migration += `
ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  options = EXCLUDED.options,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category_key ON system_settings(category, key);
`;

    return migration;
}

// Main optimization function
function main() {
    console.log(`${colors.blue}🔧 Maritime Onboarding - Settings Optimization${colors.reset}`);
    console.log(`${colors.blue}===============================================${colors.reset}\n`);
    
    // Analyze current configuration
    const envVars = analyzeEnvFile();
    if (!envVars) {
        log('red', 'Failed to analyze .env file');
        process.exit(1);
    }
    
    const categorized = categorizeEnvVars(envVars);
    
    // Show analysis results
    log('green', 'Configuration Analysis Results:');
    console.log(`  📊 Total environment variables: ${Object.keys(envVars).length}`);
    console.log(`  🔒 Infrastructure secrets: ${categorized.infrastructure.length}`);
    console.log(`  ⚙️ Application settings: ${categorized.application.length}`);
    console.log(`  🌍 Environment config: ${categorized.environment.length}`);
    console.log(`  🧪 Testing config: ${categorized.testing.length}`);
    console.log(`  ❓ Unknown/uncategorized: ${categorized.unknown.length}\n`);
    
    if (categorized.unknown.length > 0) {
        log('yellow', 'Unknown variables that need categorization:');
        categorized.unknown.forEach(key => console.log(`    - ${key}`));
        console.log('');
    }
    
    // Generate optimized files
    const optimizedEnv = generateOptimizedEnv(envVars, categorized);
    const dbMigration = generateDatabaseSettingsMigration();
    
    // Write optimized files
    fs.writeFileSync('.env.optimized', optimizedEnv);
    fs.writeFileSync('database/migrations/optimize-settings.sql', dbMigration);
    
    log('green', '✅ Optimization completed!');
    console.log('\n📁 Generated files:');
    console.log('  - .env.optimized (new environment template)');
    console.log('  - database/migrations/optimize-settings.sql (database migration)');
    
    console.log('\n📋 Next steps:');
    console.log('  1. Review .env.optimized and replace .env.example');
    console.log('  2. Run the database migration');
    console.log('  3. Update application code to use database settings');
    console.log('  4. Test the optimized configuration');
    
    console.log('\n🔒 Security improvements:');
    console.log(`  - Reduced .env variables from ${Object.keys(envVars).length} to ${categorized.infrastructure.length + categorized.environment.length + categorized.testing.length}`);
    console.log(`  - Moved ${categorized.application.length} settings to database management`);
    console.log('  - Settings can now be managed through admin interface');
    console.log('  - Better separation of secrets vs configuration');
}

// Run optimization
if (require.main === module) {
    main();
}

module.exports = {
    analyzeEnvFile,
    categorizeEnvVars,
    generateOptimizedEnv,
    generateDatabaseSettingsMigration,
    CONFIG_CATEGORIES,
    DATABASE_SETTINGS
};
