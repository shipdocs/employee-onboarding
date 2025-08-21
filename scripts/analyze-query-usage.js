#!/usr/bin/env node

/**
 * Analyze Query Usage Script
 * 
 * This script analyzes API endpoints to find direct Supabase queries
 * that should be migrated to use the query abstraction layer
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob').sync;

// Configuration
const API_DIR = path.join(__dirname, '..', 'api');
const QUERY_DIR = path.join(__dirname, '..', 'lib', 'queries');

// Patterns to identify direct Supabase usage
const PATTERNS = {
  // Direct supabase queries
  directSupabase: /supabase\s*\.\s*from\s*\(/g,
  
  // Query abstraction imports
  queryImports: /require\(['"].*\/queries['"]\)|from\s+['"].*\/queries['"]/g,
  
  // Specific query module imports
  specificQueryImports: /require\(['"].*\/(userQueries|trainingQueries|managerQueries|statsQueries|authQueries|workflowQueries)['"]\)/g
};

// Tables and their corresponding query modules
const TABLE_TO_QUERY_MODULE = {
  'users': 'userQueries',
  'training_sessions': 'trainingQueries',
  'training_items': 'trainingQueries',
  'quiz_results': 'trainingQueries',
  'manager_permissions': 'userQueries',
  'manager_crew_assignments': 'managerQueries',
  'notifications': 'notificationQueries',
  'magic_links': 'authQueries',
  'workflow_instances': 'workflowQueries',
  'workflow_steps': 'workflowQueries'
};

async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(API_DIR, filePath);
  
  // Check for query abstraction usage
  const usesQueryAbstraction = PATTERNS.queryImports.test(content) || 
                              PATTERNS.specificQueryImports.test(content);
  
  // Find direct Supabase queries
  const directQueries = [];
  let match;
  
  PATTERNS.directSupabase.lastIndex = 0;
  while ((match = PATTERNS.directSupabase.exec(content)) !== null) {
    // Extract the table name
    const tableMatch = content.substring(match.index, match.index + 200)
      .match(/from\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    
    if (tableMatch) {
      const tableName = tableMatch[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Extract the query type (select, insert, update, delete)
      const queryTypeMatch = content.substring(match.index + match[0].length, match.index + match[0].length + 50)
        .match(/\.(select|insert|update|delete|upsert)\s*\(/);
      
      const queryType = queryTypeMatch ? queryTypeMatch[1] : 'unknown';
      
      directQueries.push({
        table: tableName,
        line: lineNumber,
        queryType,
        suggestedModule: TABLE_TO_QUERY_MODULE[tableName] || 'custom query module'
      });
    }
  }
  
  return {
    file: relativePath,
    usesQueryAbstraction,
    directQueries,
    needsMigration: directQueries.length > 0 && !usesQueryAbstraction
  };
}

async function getExistingQueryMethods() {
  const methods = {};
  
  // Read each query module to extract available methods
  const queryFiles = glob(path.join(QUERY_DIR, '*Queries.js'));
  
  for (const file of queryFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const moduleName = path.basename(file, '.js');
    
    // Extract exported function names
    const exportMatches = content.match(/module\.exports\s*=\s*{([^}]+)}/s);
    if (exportMatches) {
      const exports = exportMatches[1];
      const functionNames = exports.match(/(\w+):/g);
      if (functionNames) {
        methods[moduleName] = functionNames.map(name => name.replace(':', ''));
      }
    }
  }
  
  return methods;
}

async function generateMigrationReport(analysis, existingMethods) {
  const report = {
    totalFiles: analysis.length,
    filesUsingAbstraction: 0,
    filesNeedingMigration: 0,
    totalDirectQueries: 0,
    queriesByTable: {},
    queriesByType: {}
  };
  
  for (const result of analysis) {
    if (result.usesQueryAbstraction) {
      report.filesUsingAbstraction++;
    }
    
    if (result.needsMigration) {
      report.filesNeedingMigration++;
    }
    
    report.totalDirectQueries += result.directQueries.length;
    
    // Count queries by table and type
    for (const query of result.directQueries) {
      report.queriesByTable[query.table] = (report.queriesByTable[query.table] || 0) + 1;
      report.queriesByType[query.queryType] = (report.queriesByType[query.queryType] || 0) + 1;
    }
  }
  
  return report;
}

async function writeMigrationPlan(analysis, report, existingMethods) {
  const plan = `# Database Query Abstraction Migration Plan

Generated on: ${new Date().toISOString()}

## Summary

- Total API files: ${report.totalFiles}
- Files already using abstraction: ${report.filesUsingAbstraction}
- Files needing migration: ${report.filesNeedingMigration}
- Total direct queries to migrate: ${report.totalDirectQueries}

## Queries by Table

${Object.entries(report.queriesByTable)
  .sort(([,a], [,b]) => b - a)
  .map(([table, count]) => `- ${table}: ${count} queries`)
  .join('\n')}

## Queries by Type

${Object.entries(report.queriesByType)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

## Existing Query Methods

${Object.entries(existingMethods)
  .map(([module, methods]) => `
### ${module}
${methods.map(m => `- ${m}()`).join('\n')}`)
  .join('\n')}

## Migration Priority

### High Priority (Authentication & Core Operations)
${analysis
  .filter(r => r.needsMigration && r.file.includes('auth'))
  .map(r => `- ${r.file} (${r.directQueries.length} queries)`)
  .join('\n')}

### Medium Priority (Manager & Training)
${analysis
  .filter(r => r.needsMigration && (r.file.includes('manager') || r.file.includes('training')))
  .map(r => `- ${r.file} (${r.directQueries.length} queries)`)
  .join('\n')}

### Low Priority (Admin & Utilities)
${analysis
  .filter(r => r.needsMigration && (r.file.includes('admin') || r.file.includes('test')))
  .slice(0, 10)
  .map(r => `- ${r.file} (${r.directQueries.length} queries)`)
  .join('\n')}

## Detailed Migration List

${analysis
  .filter(r => r.needsMigration)
  .slice(0, 20)
  .map(result => `
### ${result.file}

Direct queries found: ${result.directQueries.length}

${result.directQueries.map(q => 
  `- Line ${q.line}: ${q.queryType} on '${q.table}' → Use ${q.suggestedModule}`
).join('\n')}
`).join('\n')}

## Recommended Approach

1. **Start with high-frequency tables**: Focus on 'users' and 'training_sessions' first
2. **Create missing query methods**: Add any needed methods to existing query modules
3. **Test thoroughly**: Each migration should include tests
4. **Update imports**: Replace direct supabase imports with query module imports
5. **Leverage caching**: Use cached versions for read-heavy operations

## Next Steps

1. Review existing query methods in lib/queries/
2. Identify missing query patterns that need to be added
3. Start migrating high-priority endpoints
4. Update tests to use query abstraction
5. Document any custom query patterns
`;

  await fs.writeFile(path.join(__dirname, 'query-migration-plan.md'), plan);
  console.log('\n📄 Migration plan written to: scripts/query-migration-plan.md');
}

async function main() {
  console.log('🔍 Analyzing API endpoints for query abstraction usage...\n');
  
  // Get all API files
  const apiFiles = glob(path.join(API_DIR, '**/*.js'), {
    ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js']
  });
  
  console.log(`Found ${apiFiles.length} API files to analyze\n`);
  
  // Get existing query methods
  const existingMethods = await getExistingQueryMethods();
  console.log('📚 Found query modules:', Object.keys(existingMethods).join(', '), '\n');
  
  // Analyze each file
  const analysis = [];
  for (const file of apiFiles) {
    const result = await analyzeFile(file);
    analysis.push(result);
  }
  
  // Generate report
  const report = await generateMigrationReport(analysis, existingMethods);
  
  // Display results
  console.log('📊 Analysis Results:');
  console.log('===================\n');
  console.log(`Files using query abstraction: ${report.filesUsingAbstraction}/${report.totalFiles}`);
  console.log(`Files needing migration: ${report.filesNeedingMigration}`);
  console.log(`Total direct queries: ${report.totalDirectQueries}\n`);
  
  console.log('Top tables with direct queries:');
  Object.entries(report.queriesByTable)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} queries`);
    });
  
  // Write migration plan
  await writeMigrationPlan(analysis, report, existingMethods);
  
  console.log('\n✅ Analysis complete!');
  console.log('📋 Next steps:');
  console.log('1. Review the migration plan');
  console.log('2. Add missing query methods to lib/queries/');
  console.log('3. Start migrating endpoints in priority order');
  console.log('4. Test each migration thoroughly\n');
}

// Run the analysis
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { analyzeFile, generateMigrationReport };