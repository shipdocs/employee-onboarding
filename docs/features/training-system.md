# Training System

The Maritime Onboarding Training System provides a comprehensive three-phase training workflow designed to ensure crew members complete all required onboarding and safety training before joining their vessels.

## Overview

The training system follows a structured progression:
1. **Phase 1: Basic Training** - Introduction and fundamental safety
2. **Phase 2: Advanced Training** - Role-specific and advanced procedures
3. **Phase 3: Assessment** - Knowledge verification through quizzes

Each phase must be completed sequentially, with progress tracking and instructor verification throughout.

## Training Workflow

### Phase Structure

#### Phase 1: Basic Training
Essential onboarding tasks that every crew member must complete:
- Meet colleagues and understand daily affairs on board
- Familiarization with vessel and safety equipment
- Emergency procedures and muster stations
- Basic safety protocols
- Company policies and procedures

#### Phase 2: Advanced Training
Role-specific and advanced training modules:
- Position-specific procedures
- Advanced safety training
- Equipment operation (role-dependent)
- Communication protocols
- Regulatory compliance training

#### Phase 3: Assessment
Knowledge verification through interactive quizzes:
- Multiple-choice questions
- Scenario-based assessments
- Minimum 80% passing score required
- Unlimited retake attempts
- Immediate feedback on answers

### Progress Tracking

```javascript
// Training session structure
{
  id: "uuid",
  user_id: "uuid",
  phase: 1, // 1, 2, or 3
  status: "in_progress", // not_started, in_progress, completed
  started_at: "2025-01-15T10:00:00Z",
  completed_at: null,
  completion_percentage: 45,
  items: [
    {
      id: "uuid",
      item_number: "01",
      title: "Meet colleagues + daily affairs on board",
      description: "Introduction to crew and routines",
      completed: true,
      instructor_initials: "JD",
      completed_at: "2025-01-15T11:30:00Z",
      comments: "Good interaction with crew",
      proof_photo_path: "uploads/training/photo1.jpg"
    }
  ]
}
```

## Training Items

### Item Structure
Each training phase contains multiple items that must be completed:

```javascript
{
  item_number: "01",
  title: "Safety Equipment Familiarization",
  description: "Locate and understand all safety equipment",
  phase: 1,
  completed: false,
  instructor_initials: null,
  comments: null,
  proof_photo_path: null,
  completed_at: null
}
```

### Completion Requirements
- **Instructor Verification**: Each item requires instructor initials
- **Photo Evidence**: Optional photo upload for proof of completion
- **Comments**: Instructors can add notes about performance
- **Sequential Completion**: Items can be completed in any order within a phase

### Dynamic Training Content
The system supports dynamic training workflows that can be customized:
- Custom training items per company
- Role-specific training paths
- Vessel-specific requirements
- Multi-language support

## User Interfaces

### Crew Member Interface

#### Dashboard View
```jsx
// Crew training dashboard
<TrainingDashboard>
  <ProgressOverview>
    <PhaseProgress phase={1} percentage={100} status="completed" />
    <PhaseProgress phase={2} percentage={45} status="in_progress" />
    <PhaseProgress phase={3} percentage={0} status="locked" />
  </ProgressOverview>
  
  <CurrentPhase phase={currentPhase}>
    <TrainingItemsList items={trainingItems} />
  </CurrentPhase>
  
  <ActionButtons>
    <Button onClick={continueTraining}>Continue Training</Button>
  </ActionButtons>
</TrainingDashboard>
```

#### Training Item Completion
```jsx
// Individual training item interface
<TrainingItem>
  <ItemHeader>
    <ItemNumber>01</ItemNumber>
    <ItemTitle>Emergency Procedures</ItemTitle>
  </ItemHeader>
  
  <ItemDescription>
    Learn and practice emergency response procedures including
    alarm signals, muster stations, and evacuation routes.
  </ItemDescription>
  
  <CompletionForm>
    <InstructorInitials 
      value={initials}
      onChange={setInitials}
      placeholder="Instructor initials"
    />
    
    <PhotoUpload
      onUpload={handlePhotoUpload}
      uploaded={photoPath}
    />
    
    <Comments
      value={comments}
      onChange={setComments}
      placeholder="Additional comments (optional)"
    />
    
    <MarkCompleteButton
      onClick={markComplete}
      disabled={!initials}
    >
      Mark as Complete
    </MarkCompleteButton>
  </CompletionForm>
</TrainingItem>
```

### Manager Interface

#### Training Overview
```jsx
// Manager's view of crew training progress
<CrewTrainingOverview>
  <FilterBar>
    <SearchInput placeholder="Search crew members..." />
    <StatusFilter options={['all', 'in_progress', 'completed']} />
    <VesselFilter vessels={availableVessels} />
  </FilterBar>
  
  <CrewTrainingTable>
    <thead>
      <tr>
        <th>Crew Member</th>
        <th>Position</th>
        <th>Phase 1</th>
        <th>Phase 2</th>
        <th>Phase 3</th>
        <th>Overall Progress</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {crewMembers.map(member => (
        <CrewTrainingRow 
          key={member.id}
          member={member}
          onViewDetails={viewTrainingDetails}
        />
      ))}
    </tbody>
  </CrewTrainingTable>
</CrewTrainingOverview>
```

#### Detailed Progress View
```jsx
// Detailed view of individual crew member's training
<CrewMemberTrainingDetail>
  <MemberInfo>
    <h2>{member.firstName} {member.lastName}</h2>
    <p>{member.position} - {member.vesselAssignment}</p>
  </MemberInfo>
  
  <PhaseAccordion>
    {phases.map(phase => (
      <PhaseSection key={phase.number}>
        <PhaseHeader>
          Phase {phase.number}: {phase.name}
          <ProgressBadge>{phase.percentage}%</ProgressBadge>
        </PhaseHeader>
        
        <PhaseItems>
          {phase.items.map(item => (
            <ItemDetail 
              key={item.id}
              item={item}
              showInstructorInfo={true}
            />
          ))}
        </PhaseItems>
      </PhaseSection>
    ))}
  </PhaseAccordion>
  
  <ActionButtons>
    <Button onClick={exportProgress}>Export Progress Report</Button>
    <Button onClick={sendReminder}>Send Reminder</Button>
  </ActionButtons>
</CrewMemberTrainingDetail>
```

## API Integration

### Training Endpoints

#### Get Training Progress
```javascript
GET /api/crew/training/progress

Response:
{
  phases: [
    {
      phase: 1,
      status: "completed",
      percentage: 100,
      started_at: "2025-01-15T10:00:00Z",
      completed_at: "2025-01-15T16:00:00Z",
      items_completed: 3,
      total_items: 3
    },
    {
      phase: 2,
      status: "in_progress",
      percentage: 45,
      started_at: "2025-01-16T09:00:00Z",
      items_completed: 5,
      total_items: 11
    }
  ],
  current_phase: 2,
  overall_progress: 48
}
```

#### Start Training Phase
```javascript
POST /api/crew/training/phase/2/start

Response:
{
  success: true,
  session: {
    id: "uuid",
    phase: 2,
    status: "in_progress",
    items: [...]
  }
}
```

#### Complete Training Item
```javascript
PUT /api/crew/training/items/{itemId}/complete

Request:
{
  instructor_initials: "JD",
  comments: "Completed satisfactorily",
  proof_photo_path: "uploads/training/photo123.jpg"
}

Response:
{
  success: true,
  item: {
    id: "uuid",
    completed: true,
    completed_at: "2025-01-16T11:30:00Z"
  },
  phase_progress: 54
}
```

## Photo Upload System

### Implementation
```javascript
// Training proof photo upload
async function uploadTrainingProof(itemId, file) {
  const formData = new FormData();
  formData.append('photo', file);
  
  const response = await fetch(`/api/upload/training-proof/${itemId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
}
```

### Storage Structure
```
uploads/
└── training/
    └── {user_id}/
        └── {session_id}/
            └── {item_id}/
                └── proof_{timestamp}.{ext}
```

### Security
- File size limit: 10MB
- Allowed formats: JPEG, PNG
- Virus scanning (if configured)
- Access control via Supabase Storage policies

## Progress Calculation

### Phase Progress
```javascript
function calculatePhaseProgress(phase) {
  const completedItems = phase.items.filter(item => item.completed).length;
  const totalItems = phase.items.length;
  
  return Math.round((completedItems / totalItems) * 100);
}
```

### Overall Progress
```javascript
function calculateOverallProgress(phases) {
  const weights = {
    1: 0.3,  // Phase 1: 30%
    2: 0.5,  // Phase 2: 50%
    3: 0.2   // Phase 3: 20%
  };
  
  let totalProgress = 0;
  
  phases.forEach(phase => {
    const phaseProgress = calculatePhaseProgress(phase);
    totalProgress += phaseProgress * weights[phase.number];
  });
  
  return Math.round(totalProgress);
}
```

## Notifications and Reminders

### Automated Notifications
- **Training Started**: When crew member begins a phase
- **Phase Completed**: When all items in a phase are done
- **Training Completed**: When all three phases are finished
- **Reminder**: If no progress for 7 days

### Email Templates
```javascript
// Phase completion email
const phaseCompleteEmail = {
  subject: `Training Phase ${phase} Completed - ${userName}`,
  html: `
    <h2>Training Phase ${phase} Completed</h2>
    <p>${userName} has successfully completed Phase ${phase} of their onboarding training.</p>
    <p>Completion Date: ${completionDate}</p>
    <p>Next Step: ${nextPhaseDescription}</p>
    <a href="${dashboardLink}">View Training Progress</a>
  `
};
```

## Reporting and Analytics

### Training Reports
- **Individual Progress Report**: Detailed training history for one crew member
- **Vessel Training Status**: Overview of all crew training for a vessel
- **Compliance Dashboard**: Company-wide training completion metrics
- **Instructor Activity**: Training items verified by each instructor

### Export Formats
- PDF reports for compliance records
- Excel exports for data analysis
- API endpoints for integration with external systems

## Offline Functionality

### Offline Training Mode
The system supports limited offline functionality:
- View previously loaded training items
- Mark items as complete offline
- Queue uploads for when connection returns
- Sync progress when back online

### Implementation
```javascript
// Service worker for offline support
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/crew/training')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => {
          // Return cached data when offline
          return caches.match('/offline-training-data');
        })
    );
  }
});
```

## Compliance and Audit

### Audit Trail
All training activities are logged:
- Training phase start/completion times
- Individual item completion with timestamps
- Instructor verification details
- Any modifications to training records

### Compliance Features
- **Immutable Records**: Completed training cannot be deleted
- **Version Control**: Track changes to training requirements
- **Digital Signatures**: Instructor verification via initials
- **Evidence Storage**: Photo proof archived securely
- **Retention Policy**: Records kept for minimum 5 years

## Integration with Other Systems

### Certificate Generation
Upon successful completion of all three phases:
1. System automatically triggers certificate generation
2. Certificate includes training completion details
3. Digital certificate stored in system
4. Email notification with certificate sent

### Workflow Integration
- Training requirements can be defined in workflow templates
- Custom training paths based on position/vessel
- Integration with HR systems for crew data
- API for third-party training providers

## Best Practices

### For Crew Members
1. Complete training items promptly
2. Ensure instructor verification for each item
3. Upload clear photos as evidence when required
4. Review materials before attempting quizzes
5. Contact support if technical issues arise

### For Managers
1. Monitor crew progress regularly
2. Send reminders for stalled training
3. Verify instructor credentials
4. Review completion evidence
5. Export reports for compliance records

### For Administrators
1. Keep training content updated
2. Configure role-specific training paths
3. Monitor system performance
4. Regular audit of training records
5. Maintain backup of training data

## Related Documentation
- [Certificate System](./certificate-system.md) - Certificate generation upon completion
- [Quiz System](../TRAINING_DATABASE_FIXES.md) - Assessment phase details
- [Workflow Management](../RICH_CONTENT_SYSTEM.md) - Custom training workflows
- [API Reference](../api/README.md) - Complete API documentation