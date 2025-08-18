# Security Dependency Report

Generated: 2025-07-01T20:59:43.738Z

## Executive Summary

### Root Dependencies
- Total Vulnerabilities: 0
- Critical: 0
- High: 0
- Moderate: 0
- Low: 0

### Client Dependencies
- Total Vulnerabilities: 0
- Critical: 0
- High: 0
- Moderate: 0
- Low: 0

## Detailed Findings

### Known Vulnerable Packages

#### Root
- **axios** (1.8.2): Use version >= 1.10.0 (CVE-2023-45857)

#### Client
- **axios** (^1.9.0): Use version >= 1.10.0 (CVE-2023-45857)
- **react-scripts** (5.0.1): Contains multiple vulnerable dependencies

### Outdated Packages

#### Root
All packages up to date

#### Client
All packages up to date

### License Issues

#### Root
- Total packages: 0
- Problematic licenses: 0


#### Client
- Total packages: 0
- Problematic licenses: 0


## Recommendations

1. Run `npm audit fix` to automatically fix vulnerabilities
2. Update packages listed in "Known Vulnerable Packages"
3. Review and update outdated packages
4. Verify licenses for compliance with your project requirements

## Commands to Fix

```bash
# Fix root vulnerabilities
npm audit fix

# Fix client vulnerabilities
cd client && npm audit fix

# Update specific vulnerable packages
npm install axios@latest bcrypt@latest uuid@latest
cd client && npm install axios@latest
```
