# Installation Guide - Maritime Onboarding Platform

## Prerequisites

- Docker and Docker Compose (v2.0+)
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- 4GB RAM minimum
- 10GB free disk space

## Quick Start with Docker

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/maritime-onboarding.git
cd maritime-onboarding
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:

```env
# Database Configuration
DB_HOST=database
DB_PORT=5432
DB_NAME=employee_onboarding
DB_USER=postgres
DB_PASSWORD=YourSecurePassword123!

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars-long
JWT_EXPIRY=7d

# Email Configuration (optional for testing)
EMAIL_SERVICE=smtp
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# Application URLs
FRONTEND_URL=http://localhost
BACKEND_URL=http://localhost:3000

# Environment
NODE_ENV=production
```

### 3. Start the Application

```bash
# Build and start all services
docker compose up -d

# Wait for services to be ready (about 30 seconds)
docker compose ps
```

### 4. Initialize the Database

The database schema is automatically created on first run. To add demo users:

```bash
docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -c "
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES 
  ('admin@maritime.local', '\$2b\$10\$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Admin', 'User', 'admin', true),
  ('manager@maritime.local', '\$2b\$10\$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'John', 'Manager', 'manager', true),
  ('crew@maritime.local', '\$2b\$10\$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Jane', 'Crew', 'crew', true)
ON CONFLICT DO NOTHING;"
```

Default passwords for demo users: `Demo123!`

### 5. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Mailhog** (email testing): http://localhost:8025
- **PgAdmin**: http://localhost:5050
  - Email: admin@admin.com
  - Password: admin

## Production Deployment

### Security Considerations

1. **Change all default passwords** in `.env`
2. **Generate secure JWT secret**: 
   ```bash
   openssl rand -base64 32
   ```
3. **Configure SSL/TLS** for production
4. **Set up proper email service** (SendGrid, AWS SES, etc.)
5. **Enable rate limiting** and security headers
6. **Configure backup strategy** for database

### Docker Compose Production

```bash
# Use production configuration
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

Helm charts are available in the `/k8s` directory:

```bash
helm install maritime-onboarding ./k8s/helm \
  --set postgresql.auth.password=YourSecurePassword \
  --set jwt.secret=YourJWTSecret
```

## Manual Installation (Development)

### Backend Setup

```bash
# Install dependencies
npm install

# Set up database
createdb employee_onboarding
psql employee_onboarding < scripts/schema.sql

# Run migrations
npm run migrate

# Start backend
npm run start:backend
```

### Frontend Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Build frontend
npm run build

# Serve with nginx or development server
npm start
```

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | localhost | Yes |
| `DB_PORT` | Database port | 5432 | Yes |
| `DB_NAME` | Database name | employee_onboarding | Yes |
| `DB_USER` | Database user | postgres | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRY` | Token expiration | 7d | No |
| `EMAIL_SERVICE` | Email service type | smtp | No |
| `SMTP_HOST` | SMTP server host | - | No |
| `SMTP_PORT` | SMTP server port | 587 | No |
| `FRONTEND_URL` | Frontend URL | http://localhost | Yes |
| `BACKEND_URL` | Backend API URL | http://localhost:3000 | Yes |

### Database Configuration

The platform uses PostgreSQL. For production:

1. Enable SSL connections
2. Configure connection pooling
3. Set up regular backups
4. Monitor performance

### Email Configuration

Supported email services:
- SMTP (any provider)
- SendGrid
- AWS SES
- Mailgun

Example SendGrid configuration:
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-api-key
```

## Troubleshooting

### Container Issues

```bash
# Check container logs
docker compose logs frontend
docker compose logs backend

# Restart specific service
docker compose restart backend

# Rebuild containers
docker compose build --no-cache
```

### Database Connection Issues

```bash
# Test database connection
docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -c "SELECT 1"

# Check database logs
docker compose logs database
```

### Frontend Build Issues

```bash
# Clear build cache
rm -rf client/node_modules/.cache
rm -rf client/build

# Rebuild
docker compose build frontend --no-cache
```

### Common Problems

1. **Port already in use**: Change ports in `docker-compose.yml`
2. **Database not ready**: Wait 30 seconds after starting containers
3. **Email not working**: Check SMTP configuration or use Mailhog for testing
4. **Login issues**: Ensure database has users and passwords are correct

## Health Checks

Check system health:

```bash
# Backend health
curl http://localhost:3000/api/health

# Database status
docker exec employee-onboarding-database pg_isready

# Container status
docker compose ps
```

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Contributing**: See CONTRIBUTING.md

## License

MIT License - see LICENSE file for details