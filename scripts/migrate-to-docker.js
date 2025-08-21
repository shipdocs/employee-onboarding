#!/usr/bin/env node

/**
 * Migration Script: Supabase to Docker-Only Architecture
 * This script helps migrate from Supabase to pure Docker implementation
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n${'='.repeat(50)}`)
};

class MigrationManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'migration-backup');
    this.errors = [];
    this.warnings = [];
  }

  async run() {
    log.section('🚀 Starting Migration to Docker-Only Architecture');
    
    try {
      await this.createBackup();
      await this.stopServices();
      await this.updateDockerCompose();
      await this.updateEnvironmentVariables();
      await this.refactorSupabaseImports();
      await this.startNewServices();
      await this.initializeStorage();
      await this.runTests();
      
      this.printSummary();
    } catch (error) {
      log.error(`Migration failed: ${error.message}`);
      await this.rollback();
      process.exit(1);
    }
  }

  async createBackup() {
    log.section('📦 Creating Backup');
    
    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Backup important files
    const filesToBackup = [
      'docker-compose.yml',
      '.env',
      '.env.production',
      'lib/supabase.js',
      'package.json'
    ];
    
    for (const file of filesToBackup) {
      if (fs.existsSync(file)) {
        const backupPath = path.join(this.backupDir, path.basename(file));
        fs.copyFileSync(file, backupPath);
        log.success(`Backed up ${file}`);
      }
    }
    
    // Backup database
    try {
      await execAsync('docker exec maritime_database pg_dump -U postgres postgres > migration-backup/database.sql');
      log.success('Database backed up');
    } catch (error) {
      log.warning('Could not backup database (might not be running)');
    }
  }

  async stopServices() {
    log.section('🛑 Stopping Current Services');
    
    try {
      await execAsync('docker-compose down');
      log.success('Services stopped');
    } catch (error) {
      log.warning('No services to stop');
    }
  }

  async updateDockerCompose() {
    log.section('🐳 Updating Docker Compose');
    
    // Check if refactored compose exists
    if (!fs.existsSync('docker-compose.refactored.yml')) {
      log.error('docker-compose.refactored.yml not found');
      throw new Error('Refactored Docker Compose file missing');
    }
    
    // Backup current and replace with refactored
    fs.copyFileSync('docker-compose.yml', 'docker-compose.old.yml');
    fs.copyFileSync('docker-compose.refactored.yml', 'docker-compose.yml');
    log.success('Docker Compose updated');
  }

  async updateEnvironmentVariables() {
    log.section('🔧 Updating Environment Variables');
    
    const envPath = '.env';
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    
    // Remove Supabase variables
    const supabaseVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    for (const varName of supabaseVars) {
      const regex = new RegExp(`^${varName}=.*$`, 'gm');
      envContent = envContent.replace(regex, `# ${varName}=REMOVED`);
    }
    
    // Add new variables if not present
    const newVars = {
      'DB_HOST': 'database',
      'DB_PORT': '5432',
      'DB_NAME': 'maritime',
      'DB_USER': 'postgres',
      'DB_PASSWORD': 'postgres',
      'POSTGREST_URL': 'http://postgrest:3000',
      'MINIO_ENDPOINT': 'minio',
      'MINIO_PORT': '9000',
      'MINIO_ACCESS_KEY': 'minioadmin',
      'MINIO_SECRET_KEY': 'minioadmin',
      'MINIO_USE_SSL': 'false',
      'PGADMIN_EMAIL': 'admin@maritime.com',
      'PGADMIN_PASSWORD': 'admin123'
    };
    
    for (const [key, value] of Object.entries(newVars)) {
      if (!envContent.includes(`${key}=`)) {
        envContent += `\n${key}=${value}`;
        log.success(`Added ${key}`);
      }
    }
    
    fs.writeFileSync(envPath, envContent);
    log.success('Environment variables updated');
  }

  async refactorSupabaseImports() {
    log.section('📝 Refactoring Supabase Imports');
    
    // Create migration mapping
    const migrationMap = {
      "require('../lib/supabase')": "require('../lib/database-direct')",
      "require('../../lib/supabase')": "require('../../lib/database-direct')",
      "require('../../../lib/supabase')": "require('../../../lib/database-direct')",
      "from '../lib/supabase'": "from '../lib/database-direct'",
      "from '../../lib/supabase'": "from '../../lib/database-direct'",
      "from '../../../lib/supabase'": "from '../../../lib/database-direct'"
    };
    
    // Find all JavaScript files
    const findFiles = (dir, fileList = []) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          findFiles(filePath, fileList);
        } else if (file.endsWith('.js')) {
          fileList.push(filePath);
        }
      }
      
      return fileList;
    };
    
    const jsFiles = [
      ...findFiles('api'),
      ...findFiles('lib'),
      ...findFiles('services')
    ];
    
    let refactoredCount = 0;
    
    for (const file of jsFiles) {
      let content = fs.readFileSync(file, 'utf-8');
      let modified = false;
      
      for (const [oldImport, newImport] of Object.entries(migrationMap)) {
        if (content.includes(oldImport)) {
          content = content.replace(new RegExp(oldImport, 'g'), newImport);
          modified = true;
        }
      }
      
      // Update supabase references to use compatible API
      if (content.includes('db.from(')) {
        content = content.replace(/supabase\.from\(/g, 'db.from(');
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(file, content);
        refactoredCount++;
      }
    }
    
    log.success(`Refactored ${refactoredCount} files`);
  }

  async startNewServices() {
    log.section('🚀 Starting New Services');
    
    try {
      log.info('Starting services (this may take a few minutes)...');
      await execAsync('docker-compose up -d');
      
      // Wait for services to be ready
      log.info('Waiting for services to be healthy...');
      await this.waitForServices();
      
      log.success('All services started');
    } catch (error) {
      log.error(`Failed to start services: ${error.message}`);
      throw error;
    }
  }

  async waitForServices() {
    const services = [
      { name: 'Database', check: 'docker exec maritime_database pg_isready -U postgres' },
      { name: 'MinIO', check: 'curl -f http://localhost:9000/minio/health/live' },
      { name: 'Backend', check: 'curl -f http://localhost:3000/health' }
    ];
    
    for (const service of services) {
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          await execAsync(service.check);
          log.success(`${service.name} is ready`);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`${service.name} failed to start`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  async initializeStorage() {
    log.section('💾 Initializing Storage');
    
    try {
      // MinIO buckets are created by the init container
      log.info('Waiting for MinIO initialization...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      log.success('Storage initialized');
    } catch (error) {
      log.warning('Storage initialization may require manual steps');
    }
  }

  async runTests() {
    log.section('🧪 Running Tests');
    
    const tests = [
      { name: 'Database Connection', cmd: 'docker exec maritime_backend node -e "require(\'./lib/database-direct\').query(\'SELECT 1\')"' },
      { name: 'API Health', cmd: 'curl -f http://localhost:3000/health' },
      { name: 'Frontend', cmd: 'curl -f http://localhost' }
    ];
    
    for (const test of tests) {
      try {
        await execAsync(test.cmd);
        log.success(`${test.name} test passed`);
      } catch (error) {
        log.error(`${test.name} test failed`);
        this.errors.push(test.name);
      }
    }
  }

  async rollback() {
    log.section('⏮️  Rolling Back');
    
    try {
      // Restore backed up files
      const files = fs.readdirSync(this.backupDir);
      for (const file of files) {
        const source = path.join(this.backupDir, file);
        const dest = file === 'database.sql' ? null : file;
        
        if (dest) {
          fs.copyFileSync(source, dest);
          log.success(`Restored ${file}`);
        }
      }
      
      // Restart old services
      await execAsync('docker-compose up -d');
      log.success('Rollback completed');
    } catch (error) {
      log.error('Rollback failed - manual intervention required');
    }
  }

  printSummary() {
    log.section('📊 Migration Summary');
    
    if (this.errors.length === 0) {
      log.success('✨ Migration completed successfully!');
      
      console.log('\n📝 Next Steps:');
      console.log('1. Test all functionality thoroughly');
      console.log('2. Update any frontend API calls if needed');
      console.log('3. Configure backups for PostgreSQL and MinIO');
      console.log('4. Remove old Supabase dependencies: npm uninstall @supabase/supabase-js');
      console.log('\n🔗 Access Points:');
      console.log('- Frontend: http://localhost');
      console.log('- Backend API: http://localhost:3000');
      console.log('- PgAdmin: http://localhost:5050');
      console.log('- MinIO Console: http://localhost:9001');
      console.log('- MailHog: http://localhost:8025');
    } else {
      log.warning('Migration completed with errors:');
      this.errors.forEach(error => log.error(`  - ${error}`));
      console.log('\nPlease address these issues manually');
    }
    
    if (this.warnings.length > 0) {
      log.warning('Warnings:');
      this.warnings.forEach(warning => log.warning(`  - ${warning}`));
    }
  }
}

// Run migration
const migration = new MigrationManager();
migration.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});