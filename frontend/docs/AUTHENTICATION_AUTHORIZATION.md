# PMS-HU Authentication & Authorization System Documentation

## Overview

The PMS-HU (Property Management System - Haramaya University) implements a comprehensive authentication and authorization system that supports both regular users and guest users with role-based access control.

## Table of Contents

1. [Authentication System](#authentication-system)
2. [Authorization System](#authorization-system)
3. [User Roles](#user-roles)
4. [Guest User System](#guest-user-system)
5. [Access Control](#access-control)
6. [API Integration](#api-integration)
7. [Security Features](#security-features)

## Authentication System

### Regular User Authentication

Regular users authenticate using email and password credentials:

```javascript
// Login Endpoint
POST /api/users/login/
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "ADMIN",
    "full_name": "John Doe",
    "department": "IT"
  }
}
```

### Guest User Authentication

Guest users authenticate using a unique guest code and email:

```javascript
// Guest Login Endpoint
POST /api/users/guest-auth/
{
  "guest_code": "123e4567-e89b-12d3-a456-426614174000",
  "email": "guest@example.com"
}

// Response
{
  "guest_info": {
    "guest_code": "123e4567-e89b-12d3-a456-426614174000",
    "full_name": "Guest User",
    "email": "guest@example.com",
    "organization": "Haramaya University",
    "event_name": "Annual Conference 2024",
    "access_level": "LIMITED_ACCESS",
    "expires_at": "2024-12-31T23:59:59Z",
    "is_guest": true
  }
}
```

## Authorization System

### Role-Based Access Control (RBAC)

The system implements role-based access control with the following hierarchy:

```
ADMIN (Full Access)
├── PROPERTY_OFFICER (Property Management)
├── DEPT_HEAD (Department Management)
└── USER (Basic Access)
```

### Access Levels

#### Regular User Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| **ADMIN** | Full system access | Can manage all users, properties, and system settings |
| **PROPERTY_OFFICER** | Property CRUD, transfers, verification | Can manage properties, handle transfers, verify assets |
| **DEPT_HEAD** | Department properties, reports | Can manage department properties, view reports |
| **USER** | View assigned properties, basic operations | Can view assigned properties, submit requests |

#### Guest Access Levels

| Access Level | Permissions | Description |
|--------------|-------------|-------------|
| **VIEW_ONLY** | Read-only access | Can only view property information |
| **LIMITED_ACCESS** | View + verification | Can view properties and perform verification |
| **FULL_ACCESS** | Complete access | Full property management capabilities |

## User Roles

### 1. ADMIN

**Permissions:**
- Full system administration
- User management (create, update, delete users)
- Role assignment
- System configuration
- Full property management
- Guest user management
- Report generation and viewing

**Dashboard Features:**
- System overview statistics
- User management interface
- Guest user management
- System settings
- Comprehensive reports

### 2. PROPERTY_OFFICER

**Permissions:**
- Property CRUD operations
- Asset verification
- Transfer management
- Incident reporting
- Guest property access management

**Dashboard Features:**
- Property statistics
- Transfer requests
- Verification history
- Incident management
- Guest access control

### 3. DEPT_HEAD

**Permissions:**
- Department property management
- Department user oversight
- Department-specific reports
- Property assignment within department

**Dashboard Features:**
- Department property overview
- Department user statistics
- Department-specific reports
- Assignment tracking

### 4. USER

**Permissions:**
- View assigned properties
- Submit transfer requests
- Report incidents
- Basic property information access

**Dashboard Features:**
- Personal property assignments
- Transfer request status
- Incident reporting
- Personal profile management

## Guest User System

### Guest User Types

1. **Event-Based Guests** - Temporary access for specific events
2. **Vendor Guests** - External service providers
3. **Visitor Guests** - Short-term visitors
4. **Contractor Guests** - External contractors

### Guest Access Control

```javascript
// Guest Property Access Management
POST /api/users/guests/property-access/
{
  "guest_code": "123e4567-e89b-12d3-a456-426614174000",
  "property_id": 123,
  "access_level": "LIMITED_ACCESS",
  "expires_at": "2024-12-31T23:59:59Z"
}

// Guest Statistics
GET /api/users/guests/statistics/
{
  "total_guests": 150,
  "active_guests": 75,
  "expired_guests": 25,
  "access_levels": {
    "view_only": 50,
    "limited_access": 75,
    "full_access": 25
  },
  "event_statistics": [...]
}
```

## Access Control

### Protected Routes

The frontend uses `ProtectedRoute` component to enforce access control:

```javascript
// Regular User Routes
<ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER"]}>
  <PropertyManagement />
</ProtectedRoute>

// Guest-Allowed Routes
<ProtectedRoute allowGuest={true}>
  <GuestDashboard />
</ProtectedRoute>

// Role-Specific Routes
<ProtectedRoute allowedRoles={["ADMIN"]}>
  <SystemSettings />
</ProtectedRoute>
```

### Route Protection Table

| Route | Required Role | Guest Access | Description |
|-------|---------------|--------------|-------------|
| `/dashboard/admin` | ADMIN | No | Admin dashboard |
| `/properties` | USER+ | No | Property listing |
| `/guest-management` | ADMIN, PROPERTY_OFFICER, DEPT_HEAD | No | Guest user management |
| `/guest-property-access` | ADMIN, PROPERTY_OFFICER, DEPT_HEAD | Yes | Guest property access |
| `/guest-dashboard` | Any | Yes | Guest personal dashboard |
| `/verification` | USER+ | Yes | QR code verification |

## API Integration

### Authentication Headers

```javascript
// Regular User API Calls
headers: {
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json"
}

// Guest API Calls
headers: {
  "Authorization": `Bearer ${guestToken}`,
  "Content-Type": "application/json"
}
```

### Token Management

#### Regular Users
- **Access Token**: Short-lived (15 minutes) JWT token
- **Refresh Token**: Long-lived (7 days) token for token renewal
- **Storage**: LocalStorage with keys `accessToken` and `refreshToken`

#### Guest Users
- **Guest Token**: Guest code used as authentication token
- **Storage**: LocalStorage with keys `guestToken` and `guestInfo`

### Token Refresh Flow

```javascript
// Automatic token refresh
const refreshAccessToken = async () => {
  try {
    const response = await fetch('/api/users/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken
      })
    });
    
    const data = await response.json();
    setAccessToken(data.access);
  } catch (error) {
    logout(); // Force login on refresh failure
  }
};
```

## Security Features

### 1. JWT Token Security

- **Access Tokens**: 15-minute expiration
- **Refresh Tokens**: 7-day expiration
- **Token Rotation**: Refresh tokens are single-use
- **Secure Storage**: Tokens stored in localStorage (consider HttpOnly cookies for production)

### 2. Role-Based Security

- **Server-Side Validation**: All API calls validate user roles
- **Frontend Protection**: UI components hide unauthorized features
- **Route Guards**: Protected routes prevent unauthorized access

### 3. Guest Security

- **UUID-Based Codes**: Cryptographically secure guest codes
- **Event-Based Expiration**: Automatic access expiration
- **Audit Trail**: Complete logging of guest activities
- **Limited Permissions**: Granular access control for guests

### 4. Input Validation

- **Email Validation**: Proper email format checking
- **Password Requirements**: Minimum length and complexity
- **Guest Code Validation**: UUID format validation
- **SQL Injection Prevention**: Parameterized queries

### 5. Session Management

- **Automatic Logout**: Token expiration handling
- **Concurrent Sessions**: Single session per user
- **Secure Logout**: Proper token invalidation

## Implementation Examples

### AuthContext Usage

```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { 
    user, 
    guestInfo, 
    isAuthenticated, 
    isGuest, 
    role, 
    login, 
    guestLogin, 
    logout 
  } = useAuth();

  // Check user permissions
  const canManageUsers = role === 'ADMIN';
  const canViewProperties = isAuthenticated || isGuest;
  
  // Handle login
  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // Navigate to dashboard
    } catch (error) {
      // Handle login error
    }
  };
}
```

### Protected Route Implementation

```javascript
import ProtectedRoute from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/guest-login" element={<GuestLogin />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
      </Route>
      
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminPanel />} />
      </Route>
      
      <Route element={<ProtectedRoute allowGuest={true} />}>
        <Route path="/verification" element={<Verification />} />
      </Route>
    </Routes>
  );
}
```

### API Service Example

```javascript
class ApiService {
  constructor() {
    this.baseURL = 'http://127.0.0.1:8000/api';
  }

  async request(endpoint, options = {}) {
    const { accessToken, guestToken } = useAuth();
    const token = guestToken || accessToken;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (response.status === 401) {
      // Handle token refresh or logout
      throw new Error('Authentication required');
    }
    
    return response.json();
  }
}
```

## Best Practices

### 1. Security Best Practices

- Always validate permissions on both frontend and backend
- Use HTTPS in production
- Implement proper token storage (consider HttpOnly cookies)
- Regular security audits and penetration testing
- Keep dependencies updated

### 2. Code Organization

- Separate authentication logic from business logic
- Use React Context for global auth state
- Implement proper error handling
- Use TypeScript for better type safety

### 3. User Experience

- Provide clear feedback for authentication errors
- Implement proper loading states
- Handle network errors gracefully
- Provide logout functionality on all pages

## Troubleshooting

### Common Issues

1. **Token Expiration**: Users get logged out frequently
   - Solution: Implement automatic token refresh

2. **Permission Errors**: Users can't access certain features
   - Solution: Verify role assignments and route protection

3. **Guest Access Issues**: Guests can't access properties
   - Solution: Check guest access levels and property permissions

4. **QR Code Scanner**: Camera not working
   - Solution: Use qr-scanner library for better compatibility

### Debugging Tips

- Check browser console for auth errors
- Verify token storage in localStorage
- Test API endpoints with tools like Postman
- Check network requests for proper authorization headers

## Future Enhancements

1. **Multi-Factor Authentication**: Add 2FA for sensitive operations
2. **Single Sign-On (SSO)**: Integration with university SSO system
3. **Biometric Authentication**: Fingerprint/face recognition
4. **Advanced Guest Management**: QR code generation for guests
5. **Audit Logging**: Comprehensive activity tracking
6. **Session Analytics**: User behavior analysis

---

*This documentation covers the complete authentication and authorization system for PMS-HU. For specific implementation details, refer to the source code in the respective components.*
