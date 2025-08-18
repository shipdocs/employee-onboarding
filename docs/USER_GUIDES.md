# Maritime Onboarding System - User Guides

## 📖 For End Users (Crew Members)

### Getting Started
1. **Receive Invitation**: You'll receive an email with a magic link to access the system
2. **Complete Profile**: Fill in your personal and professional details
3. **Start Training**: Begin with Basic Training, then Advanced Training
4. **Take Quiz**: Complete the assessment after finishing both training phases
5. **Get Certificate**: Download your certificate upon successful completion

### Key Features
- **Multi-language Support**: Switch between English and Dutch
- **Progress Tracking**: See your advancement through each phase
- **Mobile Friendly**: Complete training on any device
- **Offline Support**: Continue training even without internet (syncs when reconnected)

### Need Help?
- Contact your HR department
- Email support: info@shipdocs.app

---

## 👔 For Managers

### Dashboard Overview
Access your management dashboard to:
- **Monitor Progress**: Track crew training completion rates
- **Manage Crew**: Add, edit, or remove crew members
- **Generate Reports**: Export training data and compliance reports
- **Send Reminders**: Notify crew about pending training

### Daily Tasks
1. **Review Dashboard**: Check completion statistics
2. **Process New Crew**: Add new members as they join
3. **Handle Exceptions**: Review failed attempts and provide support
4. **Export Reports**: Generate weekly/monthly compliance reports

### Quick Actions
```
Dashboard → Crew Management → Add Crew Member
Dashboard → Reports → Export to CSV
Dashboard → Settings → Company Configuration
```

---

## 🔧 For System Administrators

### System Management

#### User Management
- **Create Managers**: Add new manager accounts with appropriate permissions
- **Role Assignment**: Configure role-based access control
- **Audit Logs**: Review all system activities

#### Content Management
- **Training Materials**: Upload and organize training content
- **Quiz Questions**: Create and manage assessment questions
- **Certificate Templates**: Customize certificate designs

#### System Configuration
```javascript
// Key configuration areas:
- Company Settings
- Email Templates
- Security Policies
- Integration Settings
```

### Monitoring & Maintenance

#### Daily Checks
- [ ] Review system health dashboard
- [ ] Check error logs
- [ ] Monitor email delivery status
- [ ] Verify backup completion

#### Weekly Tasks
- [ ] Review security audit logs
- [ ] Update user permissions as needed
- [ ] Export compliance reports
- [ ] Check storage usage

#### Monthly Tasks
- [ ] Security updates review
- [ ] Performance optimization
- [ ] User access audit
- [ ] Compliance documentation update

### API Integration

#### Authentication
```bash
# Get API token
POST /api/auth/admin-login
{
  "email": "admin@company.com",
  "password": "secure-password"
}

# Use token in headers
Authorization: Bearer <token>
```

#### Common API Endpoints
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/crew` - List all crew members
- `POST /api/admin/managers` - Create manager account
- `GET /api/admin/audit-logs` - Security audit logs

### Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Users can't login | Check email service status, verify magic links are being sent |
| Certificates not generating | Verify PDF service is running, check storage permissions |
| Slow performance | Review database queries, check server resources |
| Email delivery failures | Verify MailerSend quota, check SMTP settings |

### Security Best Practices

1. **Regular Updates**: Keep all dependencies updated
2. **Access Control**: Review and audit user permissions monthly
3. **Backup Strategy**: Ensure daily backups are running and tested
4. **Password Policy**: Enforce strong passwords for admin/manager accounts
5. **MFA Enforcement**: Enable multi-factor authentication for all privileged accounts

---

## 📊 Reports & Compliance

### Available Reports
- **Training Completion Report**: Overview of all crew training status
- **Compliance Audit**: Detailed compliance metrics and documentation
- **Certificate Registry**: List of all issued certificates
- **Activity Logs**: Complete audit trail of system usage

### Export Formats
- CSV for spreadsheet analysis
- PDF for official documentation
- JSON for system integration

### Compliance Documentation
All compliance documents are available in `/docs/compliance-2025-pdf/`:
- Service Level Agreement (SLA)
- Data Processing Agreement (DPA)
- GDPR Compliance Report
- Security & Privacy Policies

---

## 🆘 Support & Contact

### Technical Support
- **Email**: info@shipdocs.app
- **Documentation**: `/docs` folder
- **Response Time**: Within 1 business day

### Emergency Contact
For critical system issues:
- **Available**: During business hours (09:00 - 17:00 CET)
- **SLA**: See Service Level Agreement for response times

### Training & Resources
- Developer Setup: See [SETUP.md](../SETUP.md)
- API Documentation: See [API.md](API.md)
- Architecture Guide: See [ARCHITECTURE.md](ARCHITECTURE.md)