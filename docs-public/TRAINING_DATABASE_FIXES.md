# Training Database Schema Fixes

## Issue
The training completion API was failing with a 500 error: `column training_items.item_number does not exist`

## Root Cause
The `training_items` table was missing several required columns that the API code expected:
- `item_number` (TEXT)
- `title` (TEXT) 
- `description` (TEXT)
- `phase` (INTEGER)
- `completed` (BOOLEAN)
- `instructor_initials` (TEXT)
- `comments` (TEXT)
- `proof_photo_path` (TEXT)

## Database Fixes Applied

### 1. Added Missing Columns
```sql
ALTER TABLE training_items 
ADD COLUMN IF NOT EXISTS item_number TEXT NOT NULL DEFAULT '01',
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Training Item',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS phase INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instructor_initials TEXT,
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS proof_photo_path TEXT;
```

### 2. Fixed Legacy Column Constraints
```sql
ALTER TABLE training_items 
ALTER COLUMN item_type DROP NOT NULL,
ALTER COLUMN item_data DROP NOT NULL;
```

### 3. Updated Training Session Status
```sql
UPDATE training_sessions 
SET status = 'in_progress', started_at = NOW() 
WHERE user_id = 49 AND phase = 1;
```

### 4. Created Training Items for Phase 1
```sql
INSERT INTO training_items (session_id, item_number, title, description, phase, completed) VALUES 
(73, '01', 'Meet colleagues + daily affairs on board', 'Introduction to crew members and daily routines', 1, false),
(73, '02', 'Familiarization with vessel + safety equipment', 'Complete vessel tour and safety equipment identification', 1, false),
(73, '03', 'Emergency procedures + muster stations', 'Learn emergency response procedures and muster station locations', 1, false);
```

## Result
- Training completion API now works correctly
- Crew members can mark training items as complete
- Database schema matches the expected API structure
- Training workflow can proceed normally

## Date Applied
2025-05-31 16:17:00 UTC
