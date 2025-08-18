<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Manager User Guide

## Welcome to the Maritime Onboarding System

This guide helps managers effectively oversee and manage their crew's onboarding journey, ensuring smooth and compliant maritime operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Manager Dashboard](#manager-dashboard)
3. [Crew Management](#crew-management)
4. [Onboarding Oversight](#onboarding-oversight)
5. [Progress Tracking](#progress-tracking)
6. [Approvals and Reviews](#approvals-and-reviews)
7. [Communication Tools](#communication-tools)
8. [Reports and Analytics](#reports-and-analytics)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### First Login

1. Check your email for login credentials
2. Navigate to [https://your-domain.com](https://your-domain.com)
3. Enter your email and password
4. Complete security verification if prompted
5. Welcome to your Manager Dashboard!

### Initial Setup

**First Day Checklist:**
- [ ] Update your password
- [ ] Complete your profile
- [ ] Review company settings
- [ ] Check assigned crew members
- [ ] Familiarize yourself with workflows
- [ ] Set up notification preferences

### Understanding Your Role

As a Manager, you can:
- ✅ Add and manage crew members
- ✅ Monitor onboarding progress
- ✅ Approve phase completions
- ✅ Access company reports
- ✅ Communicate with crew
- ❌ Modify system settings (Admin only)
- ❌ Access other companies' data

## Manager Dashboard

### Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│         Maritime Onboarding System              │
│  Welcome, [Manager Name] | [Company Name]       │
├─────────────────────────────────────────────────┤
│  Quick Stats                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Total    │ │ Active   │ │ Pending  │       │
│  │ Crew: 45 │ │ Onb: 12  │ │ Review: 5│       │
│  └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────┤
│  Recent Activity                                │
│  • John Doe completed Safety Training           │
│  • Jane Smith uploaded documents                │
│  • Mike Johnson awaiting phase approval         │
└─────────────────────────────────────────────────┘
```

### Key Metrics Explained

- **Total Crew**: All crew members in your company
- **Active Onboardings**: Currently in progress
- **Completion Rate**: Percentage successfully onboarded
- **Average Duration**: Time to complete onboarding
- **Pending Reviews**: Items awaiting your approval

### Navigation Menu

- **Dashboard**: Overview and quick stats
- **Crew**: Manage team members
- **Onboarding**: Track progress
- **Reports**: Analytics and insights
- **Messages**: Communication center
- **Settings**: Preferences and profile

## Crew Management

### Adding New Crew Members

#### Individual Addition

1. Click **Crew** → **Add New Member**
2. Enter crew details:
   ```
   Required Information:
   - Email Address*
   - Full Name*
   - Position/Role*
   - Start Date*
   - Department
   - Direct Reports To
   ```
3. Select onboarding workflow
4. Choose invitation method:
   - **Email Invitation**: Sends login link
   - **Manual Setup**: Create credentials
5. Click **Send Invitation**

#### Bulk Import

For multiple crew members:

1. Download CSV template
2. Fill in crew information:
   ```csv
   email,name,position,start_date,department
   john@ship.com,John Smith,Deck Officer,2025-01-15,Deck
   jane@ship.com,Jane Doe,Engineer,2025-01-15,Engineering
   ```
3. Upload completed file
4. Review and confirm
5. Send invitations

### Managing Crew Profiles

#### View Crew Details

Click on any crew member to see:
- Personal information
- Onboarding status
- Document uploads
- Training progress
- Communication history
- Performance notes

#### Edit Crew Information

1. Navigate to crew profile
2. Click **Edit Profile**
3. Update necessary fields
4. Save changes
5. Crew is notified of updates

#### Crew Actions

Available actions for each crew member:
- **Reset Password**: Send password reset link
- **Resend Invitation**: For pending invitations
- **Change Workflow**: Assign different onboarding
- **Add Notes**: Private manager notes
- **Export Data**: Download crew information
- **Deactivate**: Remove access (reversible)

## Onboarding Oversight

### Understanding Workflows

Typical onboarding workflow structure:

```
Standard Maritime Onboarding (14 days)
│
├── Phase 1: Documentation (Days 1-3)
│   ├── Personal Documents
│   ├── Certificates
│   └── Medical Records
│
├── Phase 2: Safety Training (Days 4-7)
│   ├── Fire Safety
│   ├── First Aid
│   └── Emergency Procedures
│
├── Phase 3: Role Training (Days 8-12)
│   ├── Position-specific modules
│   ├── Equipment training
│   └── Procedures review
│
└── Phase 4: Final Assessment (Days 13-14)
    ├── Knowledge test
    ├── Practical evaluation
    └── Manager sign-off
```

### Monitoring Active Onboardings

#### Onboarding Overview Page

Access via **Onboarding** → **Active**

View shows:
- Crew member name and photo
- Current phase
- Progress percentage
- Days remaining
- Action required indicators

#### Status Indicators

- 🟢 **On Track**: Progressing as expected
- 🟡 **Attention**: Slight delay or issue
- 🔴 **Overdue**: Requires immediate attention
- ⏸️ **Paused**: Temporarily halted
- ✅ **Completed**: Successfully finished

### Managing Delays

When crew members fall behind:

1. **Identify the Issue**
   - Check last activity date
   - Review incomplete items
   - Read crew notes/messages

2. **Take Action**
   - Send reminder message
   - Extend deadline if needed
   - Provide additional support
   - Escalate if necessary

3. **Document**
   - Add notes to profile
   - Update timeline
   - Notify relevant parties

## Progress Tracking

### Individual Progress View

Access detailed progress for any crew member:

```
John Doe - Deck Officer
Overall Progress: ████████░░░░░░░░ 65%

Phase Breakdown:
✅ Documentation      100% Complete
🔄 Safety Training     75% In Progress
⏳ Role Training        0% Not Started
⏳ Final Assessment     0% Not Started

Current Activity: Completing First Aid Module
Last Active: 2 hours ago
Estimated Completion: January 20, 2025
```

### Bulk Progress Monitoring

Use the progress grid view:

| Crew Member | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Overall |
|-------------|---------|---------|---------|---------|---------|
| John Doe    | ✅ 100% | 🔄 75%  | ⏳ 0%   | ⏳ 0%   | 65%     |
| Jane Smith  | ✅ 100% | ✅ 100% | 🔄 50%  | ⏳ 0%   | 80%     |
| Mike Johnson| 🔄 80%  | ⏳ 0%   | ⏳ 0%   | ⏳ 0%   | 20%     |

### Progress Alerts

Configure automatic alerts for:
- Phase completions
- Overdue items
- Low activity (>3 days inactive)
- Document uploads
- Failed assessments

Set up via **Settings** → **Notifications**

## Approvals and Reviews

### Phase Approval Process

When crew completes a phase:

1. **Notification**: You receive alert
2. **Review**: Check completed items
   - View uploaded documents
   - Check training scores
   - Review time spent
3. **Verify**: Ensure quality standards
4. **Approve/Reject**: Make decision
5. **Feedback**: Provide comments

### Document Review

#### Reviewing Uploaded Documents

1. Click on document notification
2. Document viewer opens
3. Check for:
   - Completeness
   - Validity dates
   - Correct format
   - Legibility
4. Actions available:
   - ✅ Approve
   - ❌ Reject (with reason)
   - 💬 Request clarification
   - 📎 Download copy

#### Common Documents to Review

- **Passport**: Check expiration (>6 months)
- **Medical Certificate**: Verify recent date
- **Certifications**: Confirm authenticity
- **Contracts**: Ensure signed properly
- **Insurance**: Validate coverage

### Training Verification

Review training completions:

```
Training Module: Fire Safety
Crew Member: John Doe
Completion Date: January 10, 2025
Time Spent: 2 hours 15 minutes
Quiz Score: 85% (Pass: 80%)

Review Checklist:
✅ Minimum time met (Required: 2 hours)
✅ Quiz passed
✅ All sections completed
⚠️ One quiz retake (acceptable)

[Approve] [Request Redo] [Add Note]
```

### Bulk Approvals

For efficiency with multiple reviews:

1. Go to **Approvals** → **Pending**
2. Filter by type/phase/date
3. Select multiple items
4. Choose bulk action:
   - Approve all
   - Reject with common reason
   - Assign to colleague

## Communication Tools

### Messaging System

#### Sending Messages

1. **Individual Messages**
   - Click crew member profile
   - Select **Send Message**
   - Type message
   - Attach files if needed
   - Send

2. **Broadcast Messages**
   - Go to **Messages** → **Broadcast**
   - Select recipient groups
   - Compose message
   - Schedule or send immediately

#### Message Templates

Common templates available:
- Welcome message
- Reminder to complete phase
- Document rejection notice
- Congratulations on completion
- Schedule updates

### Notification Center

Manage your notifications:

```
Notification Settings:
├── Email Notifications
│   ✅ Phase completions
│   ✅ Document uploads
│   ✅ Overdue items
│   ☐ Daily summary
│
├── In-App Alerts
│   ✅ All activities
│
└── Mobile Push (if app installed)
    ✅ Urgent items only
```

### Video Calls

Schedule video meetings:

1. Click **Schedule Meeting**
2. Select crew members
3. Choose date/time
4. Add agenda
5. System sends invites with link

## Reports and Analytics

### Available Reports

#### Onboarding Summary Report
```
Company: Maritime Shipping Co.
Period: January 2025

Summary Statistics:
- Total Onboardings Started: 15
- Successfully Completed: 12 (80%)
- Currently Active: 3
- Average Completion Time: 12.5 days

By Department:
- Deck: 6 completed, 1 active
- Engineering: 4 completed, 1 active  
- Catering: 2 completed, 1 active
```

#### Individual Progress Reports

Detailed report for each crew member:
- Timeline of activities
- Phase completion dates
- Document status
- Training scores
- Manager notes
- Total time invested

### Creating Custom Reports

1. Go to **Reports** → **Create Custom**
2. Select data points:
   - Timeframe
   - Crew members
   - Phases
   - Metrics
3. Choose format:
   - Summary
   - Detailed
   - Comparative
4. Generate report
5. Export as PDF/Excel

### Analytics Dashboard

Visual insights include:
- Completion trends
- Bottleneck identification
- Department comparisons
- Time-to-productivity metrics
- Success rate analysis

## Best Practices

### Effective Onboarding Management

1. **Set Clear Expectations**
   - Communicate timeline upfront
   - Explain each phase purpose
   - Share success criteria

2. **Regular Check-ins**
   - Weekly progress reviews
   - Proactive communication
   - Address issues early

3. **Provide Support**
   - Be available for questions
   - Share resources
   - Connect with mentors

4. **Document Everything**
   - Keep detailed notes
   - Track communications
   - Record decisions

### Time Management Tips

- **Morning Routine**
  - Check overnight activities
  - Review pending approvals
  - Plan day's priorities

- **Batch Processing**
  - Group similar tasks
  - Set specific review times
  - Use bulk actions

- **Automation**
  - Set up auto-reminders
  - Use message templates
  - Configure smart alerts

### Security Best Practices

1. **Password Security**
   - Use strong passwords
   - Change regularly
   - Never share credentials

2. **Data Protection**
   - Lock screen when away
   - Use secure networks
   - Don't download sensitive data

3. **Verification**
   - Verify document authenticity
   - Confirm crew identity
   - Double-check before approval

## Troubleshooting

### Common Issues

#### Crew Can't Access System
1. Check invitation status
2. Verify email address
3. Resend invitation
4. Check spam folders
5. Reset password if needed

#### Documents Won't Upload
- Check file size (<10MB)
- Verify file format (PDF, JPG, PNG)
- Try different browser
- Clear cache
- Contact support

#### Progress Not Updating
1. Refresh browser
2. Check last sync time
3. Verify crew completed items
4. Review system status
5. Contact admin if persists

#### Can't Approve Phase
- Ensure all items completed
- Check your permissions
- Verify no pending issues
- Try logging out/in
- Escalate to admin

### Getting Help

#### Self-Service Resources
- **Help Center**: help.burando.online
- **Video Tutorials**: In-app videos
- **FAQs**: Common questions answered
- **Best Practices**: Guidelines and tips

#### Contact Support
- **Email**: support@burando.online
- **In-App Chat**: Click help icon
- **Phone**: +31 (0) 20 123 4567
- **Response Time**: 
  - Critical: 1 hour
  - Normal: 4 hours

### Quick Reference

#### Keyboard Shortcuts
- `Ctrl/Cmd + S`: Save
- `Ctrl/Cmd + F`: Search
- `Ctrl/Cmd + N`: New crew member
- `Ctrl/Cmd + R`: Refresh data
- `Esc`: Close dialog

#### Status Codes
- 200: Success
- 400: Invalid input
- 401: Login required
- 403: Permission denied
- 500: System error

#### Important URLs
- Main App: your-domain.com
- Support: help.burando.online
- Status: status.burando.online

---

**Last Updated**: January 2, 2025  
**Version**: 1.0  
**Feedback**: feedback@burando.online