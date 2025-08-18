# Design Document

## Overview

The dark mode toggle feature will implement a comprehensive theming system for the maritime onboarding application. The solution will leverage React Context for state management, CSS custom properties for theme variables, and Tailwind CSS's dark mode utilities. The implementation will be built on top of the existing Burando design system and integrate seamlessly with the current glass morphism aesthetic.

## Architecture

### Theme Management Architecture
```
ThemeProvider (React Context)
├── Theme State Management
├── Local Storage Persistence  
├── System Preference Detection
└── Theme Application Logic

Application Components
├── Consume Theme Context
├── Apply Theme Classes
└── Render Theme Toggle UI

CSS Layer
├── CSS Custom Properties (Light/Dark)
├── Tailwind Dark Mode Classes
└── Enhanced Burando Theme Variables
```

### Integration Points
- **Feature Flag System**: Integrate with existing `config/features.js` to control dark mode availability
- **Context System**: Add ThemeContext alongside existing AuthContext and LanguageContext
- **Styling System**: Extend existing `burando-theme.css` with dark mode variables
- **Component System**: Update Layout component to include theme toggle

## Components and Interfaces

### 1. ThemeContext (`client/src/contexts/ThemeContext.js`)
```javascript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  isDarkMode: boolean;
}
```

**Responsibilities:**
- Manage current theme state
- Persist theme preference to localStorage
- Detect system color scheme preference
- Provide theme utilities to components

### 2. ThemeToggle Component (`client/src/components/ThemeToggle.js`)
```javascript
interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```

**Responsibilities:**
- Render toggle button with appropriate icon
- Handle click events to toggle theme
- Provide visual feedback and accessibility features
- Support different sizes and styling options

### 3. Enhanced Feature Flag
```javascript
// Addition to config/features.js
DARK_MODE_ENABLED: {
  name: 'Dark Mode',
  description: 'Enables dark mode toggle for users',
  defaultValue: true,
  envVar: 'DARK_MODE_ENABLED',
  requiresRestart: false
}
```

### 4. Theme-Aware Layout Component
The existing `Layout` component will be enhanced to:
- Include ThemeToggle in navigation
- Apply theme classes to root elements
- Handle theme transitions smoothly

## Data Models

### Theme Preference Storage
```javascript
// localStorage key: 'burando-theme-preference'
{
  theme: 'light' | 'dark',
  timestamp: number,
  version: '1.0'
}
```

### Theme Configuration
```javascript
const themeConfig = {
  light: {
    name: 'Light Mode',
    icon: 'sun',
    cssClass: 'light'
  },
  dark: {
    name: 'Dark Mode', 
    icon: 'moon',
    cssClass: 'dark'
  }
}
```

## CSS Architecture

### Enhanced CSS Custom Properties
```css
:root {
  /* Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1a202c;
  --text-secondary: #4a5568;
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.18);
}

[data-theme="dark"] {
  /* Dark theme overrides */
  --bg-primary: #1a202c;
  --bg-secondary: #2d3748;
  --text-primary: #f7fafc;
  --text-secondary: #e2e8f0;
  --glass-bg: rgba(26, 32, 44, 0.4);
  --glass-border: rgba(255, 255, 255, 0.1);
}
```

### Tailwind Configuration Enhancement
```javascript
// tailwind.config.js enhancement
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  // ... existing configuration
}
```

### Component-Level Theme Classes
- Use Tailwind's `dark:` prefix for dark mode styles
- Maintain existing glass morphism effects with theme-appropriate opacity
- Ensure proper contrast ratios for accessibility

## Error Handling

### Theme Loading Errors
- **Fallback Strategy**: Default to light theme if localStorage is corrupted
- **Validation**: Validate stored theme preference before applying
- **Error Logging**: Log theme-related errors for debugging

### Feature Flag Handling
- **Graceful Degradation**: Hide theme toggle when feature is disabled
- **Runtime Checks**: Verify feature flag status before rendering toggle
- **Default Behavior**: Maintain light theme when dark mode is disabled

### Browser Compatibility
- **CSS Custom Properties**: Provide fallbacks for older browsers
- **localStorage**: Handle cases where localStorage is unavailable
- **System Preferences**: Gracefully handle unsupported `prefers-color-scheme`

## Testing Strategy

### Unit Tests
- **ThemeContext**: Test theme state management and persistence
- **ThemeToggle**: Test toggle functionality and accessibility
- **CSS Variables**: Test theme variable application

### Integration Tests
- **Theme Persistence**: Verify theme survives page refresh
- **Feature Flag Integration**: Test behavior when feature is disabled
- **System Preference Detection**: Test automatic theme detection

### Visual Regression Tests
- **Component Rendering**: Ensure all components render correctly in both themes
- **Contrast Ratios**: Verify accessibility standards are met
- **Glass Effects**: Ensure glass morphism works in both themes

### Accessibility Tests
- **Keyboard Navigation**: Ensure theme toggle is keyboard accessible
- **Screen Reader Support**: Test with screen readers
- **Color Contrast**: Verify WCAG compliance for both themes

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create ThemeContext with basic functionality
2. Add DARK_MODE_ENABLED feature flag
3. Enhance CSS with dark mode variables
4. Configure Tailwind for dark mode

### Phase 2: Component Implementation
1. Build ThemeToggle component
2. Integrate toggle into Layout component
3. Apply theme classes to existing components
4. Test theme switching functionality

### Phase 3: Polish and Optimization
1. Add smooth theme transitions
2. Implement system preference detection
3. Optimize CSS for performance
4. Add comprehensive error handling

### Phase 4: Testing and Refinement
1. Comprehensive testing across all components
2. Accessibility audit and fixes
3. Performance optimization
4. Documentation and user guidance