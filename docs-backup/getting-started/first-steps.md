# First Steps After Installation

Congratulations! You've successfully installed the Maritime Onboarding System. This guide will walk you through the essential first steps to configure and start using your system.

## 🎯 **Initial System Configuration**

### **1. Admin Dashboard Setup**

1. **Access Admin Dashboard**
   - Navigate to `http://localhost:3000`
   - Click "Administrator Login"
   - Use your admin credentials
   - You should see the admin dashboard

2. **System Settings Configuration**
   - Go to Admin Dashboard → System Settings
   - Configure basic settings:
     ```
     System Name: Your Organization Maritime Training
     Max File Size: 10MB
     Email Notifications: Enabled
     Default Language: English
     Training Phase Durations:
       - Phase 1: 24 hours
       - Phase 2: 72 hours  
       - Phase 3: 1 week
     ```

3. **Verify System Health**
   - Check the system status indicators
   - Ensure all services show "Connected"
   - Review any warning messages

### **2. Create Your First Manager**

1. **Navigate to Manager Management**
   - Admin Dashboard → Manager Management
   - Click "Create New Manager"

2. **Fill Manager Details**
   ```
   Email: manager@yourdomain.com
   First Name: Training
   Last Name: Manager
   Position: Training Supervisor
   Password: [Generate secure password]
   Language Preference: English
   ```

3. **Activate Manager Account**
   - Ensure "Active" is checked
   - Click "Create Manager"
   - Note the login credentials

4. **Test Manager Login**
   - Logout from admin
   - Click "Manager Login"
   - Use manager credentials
   - Verify access to manager dashboard

### **3. Configure PDF Certificate Templates**

1. **Access Template Editor**
   - Login as admin
   - Navigate to Admin Dashboard → PDF Templates
   - Click "Create New Template"

2. **Create Basic Certificate Template**
   ```
   Template Name: Standard Training Certificate
   Description: Basic maritime training completion certificate
   Page Size: A4
   Orientation: Landscape
   ```

3. **Add Template Fields**
   - **Crew Name**: Position (100, 200), Font Size: 24
   - **Completion Date**: Position (100, 250), Font Size: 16
   - **Certificate Number**: Position (400, 300), Font Size: 14
   - **Training Phases**: Position (100, 350), Font Size: 16

4. **Test Template**
   - Use "Preview" function with sample data
   - Adjust positioning as needed
   - Save template

## 👥 **Create Test Users**

### **1. Create Test Crew Member**

1. **Login as Manager**
   - Use manager credentials
   - Access Manager Dashboard

2. **Add Crew Member**
   - Go to Crew Management → Add New Crew
   - Fill details:
     ```
     Email: crew.test@yourdomain.com
     First Name: Test
     Last Name: Crew
     Position: Deck Officer
     Vessel Assignment: Training Vessel
     Expected Boarding Date: [Today + 7 days]
     Contact Phone: +1234567890
     Language Preference: English
     ```

3. **Send Magic Link**
   - Click "Send Magic Link" after creation
   - Check email delivery in MailerSend dashboard
   - Verify crew member receives email

### **2. Test Crew Login**

1. **Access Magic Link**
   - Check email for magic link
   - Click link to login
   - Should redirect to crew dashboard

2. **Complete Profile**
   - Fill additional profile information
   - Upload profile photo (optional)
   - Set emergency contact details

## 🎓 **Configure Training Content**

### **1. Review Training Phases**

The system comes with pre-configured training content:

**Phase 1 (24 hours) - Basic Training**
- Safety briefing and orientation
- Emergency procedures
- Basic equipment familiarization
- Company policies and procedures

**Phase 2 (72 hours) - Advanced Training**
- Advanced safety procedures
- Equipment operation training
- Role-specific training modules
- Practical assessments

**Phase 3 (1 week) - Final Assessment**
- Comprehensive quiz (25 questions)
- Practical demonstrations
- Manager review and approval
- Certificate generation

### **2. Customize Training Content**

1. **Access Training Configuration**
   - Admin Dashboard → Training Management
   - Review existing training items

2. **Modify Training Items** (if needed)
   - Edit descriptions and requirements
   - Adjust time allocations
   - Update photo requirements
   - Modify instructor verification needs

3. **Configure Quiz Questions**
   - Admin Dashboard → Quiz Management
   - Review question bank
   - Add organization-specific questions
   - Set passing scores (default: 80%)

## 📧 **Email System Configuration**

### **1. Test Email Templates**

1. **Magic Link Email**
   ```bash
   # Test magic link generation
   node scripts/test-magic-link-email.js crew.test@yourdomain.com
   ```

2. **Welcome Email**
   ```bash
   # Test welcome email
   node scripts/test-welcome-email.js crew.test@yourdomain.com
   ```

3. **Certificate Email**
   ```bash
   # Test certificate email
   node scripts/test-certificate-email.js crew.test@yourdomain.com
   ```

### **2. Customize Email Templates**

1. **Access Email Templates**
   - Located in `services/email-templates/`
   - Available templates:
     - `magic-link.html`
     - `welcome.html`
     - `phase-completion.html`
     - `certificate.html`
     - `reminder.html`

2. **Customize Content**
   - Update company branding
   - Modify text content
   - Adjust styling (CSS)
   - Add company logo

3. **Test Customizations**
   ```bash
   # Test all email templates
   npm run test:emails
   ```

## 🔄 **Test Complete Workflow**

### **1. Complete Training Workflow Test**

1. **Login as Crew Member**
   - Use magic link to login
   - Access crew dashboard

2. **Start Phase 1**
   - Click "Start Phase 1"
   - Complete training items:
     - Read safety manual
     - Watch orientation video
     - Complete safety checklist
     - Get instructor verification

3. **Upload Training Photos**
   - Take/upload photos for required items
   - Verify file upload works
   - Check photo appears in manager dashboard

4. **Progress to Phase 2**
   - Complete all Phase 1 items
   - System should automatically unlock Phase 2
   - Repeat process for Phase 2

5. **Take Final Quiz**
   - Access Phase 3 quiz
   - Answer all questions
   - Submit for manager review

6. **Manager Review**
   - Login as manager
   - Review quiz results
   - Approve or reject with comments
   - If approved, certificate should generate

7. **Certificate Generation**
   - Verify certificate generates automatically
   - Check email delivery to crew and HR
   - Download and verify PDF content

### **2. Verify System Integration**

1. **Database Operations**
   ```bash
   # Check data integrity
   node scripts/verify-data-integrity.js
   ```

2. **File Storage**
   ```bash
   # Test file operations
   node scripts/test-file-operations.js
   ```

3. **Email Delivery**
   ```bash
   # Check email queue and delivery
   node scripts/check-email-status.js
   ```

## 🛠️ **Development Environment Setup**

### **1. Configure Development Tools**

1. **Set Up Git Hooks**
   ```bash
   # Install pre-commit hooks
   npm run setup:git-hooks
   ```

2. **Configure IDE**
   - Install recommended extensions:
     - ESLint
     - Prettier
     - React snippets
     - Tailwind CSS IntelliSense

3. **Set Up Debugging**
   ```bash
   # Enable debug mode
   echo "DEBUG=true" >> .env
   ```

### **2. Development Workflow**

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit code
   - Test locally
   - Commit changes

3. **Deploy to Testing**
   ```bash
   git push origin testing
   ```

4. **Review and Deploy**
   - Test in testing environment
   - Merge to preview for stakeholder review
   - Deploy to production when approved

## 📊 **Monitoring and Maintenance**

### **1. Set Up Basic Monitoring**

1. **Health Check Endpoint**
   - Verify `/api/health` responds correctly
   - Set up external monitoring (optional)

2. **Log Monitoring**
   ```bash
   # View application logs
   vercel logs
   
   # Monitor database logs
   # Check Supabase dashboard
   ```

3. **Email Delivery Monitoring**
   - Monitor MailerSend dashboard
   - Set up delivery failure alerts

### **2. Regular Maintenance Tasks**

1. **Daily Checks**
   - Verify system health
   - Check email delivery rates
   - Monitor user activity

2. **Weekly Tasks**
   - Review training completion rates
   - Check for system errors
   - Update training content if needed

3. **Monthly Tasks**
   - Review system performance
   - Update dependencies
   - Backup configuration

## 🎯 **Next Steps**

### **For Development**
1. **[Development Workflow](../development/workflow.md)** - Learn the development process
2. **[API Documentation](../api/README.md)** - Explore API capabilities
3. **[Architecture Overview](../for-developers/architecture/overview.md)** - Understand system design

### **For Production**
1. **[Environment Configuration](../deployment/environments.md)** - Set up multiple environments
2. **[Production Deployment](../deployment/production.md)** - Deploy to production
3. **[Monitoring Setup](../maintenance/monitoring.md)** - Set up comprehensive monitoring

### **For Customization**
1. **[Feature Documentation](../features/README.md)** - Explore all features
2. **[PDF Template System](../features/pdf-templates.md)** - Advanced template creation
3. **[Internationalization](../features/internationalization.md)** - Multi-language setup

## 🚨 **Common Next Steps Issues**

### **Manager Can't Create Crew**
- Check manager permissions in database
- Verify email configuration
- Ensure MailerSend domain is verified

### **Crew Can't Access Training**
- Verify training phases are configured
- Check user status is "active"
- Ensure training session was created

### **Certificates Not Generating**
- Check PDF template configuration
- Verify Supabase storage permissions
- Test certificate generation manually

### **Emails Not Sending**
- Verify MailerSend API key
- Check domain verification
- Review email template syntax

For detailed troubleshooting, see [Troubleshooting Guide](troubleshooting.md).

## 🎉 **You're Ready!**

Your Maritime Onboarding System is now configured and ready for use. You have:

- ✅ Admin and manager accounts set up
- ✅ Test crew member created
- ✅ Training workflow tested
- ✅ Email system configured
- ✅ Certificate generation working
- ✅ Development environment ready

Start exploring the system's full capabilities and customize it for your organization's specific needs!
