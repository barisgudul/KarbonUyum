# KarbonUyum Backend Architecture

## Overview

KarbonUyum is a modular, extensible carbon management platform built with FastAPI and PostgreSQL. The architecture emphasizes **pluggable service providers**, **security-by-default**, and **GHG Protocol compliance**.

## Core Design Principles

### 1. Pluggable Service Providers

The calculation layer abstracts the provider implementation through an interface pattern:

```
ICalculationService (Interface)
├── ClimatiqService (Production)
└── CalculationService (Fallback/Internal)
```

This allows seamless switching between providers without touching business logic.

### 2. Dependency Injection

Services are resolved through factory functions, not hardcoded imports:

```python
# ✅ Good: Flexible, testable
calc_service = get_calculation_service(db)

# ❌ Bad: Tightly coupled
calc_service = ClimatiqService()
```

### 3. Security-by-Default

- SSL database connections (production)
- Rate limiting on all critical endpoints
- Security headers on all responses
- Input validation via Pydantic
- JWT-based authentication

### 4. GHG Protocol Compliance

All emissions calculations follow GHG Protocol standards:
- **Scope 1**: Direct emissions (on-site combustion)
- **Scope 2**: Indirect emissions (purchased electricity)
- **Scope 3**: Value chain emissions (planned for Phase 5)

## System Architecture

### Data Flow: CSV Upload → Emission Calculation → Storage

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                          │
│ - CSVUploader component                                     │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ POST /facilities/{id}/upload-csv
              │ (Rate limited: 10/hour)
              │
┌─────────────▼───────────────────────────────────────────────┐
│ FastAPI Backend (main.py)                                  │
│ - CSV file validation                                       │
│ - Request authentication & rate limiting                    │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ Pass bytes to CSVProcessor
              │
┌─────────────▼───────────────────────────────────────────────┐
│ CSVProcessor (csv_handler.py)                              │
│ - UTF-8 decoding                                            │
│ - Header validation                                         │
│ - Row-by-row parsing                                        │
│ - Turkish decimal handling (comma → dot)                    │
│ - Per-row error tracking                                    │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ For each row: Call calculation_service
              │
┌─────────────▼───────────────────────────────────────────────┐
│ ICalculationService (Factory: get_calculation_service)     │
├─ Provider A: ClimatiqService                               │
│  └─ HTTP call to api.climatiq.io (production)              │
├─ Provider B: CalculationService (Fallback)                 │
│  └─ Database lookup + hardcoded factors                    │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ Returns: EmissionCalculationResult
              │ - total_co2e_kg
              │ - scope (1/2/3)
              │ - is_fallback (transparency flag)
              │ - emission_factor_used
              │
┌─────────────▼───────────────────────────────────────────────┐
│ Database (PostgreSQL)                                       │
│ INSERT ActivityData (                                        │
│   facility_id, quantity, unit, scope,                      │
│   calculated_co2e_kg, is_fallback_calculation             │
│ )                                                           │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ Return: CSVUploadResult
              │
┌─────────────▼───────────────────────────────────────────────┐
│ Frontend Dashboard                                          │
│ - Display success/failure summary                           │
│ - Show ⚠️ icon for fallback rows                            │
│ - Enable drill-down to errors                              │
└─────────────────────────────────────────────────────────────┘
```

## Calculation Service Architecture

### ICalculationService Interface

```python
class ICalculationService(ABC):
    @abstractmethod
    def calculate_for_activity(
        activity_data: ActivityDataBase
    ) -> EmissionCalculationResult:
        """Primary method: emissions calculation"""
        
    @abstractmethod
    def get_provider_name() -> str:
        """Returns: "climatiq", "internal_fallback", etc."""
        
    @abstractmethod
    def health_check() -> bool:
        """Returns provider availability status"""
```

### Provider Selection Logic

```python
# backend/services/__init__.py
def get_calculation_service(db: Session, year: int = None) -> ICalculationService:
    provider = os.getenv("CALCULATION_PROVIDER", "climatiq")
    
    if provider == "climatiq":
        return ClimatiqService(year=year)
    elif provider in ["fallback", "internal"]:
        return CalculationService(db=db, year=year)
    else:
        raise ValueError(f"Unknown provider: {provider}")
```

**Environment Variables**:
- `CALCULATION_PROVIDER=climatiq` (default, production)
- `CALCULATION_PROVIDER=fallback` (emergency, testing)

### ClimatiqService (Production Provider)

```
ClimatiqService
├── Responsibilities
│   ├── Map activity types → Climatiq API format
│   ├── Handle Turkish-specific factors (e.g., grid CO2 intensity)
│   ├── Retry logic on API failures
│   └── Cost tracking (API calls count)
│
├── Logging
│   ├── Success: "Climatiq API call successful. Result: 45.23 kg CO2e"
│   ├── Failure: "Climatiq API error (status 429). Switching to fallback"
│   └── Metrics: api_calls_count, api_failures_count
│
├── Fallback Mechanism (Built-in)
│   ├── Trigger: HTTP error, timeout, network error
│   ├── Action: Use hardcoded DEFRA 2023 factors
│   ├── Result: is_fallback=True (transparency flag)
│   └── Log: "Using fallback factor... (tahmini)"
│
└── API Calls
    - Endpoint: https://api.climatiq.io/data/v1/estimate
    - Rate Limiting: Enforced by slowapi (30/minute)
    - Timeout: 10 seconds per request
```

### CalculationService (Fallback Provider)

```
CalculationService (Internal Fallback)
├── Data Source
│   └── DatabaseEmissionFactors table (by year)
│
├── Factors (DEFRA 2023, Turkish-specific)
│   ├── Electricity: 0.475 kg CO2e/kWh
│   ├── Natural Gas: 2.016 kg CO2e/m³
│   └── Diesel Fuel: 2.687 kg CO2e/liter
│
├── Always Marks
│   └── is_fallback=True (for legal transparency)
│
└── Use Cases
    ├── Climatiq API down
    ├── Rate limit exceeded
    ├── Network error
    └── Testing/development
```

## Request Flow Example

### POST /facilities/{facility_id}/upload-csv

1. **Authentication**
   - Verify JWT token
   - Check user membership in company

2. **Authorization**
   - Verify user role (admin/owner/data_entry)
   - Verify facility ownership

3. **Rate Limiting**
   - Check: 10 CSV uploads per hour
   - Rate limiter middleware enforces

4. **File Validation**
   - Check file extension (.csv)
   - Check file size (<5MB)
   - Check encoding (UTF-8)

5. **CSV Processing**
   - CSVProcessor.process_csv_file()
   - For each row:
     a) Parse fields
     b) Validate data types
     c) Call get_calculation_service()
     d) Calculate emissions
     e) Flush to DB (not yet committed)
   - If all rows pass: commit()
   - If any row fails: rollback() (atomic transaction)

6. **Response**
   ```json
   {
     "total_rows": 100,
     "successful_rows": 98,
     "failed_rows": 2,
     "results": [
       {
         "row_number": 5,
         "activity_type": "electricity",
         "success": true,
         "error": null
       },
       {
         "row_number": 42,
         "activity_type": "unknown",
         "success": false,
         "error": "Invalid activity type"
       }
     ],
     "message": "98 rows uploaded successfully, 2 errors"
   }
   ```

## Database Schema (Relevant Tables)

```sql
-- Core Activity Data
CREATE TABLE activity_data (
    id SERIAL PRIMARY KEY,
    facility_id INT REFERENCES facilities(id),
    activity_type VARCHAR(50),  -- electricity, natural_gas, diesel_fuel
    quantity FLOAT NOT NULL,
    unit VARCHAR(20),
    start_date DATE,
    end_date DATE,
    scope VARCHAR(10),  -- scope_1, scope_2, scope_3
    calculated_co2e_kg FLOAT,
    is_fallback_calculation BOOLEAN DEFAULT FALSE,  -- ⚠️ Transparency flag
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emission Factors (for internal fallback)
CREATE TABLE emission_factors (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100),  -- e.g., "electricity_grid_TUR"
    value FLOAT,
    unit VARCHAR(20),
    year INT,
    source VARCHAR(100),  -- e.g., "DEFRA 2023"
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Architecture

### Layers

```
┌─────────────────────────────────┐
│ HTTPS / TLS (Transport)         │
├─────────────────────────────────┤
│ Security Headers Middleware     │
│ - X-Frame-Options: DENY         │
│ - Strict-Transport-Security     │
│ - Content-Security-Policy       │
├─────────────────────────────────┤
│ Authentication (JWT)            │
│ - Token validation              │
│ - Role-based access control     │
├─────────────────────────────────┤
│ Rate Limiting (slowapi)         │
│ - Global: 200 req/min           │
│ - API: 30 req/min (Climatiq)    │
│ - CSV: 10 req/hour (batch)      │
├─────────────────────────────────┤
│ Input Validation (Pydantic)     │
│ - Type checking                 │
│ - Constraint validation         │
│ - Extra fields rejected         │
├─────────────────────────────────┤
│ Database (PostgreSQL)           │
│ - SSL/TLS encryption (prod)     │
│ - Parameterized queries (ORM)   │
│ - SQL injection prevention      │
└─────────────────────────────────┘
```

## Testing Strategy

### Unit Tests (Phase 5)
- Mock `ICalculationService`
- Test factory function provider selection
- Test CSV parsing edge cases

### Integration Tests (Phase 5)
- End-to-end CSV upload flow
- Provider fallback on Climatiq errors
- Database transaction rollback on errors

### Security Tests (Phase 5)
- SQL injection in CSV payloads
- Unauthorized access attempts
- Rate limit enforcement
- Security header verification

## Extending with New Providers

To add a new calculation provider (e.g., "Emit" or "Carbon Trust"):

1. **Implement Interface**
   ```python
   class EmitService(ICalculationService):
       def calculate_for_activity(self, activity_data: ActivityDataBase) -> EmissionCalculationResult:
           # Integration with Emit API
           ...
       
       def get_provider_name(self) -> str:
           return "emit"
       
       def health_check(self) -> bool:
           # Check Emit API availability
           ...
   ```

2. **Register in Factory**
   ```python
   # backend/services/__init__.py
   if provider == "emit":
       return EmitService(year=year)
   ```

3. **Configure Environment**
   ```bash
   export CALCULATION_PROVIDER=emit
   export EMIT_API_KEY=...
   ```

4. **Test**
   - Run security scan
   - Unit test new provider
   - Integration test with CSV upload
   - Performance benchmark

## Performance Considerations

### API Latency
- Climatiq API: ~500-1000ms per request
- Internal fallback: <10ms (database lookup)
- Connection pooling: 10-20 active connections

### Scalability
- **Current**: 10 KOBİ with CSV batches = ~3,000-5,000 API calls/month
- **Future**: IoT sensors + predictive analytics = 100,000+ calls/month
- **Solution**: Caching layer (Redis) or provider migration

### Monitoring
- Track API call count and costs
- Monitor fallback usage (should be <5%)
- Alert on provider health issues

## Known Limitations & Future Work

### Current Limitations (MVP)
- No Scope 3 (supply chain) support
- No OCR invoice reading (deferred to Phase 5)
- No real-time IoT sensor integration
- No predictive analytics

### Phase 5+ Roadmap
- **Scope 3 Support**: Blockchain-based supply chain tracking
- **IoT Integration**: Automatic meter reading
- **Predictive Analytics**: "What-if" simulations
- **Carbon Credits**: Marketplace integration

## References

- [GHG Protocol Standards](https://ghgprotocol.org/)
- [Climatiq API Docs](https://docs.climatiq.io/)
- [DEFRA Conversion Factors 2023](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/deployment/concepts/)

---

**Last Updated**: 2025-10-20  
**Architecture Version**: 1.0 (MVP Phase)  
**Status**: Phase 1 Complete - Architecture Solidified ✅
