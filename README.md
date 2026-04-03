# Everfit Metric Tracking API

A RESTful API for tracking health & fitness metrics (distance and temperature) with automatic unit conversion, pre-computed chart data, and 10M-row performance testing.

> **Live Demo:** [https://tiles-obtain-milan-ref.trycloudflare.com/api-docs](https://tiles-obtain-milan-ref.trycloudflare.com/api-docs) (Swagger UI with interactive docs)

---

## Quick Links

| Resource | URL / Path |
|----------|-----------|
| **Swagger UI** | [https://tiles-obtain-milan-ref.trycloudflare.com/api-docs](https://tiles-obtain-milan-ref.trycloudflare.com/api-docs) |
| **API Base** | `https://tiles-obtain-milan-ref.trycloudflare.com/api` |
| **Health Check** | [https://tiles-obtain-milan-ref.trycloudflare.com/api/health](https://tiles-obtain-milan-ref.trycloudflare.com/api/health) |
| **Trade-Offs** | [TRADE_OFFS.md](./TRADE_OFFS.md) |
| **Presentation** | [PRESENTATION.md](./PRESENTATION.md) |

---

## Testing Environment

The live server is pre-seeded with **10 million metric records** for realistic performance testing.

### Seed Data Profile

| Property | Value |
|----------|-------|
| Total documents | **10,000,000** |
| Users | `user-1` through `user-50` (50 users) |
| Metric types | `distance` (50%) and `temperature` (50%) |
| Date range | `2025-01-01` to `2026-03-24` (~15 months) |
| Avg docs per user | ~200,000 |
| Avg docs per user per type | ~100,000 |

#### Distance Metrics
| Property | Value |
|----------|-------|
| Units | `meter`, `centimeter`, `inch`, `feet`, `yard` (random) |
| Value range | 0 – 10,000 (2 decimal places) |
| Base unit | meter |

#### Temperature Metrics
| Property | Value |
|----------|-------|
| Units | `C`, `F`, `K` (random) |
| Value range | -20 – 80 (2 decimal places) |
| Base unit | °C (Celsius) |

### Ready-to-Use Test Queries

You can run these directly from the [Swagger UI](https://everfit.panochess.edu.vn/api-docs) or with `curl`.

#### 1. Create a Metric

```bash
curl -X POST https://everfit.panochess.edu.vn/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "type": "distance",
    "value": 5000,
    "unit": "meter",
    "date": "2026-03-25T10:00:00.000Z"
  }'
```

#### 2. List Metrics (with unit conversion)

```bash
# List user-1's distance metrics, converted to feet, page 1
curl "https://everfit.panochess.edu.vn/api/metrics?userId=user-1&type=distance&unit=feet&page=1&limit=10"

# List user-10's temperature metrics, converted to Fahrenheit
curl "https://everfit.panochess.edu.vn/api/metrics?userId=user-10&type=temperature&unit=F&page=1&limit=10"
```

#### 3. Chart Data — Optimized (Pre-computed Daily Snapshots)

```bash
# Distance chart for user-1, last 1 month, in yards
curl "https://everfit.panochess.edu.vn/api/metrics/chart?userId=user-1&type=distance&period=1m&unit=yard"

# Temperature chart for user-5, last 1 year, in Fahrenheit
curl "https://everfit.panochess.edu.vn/api/metrics/chart?userId=user-5&type=temperature&period=1y&unit=F"
```

#### 4. Chart Data — Legacy (Runtime Aggregation) ⚠️ Slow

```bash
# Same query using the old aggregation pipeline — compare response times!
curl "https://everfit.panochess.edu.vn/api/metrics/chart/legacy?userId=user-1&type=distance&period=1m&unit=yard"
```

### Performance Comparison

| Endpoint | Method | Latency | How it works |
|----------|--------|---------|--------------|
| `GET /metrics/chart` | Pre-computed | **~5-10ms** | Reads from `dailymetrics` collection (indexed `find`) |
| `GET /metrics/chart/legacy` | Aggregation | **~1-3s** | Scans 100K+ docs with `$match → $sort → $group → $sort` pipeline |

> 💡 **Try it yourself:** Call both `/chart` and `/chart/legacy` with the same parameters and compare the response times. The optimized endpoint is **~100-200x faster**.

---

## API Reference

### Base URL: `https://everfit.panochess.edu.vn/api`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/metrics` | Create a new metric entry |
| `GET` | `/metrics` | List metrics with filtering, pagination, and unit conversion |
| `GET` | `/metrics/chart` | Chart data (optimized, pre-computed daily snapshots) |
| `GET` | `/metrics/chart/legacy` | Chart data (legacy runtime aggregation, for comparison) |
| `GET` | `/health` | Health check |

### POST /metrics — Create Metric

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `userId` | string | ✅ | Non-empty |
| `type` | enum | ✅ | `distance` or `temperature` |
| `value` | number | ✅ | ≥ 0 for distance, any number for temperature |
| `unit` | string | ✅ | See [Supported Units](#supported-units) |
| `date` | ISO 8601 | ✅ | Valid date string |

**Response:** The created metric object with computed `baseValue`.

### GET /metrics — List Metrics

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `userId` | string | ✅ | — | e.g., `user-1` |
| `type` | enum | ✅ | — | `distance` or `temperature` |
| `unit` | string | ❌ | original | Target unit for conversion |
| `page` | int | ❌ | 1 | Min: 1 |
| `limit` | int | ❌ | 20 | 1–100 |

**Response:**
```json
{
  "data": [
    { "userId": "user-1", "type": "distance", "value": 16404.2, "unit": "feet", "date": "2026-03-24T12:00:00.000Z" }
  ],
  "total": 99847,
  "page": 1,
  "limit": 20,
  "totalPages": 4993
}
```

### GET /metrics/chart — Chart Data (Optimized)

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | ✅ | e.g., `user-1` |
| `type` | enum | ✅ | `distance` or `temperature` |
| `period` | string | ✅ | `<n><w\|m\|y>` — e.g., `1w`, `1m`, `3m`, `1y` |
| `unit` | string | ❌ | Target unit; defaults to base unit |

**Response:**
```json
{
  "userId": "user-1",
  "type": "distance",
  "unit": "yard",
  "period": "1m",
  "from": "2026-02-25T00:00:00.000Z",
  "to": "2026-03-25T00:00:00.000Z",
  "dataPoints": [
    { "date": "2026-02-25", "value": 8745.63 },
    { "date": "2026-02-26", "value": 3201.44 }
  ]
}
```

### GET /metrics/chart/legacy — Chart Data (Legacy)

Same parameters as `/metrics/chart`. Uses runtime `$group` aggregation instead of pre-computed snapshots. Included for **performance comparison only**.

### Supported Units

| Metric Type | Units | Base Unit |
|-------------|-------|-----------|
| `distance` | `meter`, `centimeter`, `inch`, `feet`, `yard` | meter |
| `temperature` | `C`, `F`, `K` | °C (Celsius) |

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                    Controller Layer                    │
│  MetricsController (POST, GET /metrics, GET /chart)   │
├───────────────────────────────────────────────────────┤
│                     Service Layer                     │
│  MetricsService (IMetricsService)                     │
│  ├── DistanceConverter  (IUnitConverter<DistanceUnit>) │
│  └── TemperatureConverter (IUnitConverter<TempUnit>)  │
├───────────────────────────────────────────────────────┤
│                   Repository Layer                    │
│  MetricsRepository (IMetricsRepository)               │
│  DailyMetricRepository (IDailyMetricRepository)       │
├───────────────────────────────────────────────────────┤
│                     Data Layer                        │
│  MongoDB                                              │
│  ├── metrics       — raw entries (10M docs)           │
│  └── dailymetrics  — pre-computed per-day snapshots   │
└───────────────────────────────────────────────────────┘
```

### Key Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **Interface-driven DI** | All layers | Inject via Symbol tokens for testability and swappability |
| **Repository pattern** | Data access | Isolates Mongoose from business logic |
| **Write-time materialization** | `DailyMetric` | Trades ~5ms extra per write for ~100x faster chart reads |
| **Base-value normalization** | `Metric.baseValue` | Store in base units, convert on read — efficient aggregation |
| **Strategy pattern** | Unit converters | `Map<MetricType, IUnitConverter>` for extensibility |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ (TypeScript) |
| Framework | NestJS 11 |
| Database | MongoDB 7 (Mongoose ODM) |
| Validation | class-validator + class-transformer |
| Docs | Swagger (OpenAPI 3.0) |
| Testing | Jest + Supertest |
| Container | Docker + Docker Compose |
| Package Manager | pnpm |

---

## Running Locally

### Prerequisites

- Node.js 20+, pnpm 10+, Docker

### Setup

```bash
git clone <repo-url>
cd everfit-metric-tracking
pnpm install
cp .env.example .env        # edit MONGO_URI if needed
docker compose up mongo -d   # start MongoDB
pnpm start:dev               # http://localhost:3000/api-docs
```

### Docker (full stack)

```bash
docker compose up --build    # API at :3000, Swagger at :3000/api-docs
```

### Seed 10M Rows (for performance testing)

```bash
npx ts-node scripts/seed-metrics.ts
# Then backfill the pre-computed daily snapshots:
npx ts-node scripts/backfill-daily-metrics.ts
```

---

## Testing

```bash
pnpm test          # 33 unit tests (converters)
pnpm test:e2e      # 24 integration tests (full API lifecycle)
pnpm test:cov      # coverage report
```

### Test Coverage

| Suite | Tests | Covers |
|-------|-------|--------|
| DistanceConverter | 17 | All 5 units, edge cases, negatives, unsupported units |
| TemperatureConverter | 16 | C↔F↔K, absolute zero, edge cases, unsupported units |
| POST /metrics | 9 | Create, validation, negative distance, invalid type/unit |
| GET /metrics | 7 | Filtering, unit conversion, pagination, validation |
| GET /metrics/chart | 8 | Daily snapshots, latest-per-day logic, period filtering, conversion |

E2E tests use a separate `everfit-metrics-test` database, auto-cleaned before/after each run.

---

## Project Structure

```
src/
├── main.ts                                 # Bootstrap, pipes, CORS, Swagger
├── app.module.ts                           # Root module
├── commons/
│   ├── dto/api-response.ts                 # ResponseEntity wrapper
│   ├── enums/                              # MetricType, DistanceUnit, TemperatureUnit
│   └── errors/                             # Error constants + custom exceptions
├── configs/
│   ├── app/app.config.ts                   # App config (port, name, swagger)
│   ├── config.validation.ts                # Joi env validation
│   ├── database/mongo-db/                  # MongooseModule.forRootAsync
│   └── swagger/swagger.config.ts           # Swagger setup
├── filters/
│   ├── global-exception.filter.ts          # Global exception handler
│   └── handler/                            # HttpException + Default handlers
├── interceptors/
│   └── response.interceptor.ts             # Wraps responses with requestId + timestamp
└── modules/
    ├── health/health.controller.ts         # GET /health
    └── metrics/
        ├── metrics.module.ts               # Feature module (DI wiring)
        ├── metrics.controller.ts           # POST, GET /metrics, GET /chart, GET /chart/legacy
        ├── services/metrics.service.ts     # Business logic + conversion
        ├── repositories/
        │   ├── metrics.repository.ts       # Raw metric CRUD
        │   └── daily-metric.repository.ts  # Pre-computed daily snapshots
        ├── schemas/
        │   ├── metric.schema.ts            # Metric schema + compound index
        │   └── daily-metric.schema.ts      # DailyMetric schema + unique index
        ├── dto/                            # CreateMetricDto, QueryMetricDto, ChartQueryDto
        ├── converters/                     # Distance/Temperature converters
        └── interfaces/                     # Service, repo interfaces + DI tokens

scripts/
├── seed-metrics.ts                         # Generate 10M test documents
└── backfill-daily-metrics.ts               # Populate dailymetrics from existing data

test/
├── unit/                                   # Converter unit tests (33 tests)
└── metrics.e2e-spec.ts                     # Integration tests (24 tests)
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Start in watch mode |
| `pnpm build` | Compile TypeScript |
| `pnpm start:prod` | Run compiled output |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run integration tests |
| `pnpm test:cov` | Coverage report |
| `pnpm lint` | ESLint check |
| `pnpm seed` | Backfill daily metrics |

---

## Design Decisions

See [TRADE_OFFS.md](./TRADE_OFFS.md) for detailed analysis of 11 architectural trade-offs including:

1. MongoDB vs PostgreSQL
2. Base-value normalization vs on-the-fly conversion
3. Offset vs cursor-based pagination
4. Pre-computed daily metrics vs runtime aggregation (~100-200x speedup)
5. No caching, no auth, no rate limiting — and why

---

## CI/CD

GitHub Actions pipeline on `staging` branch:

1. **CI** (ubuntu-latest): `pnpm install → lint → build → test → test:e2e`
2. **Deploy** (self-hosted): `docker compose build → docker compose up -d`
