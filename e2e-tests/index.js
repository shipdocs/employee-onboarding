#!/usr/bin/env node

const path = require('path');
const { program } = require('commander');
const TestRunner = require('./src/TestRunner');

// CLI configuration
program
  .name('maritime-e2e')
  .description('E2E Test Suite for Maritime Onboarding System')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to config file', './config.json')
  .option('-h, --headless', 'Run tests in headless mode', true)
  .option('--no-headless', 'Run tests with browser visible')
  .option('-v, --video', 'Record videos of test execution', true)
  .option('--no-video', 'Disable video recording')
  .option('-m, --modules <modules...>', 'Run specific modules only')
  .option('-s, --skip <modules...>', 'Skip specific modules')
  .option('-p, --parallel', 'Run tests in parallel (experimental)')
  .option('-e, --env <environment>', 'Environment to test', 'local')
  .option('--base-url <url>', 'Override base URL from config')
  .option('--timeout <ms>', 'Override timeout from config')
  .action(async (options) => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║        🚢 Maritime Onboarding E2E Test Suite         ║
║                     Version 1.0.0                    ║
╚══════════════════════════════════════════════════════╝
    `);

    try {
      // Load config
      const configPath = path.resolve(options.config);
      const runner = new TestRunner(configPath);

      // Override config with CLI options
      if (options.baseUrl) {
        runner.config.baseUrl = options.baseUrl;
      }
      if (options.timeout) {
        runner.config.timeout = parseInt(options.timeout);
      }

      // Environment-specific config
      if (options.env !== 'local') {
        const envConfig = {
          staging: 'https://staging.onboarding.burando.online',
          production: 'https://onboarding.burando.online'
        };
        if (envConfig[options.env]) {
          runner.config.baseUrl = envConfig[options.env];
          console.log(`🌍 Testing against ${options.env} environment: ${runner.config.baseUrl}\n`);
        }
      }

      // Run tests
      const exitCode = await runner.run({
        headless: options.headless,
        recordVideo: options.video,
        modules: options.modules,
        skipModules: options.skip,
        parallel: options.parallel
      });

      process.exit(exitCode);
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    }
  });

// Quick test commands
program
  .command('auth')
  .description('Run authentication tests only')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    await runner.run({ modules: ['authentication'] });
  });

program
  .command('crew')
  .description('Run crew onboarding tests only')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    await runner.run({ modules: ['crew onboarding'] });
  });

program
  .command('manager')
  .description('Run manager dashboard tests only')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    await runner.run({ modules: ['manager dashboard'] });
  });

program
  .command('admin')
  .description('Run admin tests only')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    await runner.run({ modules: ['admin functions'] });
  });

program
  .command('performance')
  .description('Run performance tests only')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    await runner.run({ modules: ['performance'] });
  });

program
  .command('smoke')
  .description('Run quick smoke tests (auth + basic flows)')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    console.log('🔥 Running smoke tests...\n');
    await runner.run({ 
      modules: ['authentication', 'crew onboarding'],
      headless: true
    });
  });

program
  .command('full')
  .description('Run full test suite with all features')
  .action(async () => {
    const runner = new TestRunner('./config.json');
    console.log('🎯 Running full test suite...\n');
    await runner.run({ 
      headless: true,
      recordVideo: true
    });
  });

// Interactive mode
program
  .command('interactive')
  .description('Run tests in interactive mode')
  .action(async () => {
    const inquirer = require('inquirer');
    
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'modules',
        message: 'Select modules to test:',
        choices: [
          'Authentication',
          'Crew Onboarding',
          'Manager Dashboard',
          'Admin Functions',
          'Performance'
        ],
        default: ['Authentication', 'Crew Onboarding']
      },
      {
        type: 'confirm',
        name: 'headless',
        message: 'Run in headless mode?',
        default: false
      },
      {
        type: 'confirm',
        name: 'video',
        message: 'Record videos?',
        default: true
      },
      {
        type: 'list',
        name: 'env',
        message: 'Select environment:',
        choices: ['local', 'staging', 'production'],
        default: 'local'
      }
    ]);

    const runner = new TestRunner('./config.json');
    
    // Set environment
    if (answers.env !== 'local') {
      const envConfig = {
        staging: 'https://staging.onboarding.burando.online',
        production: 'https://onboarding.burando.online'
      };
      runner.config.baseUrl = envConfig[answers.env];
    }

    await runner.run({
      modules: answers.modules,
      headless: answers.headless,
      recordVideo: answers.video
    });
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}