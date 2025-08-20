# Technical Overview

## System Architecture

The Maritime Onboarding System is a containerized microservices application designed for maritime crew management and onboarding.

## Technology Stack

### Frontend
- **React 18** - User interface
- **Material-UI** - Component library
- **React Query** - Data fetching and caching
- **PDF.js** - PDF viewing and editing

### Backend
- **Node.js 20** - Runtime environment
- **Express.js** - Web framework
- **JWT** - Authentication
- **Multer** - File uploads

### Database & Storage
- **PostgreSQL 15** - Primary database
- **Redis 7** - Session cache and queuing
- **MinIO** - S3-compatible object storage

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy and static files
- **Docker Compose** - Orchestration

## Container Architecture

```
┌─────────────────┐     ┌─────────────────┐
│     Nginx       │────▶│    Frontend     │
│   (Port 80)     │     │   (React App)   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Backend      │────▶│   PostgreSQL    │
│   (Port 3000)   │     │   (Database)    │
└────────┬────────┘     └─────────────────┘
         │
         ├──────────────▶ Redis (Cache)
         │
         └──────────────▶ MinIO (Storage)
```

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Manager, Crew)
- Session management with Redis
- Password hashing with bcrypt

### Data Protection
- HTTPS/TLS encryption
- Environment variable separation
- SQL injection prevention
- XSS protection headers
- CORS configuration

### Compliance
- GDPR data privacy controls
- Audit logging
- Data retention policies
- Right to erasure support

## API Structure

### RESTful Endpoints
- `/api/auth/*` - Authentication
- `/api/admin/*` - Admin operations
- `/api/manager/*` - Manager functions
- `/api/crew/*` - Crew member access
- `/api/health` - Health checks

### Data Flow
1. Client request → Nginx
2. Nginx → Backend API
3. Backend → Database/Cache/Storage
4. Response → Client

## Database Schema

### Core Tables
- `users` - User accounts and profiles
- `onboarding_workflows` - Workflow definitions
- `onboarding_items` - Checklist items
- `documents` - Document metadata
- `audit_logs` - System audit trail

### Relationships
- Users ↔ Roles (many-to-many)
- Workflows ↔ Items (one-to-many)
- Users ↔ Documents (one-to-many)

## File Storage

### MinIO Configuration
- Buckets: `documents`, `templates`, `backups`
- Access: S3-compatible API
- Replication: Configurable
- Retention: Policy-based

## Monitoring & Logging

### Health Checks
- Container health endpoints
- Database connectivity
- Storage availability
- Memory and CPU usage

### Logging
- Centralized logging with Docker
- Error tracking
- Performance metrics
- Audit trails

## Backup Strategy

### Automated Backups
- Daily database backups at 02:00
- 30-day retention
- Compressed SQL dumps
- MinIO bucket replication

### Recovery
- Point-in-time recovery
- Automated restore scripts
- Backup verification

## Performance Optimization

### Caching
- Redis for session data
- Query result caching
- Static asset caching in Nginx

### Database
- Connection pooling
- Indexed queries
- Query optimization

### Frontend
- Code splitting
- Lazy loading
- Asset compression

## Scalability

### Horizontal Scaling
- Stateless backend services
- Load balancer ready
- Database read replicas
- Distributed caching

### Vertical Scaling
- Container resource limits
- Memory allocation
- CPU allocation

## Development Workflow

### Local Development
```bash
docker compose up -d
npm run dev
```

### Testing
```bash
npm test
npm run test:e2e
```

### Deployment
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Required Variables
- Database credentials
- JWT secrets
- Storage credentials
- Redis password

### Optional Variables
- Email configuration
- External API keys
- Feature flags

## Maintenance

### Updates
```bash
git pull
docker compose build
docker compose up -d
```

### Database Migrations
```bash
docker compose exec backend npm run migrate
```

### Logs
```bash
docker compose logs -f [service]
```