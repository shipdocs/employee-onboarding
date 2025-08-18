---
id: "T01_S02"
title: "TypeScript Coverage Improvement"
sprint: "S02_M01_Technical_Debt_Resolution"
milestone: "M01_System_Stabilization"
status: "in_progress"
complexity: "high"
priority: "critical"
estimated_hours: 20
created: "2025-06-10 10:20"
updated: "2025-06-10 10:20"
assignee: ""
dependencies: []
related_adrs: []
---

# T01_S02: TypeScript Coverage Improvement

## 📋 Beschrijving

Verhoog de TypeScript coverage van het Maritime Onboarding System van de huidige ~60% naar 90% om betere type safety, fewer runtime errors, en improved developer experience te bereiken.

## 🎯 Doel

Implementeer comprehensive TypeScript typing across de gehele codebase om code quality te verbeteren en development velocity te verhogen voor toekomstige features.

## 🔍 Context Analysis

### **Current TypeScript State**
- **Coverage**: ~60% (estimated)
- **Problem Areas**: 
  - API routes with `any` types
  - Frontend components without proper props typing
  - Database query results without type definitions
  - Utility functions with loose typing

### **Target State**
- **Coverage**: 90%
- **Strict Mode**: Enabled where possible
- **Type Definitions**: Complete for all major interfaces
- **Error Reduction**: Fewer runtime type errors

## ✅ Acceptatie Criteria

### **Must Have**
- [ ] TypeScript coverage reaches 90%
- [ ] All API routes have proper type definitions
- [ ] Frontend components have complete prop types
- [ ] Database models have TypeScript interfaces
- [ ] Utility functions are properly typed

### **Should Have**
- [ ] Strict mode enabled in tsconfig.json
- [ ] Type-only imports used where appropriate
- [ ] Generic types implemented for reusable components
- [ ] Type guards implemented for runtime validation
- [ ] Documentation updated with type examples

### **Could Have**
- [ ] Advanced TypeScript features (mapped types, conditional types)
- [ ] Type testing with tools like tsd
- [ ] Automated type coverage reporting
- [ ] TypeScript ESLint rules enhanced

## 🔧 Subtasks

### 1. **Assessment & Planning**
- [x] **Current Coverage Analysis**: Measure exact TypeScript coverage (0% - 289 JS files)
- [x] **Priority Areas**: Identify critical areas needing typing (API routes: 112, Frontend: 74)
- [x] **Type Definition Audit**: Review existing type definitions (none found)
- [x] **Tool Setup**: Configure type coverage measurement tools (tsconfig.json created)

### 2. **API Routes TypeScript Implementation**
- [ ] **Request/Response Types**: Define types for all API endpoints
- [ ] **Middleware Types**: Type middleware functions properly
- [ ] **Error Types**: Create standardized error type definitions
- [ ] **Validation Types**: Type request validation schemas

### 3. **Frontend Component Typing**
- [ ] **React Component Props**: Add proper prop types to all components
- [ ] **State Types**: Type component state and context
- [ ] **Event Handler Types**: Properly type event handlers
- [ ] **Hook Types**: Type custom hooks and their returns

### 4. **Database & Service Layer**
- [ ] **Database Models**: Create TypeScript interfaces for all models
- [ ] **Query Result Types**: Type database query results
- [ ] **Service Function Types**: Type service layer functions
- [ ] **API Client Types**: Type external API interactions

### 5. **Utility & Helper Functions**
- [ ] **Function Signatures**: Add proper typing to utility functions
- [ ] **Generic Functions**: Implement generics where appropriate
- [ ] **Type Guards**: Create type guard functions for validation
- [ ] **Constant Types**: Type constants and configuration objects

## 🧪 Technische Guidance

### **TypeScript Configuration**
```json
// tsconfig.json improvements
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

### **API Route Typing Example**
```typescript
// Before
export default async function handler(req, res) {
  const { email, password } = req.body;
  // ... logic
}

// After
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export default async function handler(
  req: NextApiRequest & { body: LoginRequest },
  res: NextApiResponse<LoginResponse>
) {
  const { email, password } = req.body;
  // ... logic
}
```

### **React Component Typing Example**
```typescript
// Before
function UserCard({ user, onEdit }) {
  return <div>{user.name}</div>;
}

// After
interface UserCardProps {
  user: User;
  onEdit: (userId: string) => void;
  className?: string;
}

function UserCard({ user, onEdit, className }: UserCardProps) {
  return <div className={className}>{user.name}</div>;
}
```

### **Database Model Typing**
```typescript
// Database interfaces
interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'crew';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

interface TrainingSession {
  id: string;
  user_id: string;
  workflow_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  started_at?: string;
  completed_at?: string;
}
```

## 📊 Implementation Plan

### **Phase 1: Foundation (Days 1-2)**
- [x] **Coverage Measurement**: Set up type coverage tools (TypeScript installed)
- [x] **Configuration**: Update tsconfig.json for stricter typing (root + client configs)
- [x] **Core Types**: Define core interfaces and types (types/index.ts + types/api.ts)
- [x] **Priority Assessment**: Identify highest-impact areas (API routes priority)

### **Phase 2: API Layer (Days 3-4)**
- [x] **API Route Types**: Type critical API endpoints (auth, training)
- [x] **Middleware Types**: Type middleware functions (auth, error handling)
- [x] **Error Handling**: Standardize error types (ApiResponse, ApiError)
- [x] **Validation**: Type request/response validation (login, stats)

### **Phase 3: Frontend Layer (Days 5-6)**
- [x] **Component Props**: Type React component props (Layout, LanguageSwitcher, LoadingSpinner)
- [x] **State Management**: Type state and context (AuthContext, LanguageContext)
- [x] **Event Handlers**: Type event handling functions (onClick, onChange)
- [ ] **Custom Hooks**: Type custom hooks

### **Phase 4: Data Layer (Days 7-8)**
- [x] **Database Models**: Create comprehensive model types (supabase.ts schema)
- [x] **Service Functions**: Type service layer (auth.ts, errorHandler.ts)
- [x] **Query Results**: Type database query results (typed Supabase client)
- [ ] **External APIs**: Type third-party integrations

### **Phase 5: Utilities & Polish (Days 9-10)**
- [ ] **Utility Functions**: Type helper functions
- [ ] **Constants**: Type configuration objects
- [ ] **Type Guards**: Implement runtime type checking
- [ ] **Documentation**: Update with type examples

## 📈 Success Metrics

### **Coverage Metrics**
- **TypeScript Coverage**: 90% (Target)
- **Strict Mode Compliance**: 100%
- **Type Error Reduction**: 80% fewer type-related errors
- **Build Time**: No significant increase

### **Quality Metrics**
- **Runtime Type Errors**: Reduced by 70%
- **Developer Experience**: Improved IntelliSense and autocomplete
- **Code Review Efficiency**: Faster reviews with better type safety
- **Refactoring Safety**: Safer refactoring with type checking

### **Performance Metrics**
- **Build Performance**: No degradation
- **Bundle Size**: No significant increase
- **Development Speed**: Improved with better tooling
- **Error Detection**: Earlier error detection in development

## 🚨 Risk Mitigation

### **Technical Risks**
- **Build Time Increase**: Monitor and optimize TypeScript compilation
- **Breaking Changes**: Incremental implementation to avoid disruption
- **Complex Type Definitions**: Start simple, add complexity gradually

### **Process Risks**
- **Developer Resistance**: Provide training and clear benefits
- **Time Overrun**: Focus on high-impact areas first
- **Scope Creep**: Stick to 90% coverage target

## 📝 Output Log

<!-- Voeg hier log entries toe tijdens implementatie -->

### **Coverage Progress**
- [x] Initial coverage: 0% (289 JS files, 0 TS files)
- [x] API routes coverage: 14.3% (16/112 files converted)
- [x] Frontend coverage: 18.9% (14/74 files converted)
- [x] Service layer coverage: 7/15 files (auth.ts, errorHandler.ts, supabase.ts, rateLimit.ts, urlUtils.ts, storage.ts, emailServiceFactory.ts)
- [x] Current coverage: 12.8% (37/289 files converted)

### **Implementation Results**
- [x] TypeScript errors resolved: 0 (clean start)
- [x] New type definitions created: 2 files (types/index.ts, types/api.ts)
- [x] Components typed: 12 (LoadingSpinner.tsx, Layout.tsx, LanguageSwitcher.tsx, ErrorBoundary.tsx, MobileBottomNav.tsx, SessionExpirationWarning.tsx, AddManagerModal.tsx, MobileWarning.tsx, NetworkStatus.tsx, EnhancedErrorBoundary.tsx, EditManagerModal.tsx, SystemSettings.tsx)
- [x] Context providers typed: 2 (AuthContext.tsx, LanguageContext.tsx)
- [x] API endpoints typed: 16 (health.ts, manager-login.ts, admin-login.ts, logout.ts, training/stats.ts, request-magic-link.ts, magic-login.ts, verify.ts, training/phase/[phase].ts, training/submit-quiz.ts, training/complete-item.ts, admin/stats.ts, admin/managers/index.ts, admin/system-settings.ts, crew/profile.ts, manager/crew/index.ts)
- [x] Service functions typed: 7 (auth.ts, errorHandler.ts, supabase.ts, rateLimit.ts, urlUtils.ts, storage.ts, emailServiceFactory.ts)

---

**Task Owner**: Frontend/Backend Team  
**Reviewer**: Technical Lead  
**Estimated Completion**: 2025-06-20
