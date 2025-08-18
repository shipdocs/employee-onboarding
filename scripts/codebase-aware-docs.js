#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CodebaseAwareDocAnalyzer {
    constructor() {
        this.codebaseInfo = {
            apiEndpoints: [],
            reactComponents: [],
            databaseSchema: [],
            configOptions: [],
            dependencies: [],
            features: []
        };
        this.documentationGaps = {
            undocumentedEndpoints: [],
            undocumentedComponents: [],
            outdatedExamples: [],
            missingSetupSteps: [],
            incorrectInfo: []
        };
    }

    async analyze() {
        console.log('🔍 Analyzing codebase for documentation accuracy...\n');
        
        await this.scanCodebase();
        await this.analyzeDocumentation();
        await this.findGaps();
        await this.generateRecommendations();
        
        this.generateReport();
    }

    async scanCodebase() {
        console.log('📂 Scanning actual codebase...');
        
        // Scan API routes
        await this.scanApiRoutes();
        
        // Scan React components
        await this.scanReactComponents();
        
        // Scan database schema
        await this.scanDatabaseSchema();
        
        // Scan package.json for dependencies
        await this.scanDependencies();
        
        // Scan environment variables
        await this.scanEnvironmentConfig();
        
        console.log('   Codebase scan complete\n');
    }

    async scanApiRoutes() {
        console.log('   🛣️  Scanning API routes...');

        // Scan multiple API patterns
        await this.scanDirectApiRoutes();
        await this.scanNextJsApiRoutes();

        console.log(`     Found ${this.codebaseInfo.apiEndpoints.length} API endpoints`);
    }

    async scanDirectApiRoutes() {
        const apiDir = './api';
        if (!fs.existsSync(apiDir)) {
            console.log('     No /api directory found');
            return;
        }

        const apiFiles = this.getAllFiles(apiDir, '.js', '.ts');

        for (const file of apiFiles) {
            const content = fs.readFileSync(file, 'utf8');

            // Check for handler function (Vercel API pattern)
            if (content.includes('function handler') || content.includes('async function handler')) {
                const endpoint = {
                    file: file,
                    path: this.extractVercelApiPath(file),
                    method: this.extractHttpMethods(content),
                    hasAuth: this.hasAuthentication(content),
                    hasValidation: this.hasValidation(content),
                    responseType: this.extractResponseType(content),
                    pattern: 'vercel-api'
                };
                this.codebaseInfo.apiEndpoints.push(endpoint);
            }
        }
    }

    async scanNextJsApiRoutes() {
        const pagesApiDir = './pages/api';
        if (!fs.existsSync(pagesApiDir)) {
            console.log('     No /pages/api directory found');
            return;
        }

        const apiFiles = this.getAllFiles(pagesApiDir, '.js', '.ts');

        for (const file of apiFiles) {
            const content = fs.readFileSync(file, 'utf8');

            // Check for Next.js API pattern
            if (content.includes('export default') && (content.includes('function handler') || content.includes('req, res'))) {
                const endpoint = {
                    file: file,
                    path: this.extractNextJsApiPath(file),
                    method: this.extractHttpMethods(content),
                    hasAuth: this.hasAuthentication(content),
                    hasValidation: this.hasValidation(content),
                    responseType: this.extractResponseType(content),
                    pattern: 'nextjs-api'
                };
                this.codebaseInfo.apiEndpoints.push(endpoint);
            }
        }
    }

    async scanReactComponents() {
        console.log('   ⚛️  Scanning React components...');
        
        const clientDir = './client/src';
        if (!fs.existsSync(clientDir)) {
            console.log('     No client directory found');
            return;
        }

        const componentFiles = this.getAllFiles(clientDir, '.js', '.jsx', '.ts', '.tsx');
        
        for (const file of componentFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Extract component definitions
            const componentPatterns = [
                /export\s+default\s+function\s+(\w+)/g,
                /const\s+(\w+)\s*=\s*\(\s*\)\s*=>/g,
                /function\s+(\w+)\s*\(/g,
                /export\s+const\s+(\w+)\s*=\s*\(/g
            ];

            for (const pattern of componentPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const component = {
                        name: match[1],
                        file: file,
                        hasProps: content.includes('props') || content.includes('Props'),
                        hasState: content.includes('useState') || content.includes('useReducer'),
                        hasEffects: content.includes('useEffect'),
                        isPage: file.includes('/pages/') || file.includes('Page.'),
                        exports: this.extractExports(content)
                    };
                    this.codebaseInfo.reactComponents.push(component);
                }
            }
        }
        
        console.log(`     Found ${this.codebaseInfo.reactComponents.length} React components`);
    }

    async scanDatabaseSchema() {
        console.log('   🗄️  Scanning database schema...');
        
        // Look for schema files, migrations, or SQL files
        const schemaPaths = [
            './supabase/migrations',
            './migrations',
            './schema',
            './database'
        ];

        for (const schemaPath of schemaPaths) {
            if (fs.existsSync(schemaPath)) {
                const schemaFiles = this.getAllFiles(schemaPath, '.sql', '.js');
                
                for (const file of schemaFiles) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Extract table definitions
                    const tableMatches = content.match(/CREATE TABLE\s+(\w+)/gi);
                    if (tableMatches) {
                        tableMatches.forEach(match => {
                            const tableName = match.split(' ')[2];
                            this.codebaseInfo.databaseSchema.push({
                                table: tableName,
                                file: file,
                                type: 'table'
                            });
                        });
                    }
                    
                    // Extract function definitions
                    const functionMatches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/gi);
                    if (functionMatches) {
                        functionMatches.forEach(match => {
                            const functionName = match.split(/\s+/).pop();
                            this.codebaseInfo.databaseSchema.push({
                                function: functionName,
                                file: file,
                                type: 'function'
                            });
                        });
                    }
                }
            }
        }
        
        console.log(`     Found ${this.codebaseInfo.databaseSchema.length} database objects`);
    }

    async scanDependencies() {
        console.log('   📦 Scanning dependencies...');
        
        const packageJsonPath = './package.json';
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            this.codebaseInfo.dependencies = {
                production: Object.keys(packageJson.dependencies || {}),
                development: Object.keys(packageJson.devDependencies || {}),
                scripts: Object.keys(packageJson.scripts || {})
            };
        }
        
        console.log(`     Found ${this.codebaseInfo.dependencies.production?.length || 0} production dependencies`);
    }

    async scanEnvironmentConfig() {
        console.log('   🔧 Scanning environment configuration...');
        
        // Scan for environment variable usage
        const configFiles = [
            './vercel.json',
            './.env.example',
            './.env.local.example',
            './config/database.js'
        ];

        const envVars = new Set();
        
        // Scan code for process.env usage
        const allFiles = this.getAllFiles('.', '.js', '.jsx', '.ts', '.tsx');
        for (const file of allFiles.slice(0, 50)) { // Limit to avoid too much processing
            try {
                const content = fs.readFileSync(file, 'utf8');
                const envMatches = content.match(/process\.env\.(\w+)/g);
                if (envMatches) {
                    envMatches.forEach(match => {
                        const varName = match.split('.')[2];
                        envVars.add(varName);
                    });
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }
        
        this.codebaseInfo.configOptions = Array.from(envVars);
        console.log(`     Found ${this.codebaseInfo.configOptions.length} environment variables`);
    }

    async analyzeDocumentation() {
        console.log('📚 Analyzing existing documentation...');
        
        const docFiles = this.getAllFiles('./docs', '.md');
        
        for (const docFile of docFiles) {
            const content = fs.readFileSync(docFile, 'utf8');
            
            // Check for API endpoint documentation
            const apiDocPattern = /(?:GET|POST|PUT|DELETE|PATCH)\s+\/api\/[\w\/\-]+/g;
            let match;
            while ((match = apiDocPattern.exec(content)) !== null) {
                const documentedEndpoint = match[0];
                
                // Check if this endpoint actually exists in code
                const exists = this.codebaseInfo.apiEndpoints.some(ep => 
                    documentedEndpoint.includes(ep.path)
                );
                
                if (!exists) {
                    this.documentationGaps.incorrectInfo.push({
                        file: docFile,
                        issue: `Documented endpoint not found in code: ${documentedEndpoint}`,
                        type: 'outdated_api'
                    });
                }
            }
        }
        
        console.log('   Documentation analysis complete\n');
    }

    async findGaps() {
        console.log('🔍 Finding documentation gaps...');
        
        // Find undocumented API endpoints
        for (const endpoint of this.codebaseInfo.apiEndpoints) {
            const isDocumented = await this.isEndpointDocumented(endpoint);
            if (!isDocumented) {
                this.documentationGaps.undocumentedEndpoints.push(endpoint);
            }
        }
        
        // Find undocumented major components
        const majorComponents = this.codebaseInfo.reactComponents.filter(comp => 
            comp.isPage || comp.name.includes('Page') || comp.name.includes('Dashboard')
        );
        
        for (const component of majorComponents) {
            const isDocumented = await this.isComponentDocumented(component);
            if (!isDocumented) {
                this.documentationGaps.undocumentedComponents.push(component);
            }
        }
        
        console.log(`   Found ${this.documentationGaps.undocumentedEndpoints.length} undocumented endpoints`);
        console.log(`   Found ${this.documentationGaps.undocumentedComponents.length} undocumented components`);
        console.log();
    }

    async generateRecommendations() {
        console.log('💡 Generating intelligent recommendations...');

        // Generate API documentation
        await this.generateApiDocs();

        // Generate component documentation
        await this.generateComponentDocs();

        // Generate setup documentation
        await this.generateSetupDocs();

        console.log('   Recommendations generated\n');
    }

    async generateApiDocs() {
        console.log('   📝 Generating API documentation from code...');
        console.log(`   📊 Processing ${this.codebaseInfo.apiEndpoints.length} endpoints...`);

        let apiDoc = `# API Reference

*Auto-generated from codebase analysis on ${new Date().toISOString().split('T')[0]}*

## Available Endpoints

Found ${this.codebaseInfo.apiEndpoints.length} API endpoints in the codebase.

`;

        // Group endpoints by category
        const endpointsByCategory = {};
        for (const endpoint of this.codebaseInfo.apiEndpoints) {
            const category = endpoint.path.split('/')[2] || 'general';
            if (!endpointsByCategory[category]) {
                endpointsByCategory[category] = [];
            }
            endpointsByCategory[category].push(endpoint);
        }

        console.log(`   📁 Found ${Object.keys(endpointsByCategory).length} categories:`, Object.keys(endpointsByCategory));

        for (const [category, endpoints] of Object.entries(endpointsByCategory)) {
            apiDoc += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

            for (const endpoint of endpoints) {
                apiDoc += `#### \`${endpoint.method.toUpperCase()} ${endpoint.path}\`\n\n`;
                apiDoc += `**File**: \`${endpoint.file}\`\n\n`;

                if (endpoint.hasAuth) {
                    apiDoc += `🔒 **Requires Authentication**\n\n`;
                }

                if (endpoint.hasValidation) {
                    apiDoc += `✅ **Has Input Validation**\n\n`;
                }

                apiDoc += `**Response Type**: ${endpoint.responseType}\n\n`;
                apiDoc += `---\n\n`;
            }
        }

        fs.writeFileSync('./docs/developers/api-reference-generated.md', apiDoc);
        console.log('     Generated API documentation');
    }

    async generateComponentDocs() {
        console.log('   ⚛️ Generating component documentation...');

        let componentDoc = `# Component Reference

*Auto-generated from codebase analysis on ${new Date().toISOString().split('T')[0]}*

## Available Components

`;

        // Group components by type
        const pages = this.codebaseInfo.reactComponents.filter(c => c.isPage);
        const components = this.codebaseInfo.reactComponents.filter(c => !c.isPage);

        if (pages.length > 0) {
            componentDoc += `### Pages\n\n`;
            for (const page of pages) {
                componentDoc += `#### ${page.name}\n\n`;
                componentDoc += `**File**: \`${page.file}\`\n\n`;
                componentDoc += `**Features**:\n`;
                if (page.hasProps) componentDoc += `- Uses props\n`;
                if (page.hasState) componentDoc += `- Has state management\n`;
                if (page.hasEffects) componentDoc += `- Has side effects\n`;
                componentDoc += `\n---\n\n`;
            }
        }

        if (components.length > 0) {
            componentDoc += `### Components\n\n`;
            for (const component of components.slice(0, 20)) { // Limit to avoid huge docs
                componentDoc += `#### ${component.name}\n\n`;
                componentDoc += `**File**: \`${component.file}\`\n\n`;
                if (component.exports.length > 0) {
                    componentDoc += `**Exports**: ${component.exports.join(', ')}\n\n`;
                }
                componentDoc += `---\n\n`;
            }
        }

        fs.writeFileSync('./docs/developers/component-reference-generated.md', componentDoc);
        console.log('     Generated component documentation');
    }

    async generateSetupDocs() {
        console.log('   🔧 Generating setup documentation...');

        let setupDoc = `# Development Setup

*Auto-generated from codebase analysis on ${new Date().toISOString().split('T')[0]}*

## Required Environment Variables

Based on code analysis, these environment variables are used:

`;

        for (const envVar of this.codebaseInfo.configOptions.slice(0, 20)) {
            setupDoc += `- \`${envVar}\`\n`;
        }

        setupDoc += `\n## Dependencies\n\n### Production Dependencies\n\n`;

        for (const dep of this.codebaseInfo.dependencies.production?.slice(0, 10) || []) {
            setupDoc += `- ${dep}\n`;
        }

        setupDoc += `\n### Development Dependencies\n\n`;

        for (const dep of this.codebaseInfo.dependencies.development?.slice(0, 10) || []) {
            setupDoc += `- ${dep}\n`;
        }

        setupDoc += `\n## Available Scripts\n\n`;

        for (const script of Object.keys(this.codebaseInfo.dependencies.scripts || {})) {
            setupDoc += `- \`npm run ${script}\`\n`;
        }

        fs.writeFileSync('./docs/developers/setup-generated.md', setupDoc);
        console.log('     Generated setup documentation');
    }

    // Helper methods
    getAllFiles(dir, ...extensions) {
        if (!fs.existsSync(dir)) return [];
        
        const files = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                files.push(...this.getAllFiles(fullPath, ...extensions));
            } else if (extensions.some(ext => item.endsWith(ext))) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    extractVercelApiPath(file) {
        // Extract endpoint path from /api directory structure
        const relativePath = path.relative('./api', file);
        let apiPath = '/api/' + relativePath.replace(/\.(js|ts)$/, '').replace(/\/index$/, '');

        // Handle dynamic routes [param] -> :param
        apiPath = apiPath.replace(/\[([^\]]+)\]/g, ':$1');

        return apiPath;
    }

    extractNextJsApiPath(file) {
        // Extract endpoint path from /pages/api directory structure
        const relativePath = path.relative('./pages/api', file);
        let apiPath = '/api/' + relativePath.replace(/\.(js|ts)$/, '').replace(/\/index$/, '');

        // Handle dynamic routes [param] -> :param
        apiPath = apiPath.replace(/\[([^\]]+)\]/g, ':$1');

        return apiPath;
    }

    extractHttpMethods(content) {
        const methods = [];

        // Check for explicit method handling
        if (content.includes("req.method === 'GET'") || content.includes('GET')) methods.push('GET');
        if (content.includes("req.method === 'POST'") || content.includes('POST')) methods.push('POST');
        if (content.includes("req.method === 'PUT'") || content.includes('PUT')) methods.push('PUT');
        if (content.includes("req.method === 'DELETE'") || content.includes('DELETE')) methods.push('DELETE');
        if (content.includes("req.method === 'PATCH'") || content.includes('PATCH')) methods.push('PATCH');

        return methods.length > 0 ? methods.join(', ') : 'HANDLER';
    }

    hasAuthentication(content) {
        return content.includes('verifyToken') ||
               content.includes('requireAuth') ||
               content.includes('requireManager') ||
               content.includes('requireAdmin') ||
               content.includes('Authorization') ||
               content.includes('Bearer');
    }

    hasValidation(content) {
        return content.includes('validate') ||
               content.includes('schema') ||
               content.includes('validators') ||
               content.includes('sanitize') ||
               content.includes('checkBodySize');
    }

    extractResponseType(content) {
        if (content.includes('res.json')) return 'json';
        if (content.includes('res.send')) return 'text';
        if (content.includes('res.redirect')) return 'redirect';
        return 'unknown';
    }

    extractExports(content) {
        const exports = [];
        const exportPattern = /export\s+(?:const|function|class)\s+(\w+)/g;
        let match;
        while ((match = exportPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }
        return exports;
    }

    async isEndpointDocumented(endpoint) {
        // Check if endpoint is mentioned in any documentation
        const docFiles = this.getAllFiles('./docs', '.md');
        
        for (const docFile of docFiles) {
            const content = fs.readFileSync(docFile, 'utf8');
            if (content.includes(endpoint.path)) {
                return true;
            }
        }
        
        return false;
    }

    async isComponentDocumented(component) {
        // Check if component is mentioned in any documentation
        const docFiles = this.getAllFiles('./docs', '.md');
        
        for (const docFile of docFiles) {
            const content = fs.readFileSync(docFile, 'utf8');
            if (content.includes(component.name)) {
                return true;
            }
        }
        
        return false;
    }

    generateReport() {
        console.log('📊 CODEBASE-AWARE DOCUMENTATION ANALYSIS');
        console.log('='.repeat(50));
        
        console.log('\n🏗️ CODEBASE REALITY:');
        console.log(`   API Endpoints: ${this.codebaseInfo.apiEndpoints.length}`);
        console.log(`   React Components: ${this.codebaseInfo.reactComponents.length}`);
        console.log(`   Database Objects: ${this.codebaseInfo.databaseSchema.length}`);
        console.log(`   Environment Variables: ${this.codebaseInfo.configOptions.length}`);
        console.log(`   Dependencies: ${this.codebaseInfo.dependencies.production?.length || 0}`);
        
        console.log('\n🚨 DOCUMENTATION GAPS:');
        console.log(`   Undocumented Endpoints: ${this.documentationGaps.undocumentedEndpoints.length}`);
        console.log(`   Undocumented Components: ${this.documentationGaps.undocumentedComponents.length}`);
        console.log(`   Incorrect Information: ${this.documentationGaps.incorrectInfo.length}`);
        
        if (this.documentationGaps.undocumentedEndpoints.length > 0) {
            console.log('\n🛣️ TOP UNDOCUMENTED ENDPOINTS:');
            this.documentationGaps.undocumentedEndpoints.slice(0, 5).forEach(ep => {
                console.log(`   ${ep.method.toUpperCase()} ${ep.path} (${path.basename(ep.file)})`);
            });
        }
        
        if (this.documentationGaps.undocumentedComponents.length > 0) {
            console.log('\n⚛️ TOP UNDOCUMENTED COMPONENTS:');
            this.documentationGaps.undocumentedComponents.slice(0, 5).forEach(comp => {
                console.log(`   ${comp.name} (${path.basename(comp.file)})`);
            });
        }
        
        console.log('\n💡 INTELLIGENT RECOMMENDATIONS:');
        console.log('   1. Generate API docs from actual endpoint definitions');
        console.log('   2. Create component documentation from React component analysis');
        console.log('   3. Update setup guides with actual environment variables');
        console.log('   4. Remove documentation for non-existent features');
        console.log('   5. Add missing documentation for major components');
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('   1. Run auto-generation for API documentation');
        console.log('   2. Create component documentation templates');
        console.log('   3. Validate all code examples against actual implementation');
        console.log('   4. Set up automated documentation validation in CI/CD');
    }
}

// Run analysis
if (require.main === module) {
    const analyzer = new CodebaseAwareDocAnalyzer();
    analyzer.analyze().catch(console.error);
}

module.exports = CodebaseAwareDocAnalyzer;
