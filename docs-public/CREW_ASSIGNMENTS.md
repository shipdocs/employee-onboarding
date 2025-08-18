# Crew Assignments Feature

## Overview

The crew assignments feature implements a many-to-many relationship between managers and crew members, allowing proper access control and data isolation in the maritime onboarding system.

## Database Schema

### Table: `crew_assignments`

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| manager_id | BIGINT | References users(id) - Must be a manager |
| crew_member_id | BIGINT | References users(id) - Must be crew |
| assigned_at | TIMESTAMPTZ | When the assignment was created |
| assigned_by | BIGINT | Admin who created the assignment |
| unassigned_at | TIMESTAMPTZ | When assignment was terminated |
| unassigned_by | BIGINT | Admin who terminated assignment |
| assignment_reason | TEXT | Reason for the assignment |
| vessel_assignment | TEXT | Specific vessel for this assignment |
| is_active | BOOLEAN | Whether assignment is currently active |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Constraints

- Unique active assignment per manager-crew pair
- Role validation triggers ensure proper user roles
- Cascading deletes when users are removed
- Row Level Security (RLS) policies for access control

## API Changes

### Manager Endpoints

#### GET /api/manager/crew
- Now only returns crew members assigned to the authenticated manager
- Includes assignment information (assigned date, reason, vessel)
- Filtered by active assignments only

#### GET /api/manager/crew/[id]
- Validates manager has access to the specific crew member
- Returns 403 Forbidden if no active assignment exists

#### PUT /api/manager/crew/[id]
- Validates manager has access before allowing updates
- Logs all updates to audit_log

#### DELETE /api/manager/crew/[id]
- Validates manager has access before allowing deletion
- Soft delete recommended to preserve data integrity

#### POST /api/manager/crew
- Creates new crew member
- Automatically creates assignment to the creating manager
- Assignment reason: "Created by manager"

## Security

### Row Level Security (RLS)

The crew_assignments table has RLS policies that ensure:

1. **Admins** can view, create, update, and delete all assignments
2. **Managers** can only view their own assignments
3. **Crew members** have no direct access to this table

### Access Control Flow

```
Manager Request → API Endpoint → Check Assignment → Allow/Deny Access
                                        ↓
                              crew_assignments table
                                        ↓
                              is_active = true
                              manager_id matches
```

## Management Script

A management script is provided for administrators:

```bash
# List all active assignments
node scripts/manage-crew-assignments.js list

# List assignments for specific manager
node scripts/manage-crew-assignments.js list --manager-id=123

# Assign crew member to manager
node scripts/manage-crew-assignments.js assign 123 456 --reason="New vessel crew"

# Remove assignment
node scripts/manage-crew-assignments.js unassign 123 456

# Bulk assign multiple crew members
node scripts/manage-crew-assignments.js bulk-assign 123 --crew-ids=456,789,012
```

## Migration

The migration file `20250702144156_create_crew_assignments_table.sql` creates:

1. The crew_assignments table with all columns and constraints
2. Performance indexes for common queries
3. RLS policies for security
4. Triggers for data validation and audit logging
5. Functions for automatic timestamp updates

## Frontend Impact

The manager dashboard will now:

1. Only display assigned crew members
2. Show assignment metadata (date, reason, vessel)
3. Prevent access to unassigned crew member details
4. Display appropriate error messages for access violations

## Best Practices

1. **Always use active assignments** - Don't delete records, set is_active = false
2. **Include assignment reasons** - Helps with audit trails and reporting
3. **Track vessel assignments** - Important for maritime compliance
4. **Regular cleanup** - Periodically review and update assignments
5. **Audit everything** - All assignment changes are logged

## Future Enhancements

1. **Time-based assignments** - Add start/end dates for temporary assignments
2. **Hierarchical managers** - Support manager hierarchies
3. **Bulk operations API** - Add endpoints for bulk assignment management
4. **Assignment history view** - UI for viewing assignment history
5. **Notification system** - Notify managers of new assignments