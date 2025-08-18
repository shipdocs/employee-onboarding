# Static Training Data Analysis

## Overview
Analysis of the `config/training-data.js` file structure to understand all content types, nested objects, and data relationships that need to be preserved during migration to the database.

## File Structure

### Root Object Structure
```javascript
{
  phases: { 1: {...}, 2: {...}, 3: {...} },
  quizzes: { 1: [...], 2: [...], 3: [...] },
  certificateTypes: [...]
}
```

## Phase Structure Analysis

### Phase Level Properties
Each phase contains:
- `title` (string) - Phase name
- `description` (string) - Phase description  
- `timeLimit` (number) - Time limit in hours
- `items` (array) - Array of training items

### Training Item Structure
Each training item has:
- `number` (string) - Item number (e.g., "01", "02")
- `title` (string) - Item title
- `description` (string) - Item description
- `category` (string) - Category classification
- `content` (object, optional) - Rich content structure

### Rich Content Structure
The `content` object contains:
- `overview` (string) - Detailed overview text
- `objectives` (array of strings) - Learning objectives
- `keyPoints` (array of strings) - Key points to remember
- `procedures` (array of strings) - Step-by-step procedures
- `emergencyTypes` (array of strings, optional) - Emergency types (Phase 1 only)

## Data Statistics

### Phase 1: Immediate Safety Training
- **Items**: 18 training items
- **Rich Content Items**: 18 (100% have detailed content)
- **Categories**: orientation, emergency, safety, policy, documentation
- **Special Features**: Emergency types in item 02

### Phase 2: Operational Training  
- **Items**: 34 training items
- **Rich Content Items**: 18 (53% have detailed content)
- **Categories**: deck, cargo, maintenance, safety, navigation, engine
- **Note**: Items 19-36 have basic structure only (title, description, category)

### Phase 3: Advanced Training & Policies
- **Items**: 8 training items  
- **Rich Content Items**: 0 (0% have detailed content)
- **Categories**: policy, security, safety, management
- **Note**: All items have basic structure only

## Quiz Structure Analysis

### Quiz Question Structure
Each quiz question contains:
- `question` (string) - Question text
- `options` (array of strings) - Multiple choice options
- `correct` (number) - Index of correct answer (0-based)
- `explanation` (string) - Explanation of correct answer

### Quiz Statistics
- **Phase 1**: 10 questions
- **Phase 2**: 10 questions  
- **Phase 3**: 2 questions

## Certificate Types
Array of 12 certificate types for European Inland Waterways:
- Rijnpatent (Rhine Patent)
- Binnenvaartbewijs (Inland Waterway Certificate)
- Radarpatent (Radar Patent)
- ADN certifications (Basic, Dry Cargo, Tank)
- VHF, First Aid, Fire Fighting, Medical, LPG, Crane certificates

## Migration Considerations

### Content Completeness
1. **Phase 1**: Fully detailed with rich content - ready for migration
2. **Phase 2**: Partially detailed - 18 items with rich content, 16 basic items
3. **Phase 3**: Basic structure only - needs content development

### Data Preservation Requirements
1. **Maintain exact structure** for rich content items
2. **Preserve all arrays** (objectives, keyPoints, procedures)
3. **Keep category classifications** for filtering/organization
4. **Maintain item numbering** for reference consistency
5. **Preserve quiz question order** and explanations

### Database Mapping
- `phases` → `training_phases` table
- `items` → `training_phases.items` JSONB field
- `content` → Enhanced content structure in items
- `quizzes` → `quiz_content` table
- `certificateTypes` → Reference data (separate table or config)

### Migration Challenges
1. **Mixed content levels**: Some items have rich content, others don't
2. **Category standardization**: Ensure consistent category values
3. **Content validation**: Verify all required fields are present
4. **Quiz integration**: Link quizzes to correct phases
5. **Backward compatibility**: Ensure existing training sessions continue working

## Recommended Migration Strategy
1. **Phase-by-phase migration**: Start with Phase 1 (most complete)
2. **Content enhancement**: Develop missing content for Phases 2 & 3
3. **Validation checks**: Ensure data integrity during migration
4. **Fallback mechanism**: Keep static data as backup during transition
5. **Testing**: Verify crew training experience remains unchanged
