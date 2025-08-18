# Template-Flow Architecture Proposal

## Problem Statement
Currently, PDF templates are manually linked to onboarding flows through name-based searches and manual data binding configuration. This is fragile, error-prone, and doesn't scale.

## Proposed Solution

### 1. Database Schema Changes

#### New Table: `onboarding_flows`
```sql
CREATE TABLE onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  form_type VARCHAR(100) NOT NULL, -- '05_03a', 'medical_form', etc.
  pdf_template_id UUID REFERENCES pdf_templates(id),
  data_mapping JSONB, -- Automatic field mapping configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Update `pdf_templates` table:
```sql
ALTER TABLE pdf_templates ADD COLUMN template_type VARCHAR(100); -- 'onboarding_form', 'certificate', etc.
ALTER TABLE pdf_templates ADD COLUMN auto_data_mapping JSONB; -- Predefined field mappings
```

### 2. Template-Flow Configuration System

#### Flow Configuration Example:
```json
{
  "id": "05_03a_flow",
  "name": "Form 05_03a Onboarding",
  "form_type": "05_03a",
  "pdf_template_id": "template-uuid-here",
  "data_mapping": {
    "user_fields": {
      "firstName": "user.first_name",
      "lastName": "user.last_name", 
      "email": "user.email",
      "position": "user.position",
      "vesselAssignment": "user.vessel_assignment"
    },
    "form_fields": {
      "medicalCertificate": "formData.medicalInfo.medicalCertificate",
      "allergies": "formData.medicalInfo.allergies",
      "emergencyContactName": "formData.emergencyContact.name"
    },
    "computed_fields": {
      "completionDate": "NOW()",
      "formType": "STATIC:05_03a"
    }
  }
}
```

### 3. Auto-Template Generation

#### Template Field Auto-Detection:
```javascript
// When creating a template for an onboarding flow
const templateFields = [
  { type: 'text', binding: 'firstName', label: 'First Name', required: true },
  { type: 'text', binding: 'lastName', label: 'Last Name', required: true },
  { type: 'email', binding: 'email', label: 'Email Address', required: true },
  { type: 'text', binding: 'position', label: 'Position', required: false },
  { type: 'date', binding: 'completionDate', label: 'Completion Date', required: true }
];
```

### 4. Implementation Plan

#### Phase 1: Database & Configuration
1. Create `onboarding_flows` table
2. Update `pdf_templates` table
3. Create flow configuration API endpoints
4. Build admin interface for flow-template management

#### Phase 2: Auto-Mapping System
1. Implement automatic data binding resolution
2. Create template field suggestion system
3. Build validation for data mapping completeness

#### Phase 3: Template Generation
1. Auto-generate template fields based on flow requirements
2. Implement template inheritance (base templates + flow-specific fields)
3. Add template versioning for flow updates

### 5. Benefits

#### For Developers:
- No more manual template searching
- Automatic data binding
- Type-safe field mapping
- Easy to add new flows

#### For Admins:
- Visual flow-template configuration
- Template field auto-suggestion
- Data mapping validation
- Template reusability

#### For Maintenance:
- Centralized flow configuration
- Version control for templates
- Automatic migration support
- Clear audit trail

### 6. API Design

#### Flow Management:
```
GET /api/admin/onboarding-flows
POST /api/admin/onboarding-flows
PUT /api/admin/onboarding-flows/{id}
DELETE /api/admin/onboarding-flows/{id}
```

#### Template-Flow Linking:
```
POST /api/admin/flows/{flowId}/link-template/{templateId}
GET /api/admin/flows/{flowId}/template-preview
POST /api/admin/flows/{flowId}/auto-generate-template
```

#### PDF Generation (Updated):
```
POST /api/pdf/generate-from-flow
{
  "flowId": "05_03a_flow",
  "userId": "user-uuid",
  "formData": { ... }
}
```

### 7. Migration Strategy

#### Step 1: Create new tables and APIs
#### Step 2: Migrate existing 05_03a template to new system
#### Step 3: Update PDF generation to use flow-based system
#### Step 4: Build admin interface
#### Step 5: Deprecate old manual system

This architecture provides:
- ✅ Automatic template-flow linking
- ✅ Intelligent data binding
- ✅ Scalable for new flows
- ✅ Admin-friendly configuration
- ✅ Developer-friendly APIs
- ✅ Maintainable and extensible
