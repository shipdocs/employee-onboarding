#!/usr/bin/env node
// scripts/fix-rate-limit-syntax.js - Fix syntax errors in rate limiting

const fs = require('fs');
const path = require('path');

function findAPIEndpoints() {
    const apiDir = path.join(process.cwd(), 'api');
    const endpoints = [];

    function scanDirectory(dir, relativePath = '') {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const itemRelativePath = path.join(relativePath, item);

            if (fs.statSync(fullPath).isDirectory()) {
                scanDirectory(fullPath, itemRelativePath);
            } else if (item.endsWith('.js')) {
                endpoints.push({
                    filePath: fullPath,
                    relativePath: itemRelativePath
                });
            }
        }
    }

    scanDirectory(apiDir);
    return endpoints;
}

function fixSyntaxErrors() {
    const endpoints = findAPIEndpoints();
    let fixedCount = 0;

    for (const endpoint of endpoints) {
        try {
            let content = fs.readFileSync(endpoint.filePath, 'utf8');
            let modified = false;

            // Fix the syntax error pattern: handler;) -> handler)
            const syntaxErrorPattern = /(\w+RateLimit\([^)]+);(\))/g;
            if (syntaxErrorPattern.test(content)) {
                content = content.replace(syntaxErrorPattern, '$1$2');
                modified = true;
            }

            // Fix another pattern: function handler(req, res) {;) -> function handler(req, res) {
            const functionErrorPattern = /function handler\(req, res\) \{;\)/g;
            if (functionErrorPattern.test(content)) {
                content = content.replace(functionErrorPattern, 'function handler(req, res) {');
                modified = true;
            }

            // Fix handler;) pattern
            const handlerErrorPattern = /handler;\)/g;
            if (handlerErrorPattern.test(content)) {
                content = content.replace(handlerErrorPattern, 'handler)');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(endpoint.filePath, content);
                console.log(`✅ Fixed ${endpoint.relativePath}`);
                fixedCount++;
            }
        } catch (error) {
            console.error(`❌ Error fixing ${endpoint.relativePath}:`, error.message);
        }
    }

    console.log(`\n✅ Fixed syntax errors in ${fixedCount} files`);
}

if (require.main === module) {
    console.log('🔧 Fixing rate limiting syntax errors...\n');
    fixSyntaxErrors();
}

module.exports = { fixSyntaxErrors };