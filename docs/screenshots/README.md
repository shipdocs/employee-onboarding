# 📸 Screenshots Guide

This directory contains screenshots for documentation and marketing purposes.

## 🎯 **Required Screenshots**

### **For README.md**
1. **dashboard.png** - Main dashboard overview showing crew progress
2. **training.png** - Training workflow in action (Phase 1, 2, or 3)
3. **certificate.png** - Generated certificate example

### **For Documentation**
1. **login-screen.png** - Login/authentication screen
2. **admin-dashboard.png** - Admin dashboard with user management
3. **manager-dashboard.png** - Manager view with crew oversight
4. **crew-dashboard.png** - Crew member personal dashboard
5. **training-phase1.png** - Phase 1 training items
6. **training-phase2.png** - Phase 2 with photo uploads
7. **training-phase3.png** - Phase 3 quiz interface
8. **certificate-generation.png** - Certificate generation process
9. **user-management.png** - User management interface
10. **settings-page.png** - System settings and configuration

## 📋 **Screenshot Standards**

### **Technical Requirements**
- **Resolution**: 1920x1080 minimum
- **Format**: PNG (for crisp UI elements)
- **Quality**: High quality, no compression artifacts
- **Browser**: Chrome or Firefox (consistent rendering)

### **Content Guidelines**
- **Demo Data**: Use realistic but anonymized maritime data
- **Clean UI**: No browser dev tools, clean desktop
- **Consistent Branding**: Use default theme/colors
- **Professional Content**: Appropriate maritime terminology

### **Naming Convention**
```
[section]-[feature]-[view].png

Examples:
- dashboard-overview-admin.png
- training-phase2-crew.png
- certificate-template-manager.png
- settings-email-admin.png
```

## 🎨 **Taking Screenshots**

### **Preparation**
1. **Start the system** with demo data:
   ```bash
   docker-compose up -d
   open http://localhost
   ```

2. **Login with demo accounts**:
   - **Admin**: admin@example.com / admin123
   - **Manager**: manager@example.com / manager123
   - **Crew**: crew@example.com / crew123

3. **Browser setup**:
   - Use incognito/private mode
   - Set browser zoom to 100%
   - Hide bookmarks bar
   - Use standard window size (1920x1080)

### **Screenshot Locations**

#### **Dashboard Screenshots**
- **URL**: http://localhost/dashboard
- **Views**: Admin, Manager, Crew perspectives
- **Focus**: Progress tracking, key metrics, navigation

#### **Training Screenshots**
- **URL**: http://localhost/training
- **Views**: Different phases, progress states
- **Focus**: Workflow clarity, user interaction

#### **Certificate Screenshots**
- **URL**: http://localhost/certificates
- **Views**: Generation process, final PDF
- **Focus**: Professional appearance, branding

#### **Management Screenshots**
- **URL**: http://localhost/admin
- **Views**: User management, system settings
- **Focus**: Administrative capabilities

### **Demo Data Setup**
```bash
# Ensure demo data is loaded
npm run db:seed

# Create sample training progress
npm run demo:progress

# Generate sample certificates
npm run demo:certificates
```

## 🖼️ **Image Optimization**

### **After Taking Screenshots**
1. **Crop appropriately** - Remove unnecessary browser chrome
2. **Optimize file size** - Use tools like TinyPNG
3. **Add annotations** if needed - Highlight important features
4. **Test in documentation** - Ensure they display correctly

### **Tools for Optimization**
- **macOS**: Preview (built-in)
- **Windows**: Paint, Snipping Tool
- **Linux**: GIMP, Shutter
- **Online**: TinyPNG, Squoosh

## 📝 **Screenshot Checklist**

### **Before Taking Screenshots**
- [ ] System is running with demo data
- [ ] Browser is in incognito mode
- [ ] Window size is standardized
- [ ] Demo accounts are ready
- [ ] UI is clean and professional

### **While Taking Screenshots**
- [ ] Capture full interface (not just partial)
- [ ] Include relevant navigation elements
- [ ] Show realistic data (not empty states)
- [ ] Ensure text is readable
- [ ] Check for any sensitive information

### **After Taking Screenshots**
- [ ] Review for quality and clarity
- [ ] Optimize file sizes
- [ ] Name files consistently
- [ ] Test in documentation context
- [ ] Update documentation references

## 🎯 **Specific Screenshot Instructions**

### **Dashboard Overview (dashboard.png)**
1. Login as Manager
2. Navigate to main dashboard
3. Ensure crew progress is visible
4. Show training statistics
5. Capture full screen including navigation

### **Training Progress (training.png)**
1. Login as Crew member
2. Navigate to training section
3. Show Phase 2 with some completed items
4. Include photo upload interface
5. Show progress indicators

### **Certificate Example (certificate.png)**
1. Login as Manager
2. Navigate to certificates section
3. Generate or view existing certificate
4. Show professional PDF layout
5. Include company branding

## 🔄 **Updating Screenshots**

### **When to Update**
- Major UI changes
- New features added
- Branding updates
- User feedback on clarity

### **Update Process**
1. Take new screenshots following this guide
2. Replace old files (keep same names)
3. Update documentation if needed
4. Test all documentation links
5. Commit changes to repository

---

**📸 Need help with screenshots?** Contact the documentation team at [docs@shipdocs.app](mailto:docs@shipdocs.app)

**🎨 Design feedback?** Share your suggestions in [GitHub Discussions](https://github.com/shipdocs/maritime-onboarding/discussions)
