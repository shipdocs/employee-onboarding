# Frontend Architecture

The Maritime Onboarding System frontend is built with React, providing a modern, responsive, and user-friendly interface for all three user roles (admin, manager, crew).

## Technology Stack

### Core Technologies
- **Framework**: React 18.x with Hooks
- **Routing**: React Router v6
- **Styling**: Tailwind CSS 3.x
- **Icons**: Heroicons v2
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API
- **Build Tool**: Vite
- **Deployment**: Vercel

### Key Libraries
- **react-hot-toast**: Toast notifications
- **recharts**: Dashboard charts and analytics
- **date-fns**: Date manipulation
- **zod**: Client-side validation
- **i18next**: Internationalization

## Project Structure

```
client/src/
├── components/           # Reusable UI components
│   ├── common/          # Shared components
│   ├── admin/           # Admin-specific components
│   ├── manager/         # Manager-specific components
│   └── crew/            # Crew-specific components
├── contexts/            # React Context providers
│   ├── AuthContext.js   # Authentication state
│   └── LanguageContext.js # Internationalization
├── pages/               # Page components (routes)
│   ├── admin/          # Admin pages
│   ├── manager/        # Manager pages
│   ├── crew/           # Crew pages
│   └── public/         # Public pages
├── services/           # API service layer
│   ├── auth.js         # Authentication services
│   ├── api.js          # Base API configuration
│   └── ...             # Domain-specific services
├── hooks/              # Custom React hooks
│   ├── useAuth.js      # Authentication hook
│   ├── useApi.js       # API fetching hook
│   └── useDebounce.js  # Debouncing hook
├── utils/              # Utility functions
│   ├── validation.js   # Form validation
│   ├── formatters.js   # Data formatting
│   └── constants.js    # App constants
├── locales/            # Translation files
│   ├── en/            # English translations
│   └── nl/            # Dutch translations
├── assets/            # Static assets
│   └── images/        # Images and logos
├── styles/            # Global styles
│   └── index.css      # Tailwind imports
├── App.js             # Main app component
└── main.js            # App entry point
```

## Core Architecture Patterns

### Component Architecture

#### Component Types

1. **Page Components**: Route-level components
```jsx
// pages/manager/Dashboard.js
export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);
  
  return (
    <DashboardLayout>
      <StatsOverview stats={stats} />
      <RecentActivity />
      <ComplianceChart />
    </DashboardLayout>
  );
}
```

2. **Feature Components**: Complex business logic
```jsx
// components/manager/CrewManagement.js
export default function CrewManagement() {
  const [crew, setCrew] = useState([]);
  const [filters, setFilters] = useState({});
  
  const handleCreateCrew = async (data) => {
    const newCrew = await crewService.create(data);
    setCrew([...crew, newCrew]);
    toast.success('Crew member created');
  };
  
  return (
    <div className="space-y-6">
      <CrewFilters onFilter={setFilters} />
      <CrewTable crew={filteredCrew} />
      <CreateCrewModal onSubmit={handleCreateCrew} />
    </div>
  );
}
```

3. **UI Components**: Reusable presentation components
```jsx
// components/common/Button.js
export default function Button({ 
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  ...props 
}) {
  const styles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
  
  return (
    <button
      className={`px-4 py-2 rounded-md ${styles[variant]} ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={loading}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
```

### State Management

#### Authentication Context
```jsx
// contexts/AuthContext.js
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token).then(setUser).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  
  const login = async (credentials) => {
    const { token, user } = await authService.login(credentials);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'manager',
      isCrew: user?.role === 'crew'
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### Language Context
```jsx
// contexts/LanguageContext.js
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );
  
  useEffect(() => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  }, [language]);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
```

### Routing Structure

```jsx
// App.js
function App() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/magic-login/:token" element={<MagicLogin />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Admin routes */}
        {user?.role === 'admin' && (
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/managers" element={<ManagerList />} />
            <Route path="/admin/templates" element={<TemplateEditor />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
          </>
        )}
        
        {/* Manager routes */}
        {user?.role === 'manager' && (
          <>
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/manager/crew" element={<CrewManagement />} />
            <Route path="/manager/certificates" element={<CertificateList />} />
            <Route path="/manager/quiz-reviews" element={<QuizReviews />} />
          </>
        )}
        
        {/* Crew routes */}
        {user?.role === 'crew' && (
          <>
            <Route path="/crew" element={<CrewDashboard />} />
            <Route path="/crew/training/:phase" element={<TrainingPhase />} />
            <Route path="/crew/quiz/:phase" element={<Quiz />} />
            <Route path="/crew/profile" element={<Profile />} />
          </>
        )}
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to={getDefaultRoute(user)} />} />
    </Routes>
  );
}
```

## Service Layer

### API Service Base
```javascript
// services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message, error.code, response.status);
    }
    
    return response.json();
  }
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();
```

### Domain Services
```javascript
// services/crew.js
class CrewService {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters);
    return api.get(`/manager/crew?${params}`);
  }
  
  async getById(id) {
    return api.get(`/manager/crew/${id}`);
  }
  
  async create(data) {
    return api.post('/manager/crew', data);
  }
  
  async update(id, data) {
    return api.put(`/manager/crew/${id}`, data);
  }
  
  async delete(id) {
    return api.delete(`/manager/crew/${id}`);
  }
  
  async sendMagicLink(id) {
    return api.post(`/manager/crew/${id}/send-magic-link`);
  }
}

export default new CrewService();
```

## UI Components

### Design System

#### Color Palette
```css
/* Tailwind config extension */
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8'
  },
  success: {
    500: '#10b981',
    600: '#059669'
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706'
  },
  danger: {
    500: '#ef4444',
    600: '#dc2626'
  }
}
```

#### Component Library
- **Buttons**: Primary, secondary, danger variants
- **Forms**: Input, select, textarea, checkbox, radio
- **Feedback**: Toast, modal, alert, loading states
- **Navigation**: Sidebar, breadcrumbs, tabs
- **Data Display**: Tables, cards, charts, badges
- **Layout**: Container, grid, stack, divider

### Responsive Design
```jsx
// Responsive utilities
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards adapt to screen size */}
</div>

<nav className="hidden md:flex"> {/* Desktop nav */}
<nav className="md:hidden"> {/* Mobile nav */}
```

## Performance Optimization

### Code Splitting
```jsx
// Lazy loading for routes
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const TemplateEditor = lazy(() => import('./pages/admin/TemplateEditor'));

// Wrap with Suspense
<Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route path="/admin" element={<AdminDashboard />} />
  </Routes>
</Suspense>
```

### Memoization
```jsx
// Memoize expensive computations
const expensiveStats = useMemo(() => {
  return calculateComplexStats(data);
}, [data]);

// Memoize components
const MemoizedChart = memo(({ data }) => {
  return <ComplexChart data={data} />;
});
```

### Optimized Rendering
```jsx
// Use keys for lists
{crew.map(member => (
  <CrewCard key={member.id} member={member} />
))}

// Virtualization for large lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <ItemRow item={items[index]} />
    </div>
  )}
</FixedSizeList>
```

## Error Handling

### Error Boundaries
```jsx
class ErrorBoundary extends Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    
    return this.props.children;
  }
}
```

### API Error Handling
```jsx
// Custom hook for API calls
function useApi(apiCall) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);
  
  return { data, loading, error, execute };
}
```

## Testing

### Unit Testing
```jsx
// Button.test.jsx
import { render, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <Button onClick={handleClick}>Click</Button>
    );
    
    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing
```jsx
// CrewManagement.test.jsx
import { render, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import CrewManagement from './CrewManagement';

const server = setupServer(
  rest.get('/api/manager/crew', (req, res, ctx) => {
    return res(ctx.json({ data: mockCrewData }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('loads and displays crew members', async () => {
  const { getByText } = render(<CrewManagement />);
  
  await waitFor(() => {
    expect(getByText('John Doe')).toBeInTheDocument();
  });
});
```

## Deployment

### Build Configuration
```javascript
// vite.config.js
export default {
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          utils: ['date-fns', 'zod']
        }
      }
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
  }
};
```

### Environment Variables
```env
VITE_API_URL=https://api.onboarding.burando.online
VITE_APP_URL=https://onboarding.burando.online
VITE_ENVIRONMENT=production
```

## Related Documentation
- [API Architecture](./api.md) - Backend API integration
- [Security Architecture](./security.md) - Frontend security practices
- [Component Reference](developers/component-reference-generated.md) - Component documentation
- [Development Workflow](../development/workflow.md) - Development practices