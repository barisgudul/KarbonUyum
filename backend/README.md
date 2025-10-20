# KarbonUyum Backend

FastAPI-based emission calculation and carbon management platform for Turkish SMEs (KOBİ).

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Virtual environment (venv)

### Installation

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.template .env
# Then edit .env with your configuration
```

### Configuration

**CRITICAL: Security Setup Required**

1. **Database Setup**
   ```bash
   # Set DATABASE_URL in .env
   export DATABASE_URL="postgresql://user:password@localhost:5432/karbonuyum"
   
   # For production, enable SSL
   export DATABASE_SSL_MODE="require"
   ```

2. **Climatiq API Key** [REQUIRED]
   - Get free API key: https://www.climatiq.io/
   - Set in `.env`: `CLIMATIQ_API_KEY=your-key-here`

3. **JWT Secret** [REQUIRED]
   - Generate secure key: `openssl rand -hex 32`
   - Set in `.env`: `SECRET_KEY=your-generated-key`

4. **Security Headers** (Automatic)
   - Application adds security headers to all responses
   - Prevents: XSS, clickjacking, MIME-sniffing

### Database Migrations

```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback
alembic downgrade -1
```

### Running the Server

```bash
# Development
uvicorn main:app --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

API available at: http://localhost:8000

## Security Hardening (MVP Blocking Prerequisite)

### 1. Dependency Scanning

```bash
# Run security checks before deployment
bash scripts/security_scan.sh

# Manual scan
pip-audit --desc
safety check
```

**Status**: ✅ All checks passed (pip-audit, safety)
- No CRITICAL/HIGH vulnerabilities
- See `.security-reports/` for detailed reports

### 2. Database Security

- **SSL Enforcement**: Set `DATABASE_SSL_MODE=require` in production
- **Connection Pooling**: Active with `pool_pre_ping=True`
- **SSL Certificate**: Optional for self-signed certs (`DB_SSL_CERT_PATH`)

### 3. API Security

Headers automatically added:
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME-sniffing
- `Strict-Transport-Security` - Enforce HTTPS
- `Content-Security-Policy` - XSS protection

### 4. Input Validation

- All API endpoints use Pydantic strict validation
- Extra fields rejected (`extra="forbid"`)
- Turkish decimal handling in CSV uploads (comma to dot conversion)

### 5. Rate Limiting

- Global: 200 requests/minute
- Activity Data API: 30 requests/minute (Climatiq protection)
- CSV Upload: 10 requests/hour (batch protection)

## Architecture

### Pluggable Calculation Service

The calculation layer supports multiple providers:

```python
# Automatic provider selection
from services import get_calculation_service

service = get_calculation_service(db)  # Returns Climatiq or Fallback
result = service.calculate_for_activity(activity_data)
```

**Providers**:
- `climatiq` (default) - Production, accurate
- `fallback` (internal) - Emergency backup if API unavailable

### Directory Structure

```
backend/
├── alembic/              # Database migrations
├── services/             # Pluggable services
│   ├── __init__.py       # Factory functions
│   ├── calculation_interface.py    # Abstract interface
│   ├── climatiq_service.py         # Climatiq API provider
│   ├── calculation_service.py      # Internal fallback
│   └── benchmarking_service.py     # Benchmark calculations
├── suggestion_strategies/  # Suggestion engine strategies
├── scripts/              # Utilities (security_scan.sh, etc.)
├── main.py              # FastAPI app
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── crud.py              # Database operations
├── auth.py              # JWT authentication
├── database.py          # Database connection
└── requirements.txt     # Dependencies
```

## Testing

```bash
# Run security scans
bash scripts/security_scan.sh

# Manual checks
python -m pytest tests/ -v

# Type checking
mypy backend/
```

## Deployment

### Pre-Deployment Checklist

- [ ] `bash scripts/security_scan.sh` passes
- [ ] `alembic upgrade head` succeeds
- [ ] All [REQUIRED] environment variables set
- [ ] `DATABASE_SSL_MODE=require` (production)
- [ ] `CALCULATION_PROVIDER=climatiq` (production)
- [ ] `DEBUG=false` (production)

### Production (Railway, Heroku, etc.)

```bash
# Set environment variables
export DATABASE_URL=postgresql://...
export CLIMATIQ_API_KEY=...
export SECRET_KEY=...
export DATABASE_SSL_MODE=require

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
```

## Known Vulnerabilities & Mitigations

| Issue | Severity | Status | Mitigation |
|-------|----------|--------|------------|
| ecdsa timing attack | MEDIUM | ✅ Mitigated | Side-channel only, ECDSA verification safe |
| pip symlink escape | MEDIUM | ✅ Mitigated | Dev-time risk, not runtime impact |

See `.security-reports/` for full details.

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Admin Panel**: http://localhost:8000/admin

## Support & License

For issues or questions, refer to the project repository.

---

**Last Updated**: 2024-10-20  
**Status**: MVP Phase (Phase 1) - Security Hardening Complete ✅
