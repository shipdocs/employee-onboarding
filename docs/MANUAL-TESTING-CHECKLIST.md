# Manual Testing Checklist

## Critical User Flows to Test

### 1. Authentication Flow ✅
- [ ] Manager login with email/password
- [ ] Crew member magic link request
- [ ] Magic link email delivery
- [ ] Magic link verification
- [ ] JWT token generation
- [ ] Token refresh
- [ ] Logout functionality

### 2. Onboarding Flow (Crew) ✅
- [ ] Initial login redirect
- [ ] Personal information form
- [ ] Form validation
- [ ] Form submission
- [ ] Progress tracking
- [ ] Email notifications

### 3. Training Flow ✅
- [ ] Training phase display
- [ ] Training item completion
- [ ] Progress calculation
- [ ] Video playback
- [ ] Document viewing
- [ ] Phase completion

### 4. Quiz Flow ✅
- [ ] Quiz questions loading
- [ ] Answer selection
- [ ] Quiz submission
- [ ] Score calculation
- [ ] Pass/fail determination
- [ ] Manager review queue
- [ ] Result notification

### 5. Manager Dashboard ✅
- [ ] Dashboard statistics
- [ ] Crew member list
- [ ] Progress monitoring
- [ ] Quiz review interface
- [ ] Approval/rejection flow
- [ ] Email notifications

### 6. Admin Functions ✅
- [ ] Manager creation
- [ ] Manager permissions
- [ ] Audit log viewing
- [ ] System settings

## API Endpoints to Test

### Authentication
- [ ] POST `/api/auth/manager-login`
- [ ] POST `/api/auth/request-magic-link`
- [ ] POST `/api/auth/magic-login`
- [ ] POST `/api/auth/refresh`
- [ ] POST `/api/auth/logout`

### Crew Operations
- [ ] GET `/api/crew/profile`
- [ ] PATCH `/api/crew/profile`
- [ ] GET `/api/crew/training/progress`
- [ ] POST `/api/crew/training/phase/[phase]/start`
- [ ] POST `/api/crew/training/phase/[phase]/item/[item]/complete`

### Manager Operations
- [ ] GET `/api/manager/dashboard/stats`
- [ ] GET `/api/manager/crew`
- [ ] GET `/api/manager/crew/[id]`
- [ ] GET `/api/manager/quiz-reviews/pending`
- [ ] POST `/api/manager/quiz-reviews/[id]/approve`

### Admin Operations
- [ ] GET `/api/admin/managers`
- [ ] POST `/api/admin/managers`
- [ ] GET `/api/admin/audit-log`

## Performance Tests

### Page Load Times
- [ ] Login page < 2s
- [ ] Dashboard < 3s
- [ ] Training page < 2s
- [ ] Quiz page < 2s

### API Response Times
- [ ] Auth endpoints < 500ms
- [ ] Data fetch < 1s
- [ ] File uploads < 5s
- [ ] Email sending < 2s

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Chrome Android
- [ ] Samsung Internet

## Responsive Design

### Breakpoints
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)

### Critical Pages
- [ ] Login page
- [ ] Dashboard
- [ ] Training interface
- [ ] Quiz interface
- [ ] Forms

## Error Handling

### Network Errors
- [ ] Offline functionality
- [ ] Slow connection handling
- [ ] Request timeout handling
- [ ] Retry mechanisms

### User Errors
- [ ] Invalid form inputs
- [ ] Unauthorized access
- [ ] Session expiration
- [ ] Rate limiting

## Email Testing

### Email Templates
- [ ] Welcome email formatting
- [ ] Magic link email
- [ ] Training reminders
- [ ] Quiz results
- [ ] Phase completion
- [ ] System alerts

### Email Delivery
- [ ] Primary provider (MailerSend)
- [ ] Fallback to SMTP
- [ ] Retry on failure
- [ ] Queue processing

## Security Testing

### Authentication
- [ ] Invalid credentials
- [ ] Expired tokens
- [ ] Role-based access
- [ ] Session management

### Input Validation
- [ ] SQL injection attempts
- [ ] XSS prevention
- [ ] File upload restrictions
- [ ] Rate limiting

## Data Integrity

### Form Submissions
- [ ] Data saved correctly
- [ ] Validation working
- [ ] Error recovery
- [ ] Duplicate prevention

### Progress Tracking
- [ ] Accurate calculations
- [ ] State persistence
- [ ] Concurrent updates
- [ ] Data consistency

## Accessibility

### WCAG Compliance
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast
- [ ] Focus indicators
- [ ] Alt text for images

## Testing Tools

### Manual Testing
- Browser DevTools
- Network throttling
- Device emulation
- Incognito/Private mode

### Automated Tools
- Lighthouse (performance)
- axe DevTools (accessibility)
- React Developer Tools
- Network inspector

## Regression Tests

After refactoring, ensure:
- [ ] All authentication flows work
- [ ] Email sending functions properly
- [ ] Quiz functionality unchanged
- [ ] Dashboard statistics accurate
- [ ] File uploads working
- [ ] API responses consistent

## Sign-off Criteria

Before marking Sprint 1 complete:
- [ ] All critical flows tested
- [ ] No blocking bugs
- [ ] Performance acceptable
- [ ] Emails delivering
- [ ] Error handling working
- [ ] Documentation updated

## Test Execution Log

| Feature | Tester | Date | Result | Notes |
|---------|--------|------|--------|-------|
| Auth Flow | - | - | - | - |
| Onboarding | - | - | - | - |
| Training | - | - | - | - |
| Quiz | - | - | - | - |
| Dashboard | - | - | - | - |

## Issues Found

### Critical
- None

### High Priority
- None

### Medium Priority
- None

### Low Priority
- None