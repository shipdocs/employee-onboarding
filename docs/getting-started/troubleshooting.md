# Troubleshooting Guide

This guide covers common issues you might encounter during installation, setup, and operation of the Maritime Onboarding System.

## 🚨 **Installation Issues**

### **Node.js and Dependencies**

#### **Problem: `npm install` fails with permission errors**
```bash
# Solution 1: Use npm with --unsafe-perm flag
npm install --unsafe-perm

# Solution 2: Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Solution 3: Use Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### **Problem: `vercel dev` command not found**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Or use npx
npx vercel dev

# Verify installation
vercel --version
```

#### **Problem: Build fails with memory errors**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or add to package.json scripts
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' npm run build"
}
```

### **Environment Configuration**

#### **Problem: Environment variables not loading**
```bash
# Check .env file exists and has correct format
cat .env

# Verify no extra spaces or quotes
# Correct: SUPABASE_URL=https://example.supabase.co
# Wrong: SUPABASE_URL = "https://example.supabase.co"

# Restart development server after changes
vercel dev
```

#### **Problem: JWT_SECRET too short error**
```bash
# Generate proper JWT secret (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env
JWT_SECRET=your-generated-secret-here
```

## 🗄️ **Database Issues**

### **Supabase Connection Problems**

#### **Problem: "Failed to connect to Supabase"**
```bash
# Check Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify project is accessible
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/users?select=count"

# Re-link project if needed
supabase link --project-ref your-project-id
```

#### **Problem: "relation does not exist" errors**
```bash
# Apply database migrations
supabase db push

# Check migration status
supabase migration list

# Reset database if needed (CAUTION: destroys data)
supabase db reset
```

#### **Problem: Row Level Security (RLS) policy errors**
```sql
-- Check RLS policies in Supabase dashboard
-- Or run in SQL editor:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Disable RLS temporarily for testing (NOT for production)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### **Migration Issues**

#### **Problem: Migration files out of sync**
```bash
# Pull latest schema from remote
supabase db pull

# Check for conflicts
git status

# Resolve conflicts and reapply
supabase db push
```

#### **Problem: Admin user not created**
```bash
# Check if admin user exists
node -e "
const { getDatabase } = require('./config/database');
const db = getDatabase();
db.from('users').select('*').eq('role', 'admin').then(console.log);
"

# Create admin user manually
npm run setup:admin

# Or create via SQL
# See installation.md for SQL commands
```

## 📧 **Email System Issues**

### **MailerSend Configuration**

#### **Problem: Emails not sending**
```bash
# Test MailerSend API key
curl -X GET "https://api.mailersend.com/v1/domains" \
     -H "Authorization: Bearer $MAILERSEND_API_KEY"

# Check domain verification status
# Go to MailerSend dashboard → Domains

# Test email sending
node -e "
const { sendEmail } = require('./services/email');
sendEmail('test@yourdomain.com', 'Test', 'Test message')
  .then(() => console.log('Success'))
  .catch(console.error);
"
```

#### **Problem: Domain not verified**
1. Go to MailerSend dashboard → Domains
2. Click on your domain
3. Add required DNS records:
   ```
   TXT record: v=spf1 include:mailersend.net ~all
   CNAME record: mail._domainkey → mail._domainkey.mailersend.net
   CNAME record: _dmarc → _dmarc.mailersend.net
   ```
4. Wait up to 24 hours for verification

#### **Problem: Magic links not working**
```bash
# Check magic link generation
node scripts/test-magic-link.js test@example.com

# Verify JWT secret is set
echo $JWT_SECRET

# Check link expiration settings
grep MAGIC_LINK_EXPIRY .env
```

## 🔐 **Authentication Issues**

### **Login Problems**

#### **Problem: Admin login fails**
```bash
# Check admin user exists and is active
node -e "
const { getDatabase } = require('./config/database');
const db = getDatabase();
db.from('users')
  .select('email, role, is_active, password_hash')
  .eq('role', 'admin')
  .then(({data, error}) => {
    if (error) console.error(error);
    else console.log('Admin users:', data);
  });
"

# Reset admin password
node scripts/reset-admin-password.js

# Or update via SQL
UPDATE users 
SET password_hash = '$2a$12$new-hash-here' 
WHERE role = 'admin';
```

#### **Problem: JWT token errors**
```bash
# Check JWT secret configuration
echo $JWT_SECRET | wc -c  # Should be 128+ characters

# Test JWT generation
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({test: true}, process.env.JWT_SECRET);
console.log('Token generated:', !!token);
console.log('Token valid:', !!jwt.verify(token, process.env.JWT_SECRET));
"
```

#### **Problem: Session expires immediately**
```bash
# Check system time synchronization
date

# Verify JWT expiration settings
grep JWT .env

# Check browser cookies
# Open browser dev tools → Application → Cookies
```

## 📁 **File Upload Issues**

### **Storage Problems**

#### **Problem: File uploads fail**
```bash
# Check Supabase storage buckets
node -e "
const { getDatabase } = require('./config/database');
const db = getDatabase();
db.storage.listBuckets().then(console.log);
"

# Test file upload
node scripts/test-file-upload.js

# Check storage policies in Supabase dashboard
```

#### **Problem: "File too large" errors**
```bash
# Check file size limits
grep MAX_FILE_SIZE .env

# Update limit (in bytes)
echo "MAX_FILE_SIZE=20971520" >> .env  # 20MB

# Restart server
vercel dev
```

#### **Problem: Storage bucket access denied**
```sql
-- Check storage policies in Supabase SQL editor
SELECT * FROM storage.buckets;

-- Create missing policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 🎯 **Performance Issues**

### **Slow Response Times**

#### **Problem: API endpoints slow**
```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/health"

# Check database query performance
# Monitor in Supabase dashboard → Logs

# Enable query logging
echo "DEBUG_SQL=true" >> .env
```

#### **Problem: Large bundle size**
```bash
# Analyze bundle size
cd client
npm run build
npx webpack-bundle-analyzer build/static/js/*.js

# Optimize imports
# Use dynamic imports for large components
const Component = lazy(() => import('./Component'));
```

### **Memory Issues**

#### **Problem: Out of memory errors**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
node --inspect server.js
# Open chrome://inspect in Chrome
```

## 🌐 **Deployment Issues**

### **Vercel Deployment**

#### **Problem: Build fails on Vercel**
```bash
# Check build logs in Vercel dashboard
vercel logs

# Test build locally
npm run build

# Check for environment-specific issues
vercel env ls
```

#### **Problem: Environment variables not set**
```bash
# List Vercel environment variables
vercel env ls

# Add missing variables
vercel env add VARIABLE_NAME

# Pull environment variables locally
vercel env pull .env.local
```

#### **Problem: Function timeout errors**
```json
// Increase timeout in vercel.json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  }
}
```

### **Domain and SSL Issues**

#### **Problem: Custom domain not working**
1. Check DNS configuration in domain provider
2. Verify domain is added in Vercel dashboard
3. Wait for SSL certificate generation (up to 24 hours)
4. Check domain status in Vercel → Project → Settings → Domains

#### **Problem: SSL certificate errors**
```bash
# Check SSL certificate status
curl -I https://yourdomain.com

# Force SSL renewal in Vercel dashboard
# Or contact Vercel support
```

## 🔧 **Development Issues**

### **Hot Reload Problems**

#### **Problem: Changes not reflecting**
```bash
# Clear cache and restart
rm -rf .next
rm -rf client/build
npm run dev:fresh

# Check file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### **Problem: Port conflicts**
```bash
# Find process using port
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Use different port
PORT=3001 vercel dev
```

## 🆘 **Getting Help**

### **Diagnostic Commands**

```bash
# System information
node --version
npm --version
vercel --version
supabase --version

# Check environment
env | grep -E "(SUPABASE|JWT|MAILER)"

# Test all connections
npm run test:connections

# Generate diagnostic report
npm run diagnostics
```

### **Log Analysis**

```bash
# Application logs
vercel logs --follow

# Database logs
# Check Supabase dashboard → Logs

# Email logs
# Check MailerSend dashboard → Activity

# Browser console
# Open browser dev tools → Console
```

### **Support Resources**

1. **Documentation**
   - [API Reference](../for-developers/api-reference/)
   - [Development Guide](../development/README.md)
   - [Architecture Overview](../for-developers/architecture/overview.md)

2. **External Resources**
   - [Supabase Documentation](https://supabase.com/docs)
   - [Vercel Documentation](https://vercel.com/docs)
   - [MailerSend Documentation](https://developers.mailersend.com/)

3. **Community Support**
   - GitHub Issues
   - Stack Overflow (tag: maritime-onboarding)
   - Discord/Slack channels (if available)

### **Creating Support Tickets**

When reporting issues, include:

1. **Environment Information**
   ```bash
   # Run diagnostic script
   npm run diagnostics > diagnostic-report.txt
   ```

2. **Error Messages**
   - Full error stack traces
   - Browser console errors
   - Server logs

3. **Steps to Reproduce**
   - Exact steps taken
   - Expected vs actual behavior
   - Screenshots if applicable

4. **System Configuration**
   - Operating system
   - Node.js version
   - Browser version (for frontend issues)

## 🔄 **Recovery Procedures**

### **Database Recovery**

```bash
# Backup current state
supabase db dump > backup.sql

# Reset to clean state
supabase db reset

# Restore from backup
supabase db push
```

### **File System Recovery**

```bash
# Reset to clean repository state
git stash
git clean -fd
git reset --hard HEAD

# Reinstall dependencies
rm -rf node_modules client/node_modules
npm install
cd client && npm install && cd ..
```

### **Complete System Reset**

```bash
# Nuclear option - complete reset
rm -rf node_modules client/node_modules .next client/build
rm .env
cp .env.example .env
# Reconfigure .env
npm install
cd client && npm install && cd ..
supabase db reset
npm run setup:admin
vercel dev
```

Remember: Always backup your data before performing recovery procedures!
