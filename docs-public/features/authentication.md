<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Authentication System

The Maritime Onboarding System implements a dual authentication system designed to provide secure access for different user types while maintaining ease of use.

## Overview

The system uses two authentication methods:
1. **Password-based authentication** for administrators and managers
2. **Magic link authentication** for crew members

This approach balances security requirements with user experience, providing strong authentication for administrative users while offering a passwordless experience for crew members.

## Authentication Methods

### Password Authentication (Admin/Manager)

#### Implementation
```javascript
// Admin login endpoint
POST /api/auth/admin-login
{
  "email": "admin@example.com",
  "password": "your-secure-password"
}

// Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Security Features
- **Password Requirements**: Minimum 8 characters
- **Hashing**: bcrypt with 12 salt rounds
- **Rate Limiting**: 5 attempts per minute
- **Account Lockout**: Progressive delays after failed attempts

#### Password Storage
```javascript
// Password hashing
const bcrypt = require('bcryptjs');
const saltRounds = 12;

// Hash password before storage
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Verify password
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### Magic Link Authentication (Crew)

#### How It Works
1. Crew member receives magic link via email
2. Clicks link to authenticate
3. System validates token and creates session
4. Redirects to crew dashboard

#### Implementation
```javascript
// Generate magic link
async function generateMagicLink(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  
  await supabase.from('magic_links').insert({
    email,
    token,
    expires_at: expires,
    used: false
  });
  
  const magicLink = `${BASE_URL}/magic-login/${token}`;
  await sendMagicLinkEmail(email, magicLink);
  
  return { success: true };
}

// Validate magic link
async function validateMagicLink(token) {
  const { data: link } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date())
    .single();
  
  if (!link) {
    throw new Error('Invalid or expired link');
  }
  
  // Mark as used
  await supabase
    .from('magic_links')
    .update({ used: true })
    .eq('id', link.id);
  
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', link.email)
    .single();
  
  return user;
}
```

#### Security Features
- **Single Use**: Links can only be used once
- **Time Limited**: 30-minute expiration
- **Secure Tokens**: Cryptographically random 32-byte tokens
- **Email Verification**: Ensures access to email account

## JWT Token System

### Token Structure
```javascript
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "manager",
  "firstName": "Jane",
  "lastName": "Smith",
  "iat": 1704067200,
  "exp": 1704672000
}
```

### Token Generation
```javascript
import jwt from 'jsonwebtoken';

function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}
```

### Token Validation
```javascript
async function validateToken(token) {
  try {
    // Verify signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if blacklisted
    const { data: blacklisted } = await supabase
      .from('token_blacklist')
      .select('token')
      .eq('token', token)
      .single();
    
    if (blacklisted) {
      throw new Error('Token has been revoked');
    }
    
    // Validate user still exists and is active
    const { data: user } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', decoded.userId)
      .single();
    
    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

## Session Management

### Frontend Session Handling
```javascript
// AuthContext.js
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken(token)
        .then(decoded => setUser(decoded))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  
  const login = async (credentials) => {
    const response = await authService.login(credentials);
    localStorage.setItem('token', response.token);
    setUser(response.user);
    return response.user;
  };
  
  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await authService.logout(token);
    }
    localStorage.removeItem('token');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Token Refresh Strategy
```javascript
// Check token expiry and warn user
useEffect(() => {
  if (!user) return;
  
  const checkExpiry = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp * 1000 - Date.now();
    
    if (expiresIn < 24 * 60 * 60 * 1000) { // Less than 24 hours
      showNotification({
        type: 'warning',
        message: 'Your session will expire soon. Please log in again to continue.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }
  };
  
  // Check every hour
  const interval = setInterval(checkExpiry, 60 * 60 * 1000);
  checkExpiry(); // Check immediately
  
  return () => clearInterval(interval);
}, [user]);
```

## Security Features

### Rate Limiting
```javascript
const rateLimits = {
  '/api/auth/admin-login': {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many login attempts. Please try again later.'
  },
  '/api/auth/manager-login': {
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again later.'
  },
  '/api/auth/magic-login': {
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many attempts. Please wait before trying again.'
  }
};
```

### Account Lockout
```javascript
async function handleFailedLogin(email) {
  const { data: lockout } = await supabase
    .from('account_lockout')
    .select('*')
    .eq('email', email)
    .single();
  
  const attempts = (lockout?.attempts || 0) + 1;
  const lockoutDurations = [0, 0, 60, 300, 3600]; // seconds
  const lockoutDuration = lockoutDurations[Math.min(attempts - 1, 4)];
  
  if (lockout) {
    await supabase
      .from('account_lockout')
      .update({
        attempts,
        locked_until: lockoutDuration > 0 
          ? new Date(Date.now() + lockoutDuration * 1000)
          : null,
        last_attempt: new Date()
      })
      .eq('id', lockout.id);
  } else {
    await supabase
      .from('account_lockout')
      .insert({
        email,
        attempts: 1,
        last_attempt: new Date()
      });
  }
}
```

### Token Blacklisting
```javascript
// Logout endpoint
async function logout(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    // Add to blacklist
    await supabase.from('token_blacklist').insert({
      token,
      revoked_at: new Date(),
      reason: 'user_logout'
    });
    
    // Clean old entries (older than token expiry)
    await supabase
      .from('token_blacklist')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  }
  
  return res.json({ success: true });
}
```

## Multi-Factor Authentication (Future)

### Planned Implementation
- **TOTP Support**: Time-based one-time passwords
- **SMS Verification**: For high-security operations
- **Backup Codes**: Recovery mechanism
- **Device Trust**: Remember trusted devices

### Configuration
```javascript
// Future MFA configuration
const mfaConfig = {
  admin: {
    required: true,
    methods: ['totp', 'sms']
  },
  manager: {
    required: false,
    methods: ['totp']
  },
  crew: {
    required: false,
    methods: []
  }
};
```

## API Endpoints

### Authentication Endpoints
```
POST   /api/auth/admin-login      - Admin login with email/password
POST   /api/auth/manager-login    - Manager login with email/password
POST   /api/auth/magic-login      - Crew login with magic link token
GET    /api/auth/verify           - Verify current token
POST   /api/auth/logout           - Logout and blacklist token
POST   /api/auth/refresh          - Refresh token (future)
```

### Request Examples

#### Admin Login
```bash
curl -X POST https://api.your-domain.com/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password"
  }'
```

#### Magic Link Login
```bash
curl -X POST https://api.your-domain.com/auth/magic-login \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6..."
  }'
```

#### Verify Token
```bash
curl -X GET https://api.your-domain.com/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Troubleshooting

### Common Issues

#### "Invalid credentials" Error
- Verify email and password are correct
- Check if account is active
- Ensure no account lockout is in effect

#### "Token expired" Error
- Token lifetime is 7 days
- User needs to log in again
- Consider implementing token refresh

#### Magic Link Not Working
- Check link hasn't expired (30 minutes)
- Verify link hasn't been used already
- Ensure email delivery is working

### Debug Mode
```javascript
// Enable auth debugging
if (process.env.NODE_ENV === 'development') {
  console.log('Auth Debug:', {
    token: token.substring(0, 20) + '...',
    decoded: decoded,
    expires: new Date(decoded.exp * 1000)
  });
}
```

## Best Practices

### Security Guidelines
1. **Never log passwords** or sensitive authentication data
2. **Use HTTPS** for all authentication requests
3. **Implement rate limiting** on all auth endpoints
4. **Monitor failed attempts** and implement lockouts
5. **Rotate JWT secrets** periodically
6. **Clean up expired data** (magic links, blacklisted tokens)

### Implementation Tips
1. **Clear error messages** without revealing sensitive info
2. **Graceful token expiry** with user warnings
3. **Secure token storage** in frontend
4. **Audit all authentication** events
5. **Test edge cases** (expired tokens, concurrent logins)

## Related Documentation
- [Security Architecture](../architecture/security.md) - Overall security design
- [API Architecture](../architecture/api.md) - API authentication implementation
- [Role-Based Access Control](./role-based-access.md) - Authorization system
- [Magic Link System](../TOKEN_BLACKLIST_SYSTEM.md) - Detailed magic link implementation