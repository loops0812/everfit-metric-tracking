# Everfit Metric Tracking API

A RESTful API for tracking health & fitness metrics (distance and temperature) with automatic unit conversion. Built with **NestJS**, **MongoDB**, and **TypeScript**.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Design Decisions](#design-decisions)
- [Trade-Offs](./TRADE_OFFS.md)
- [Project Structure](#project-structure)

---

## Features

- **Create metrics** — Record distance or temperature with any supported unit
- **List metrics** — Query by user and type with optional unit conversion and pagination
- **Chart data** — Pre-computed daily snapshots for instant chart rendering (~5ms vs ~1-2s aggregation)
- **Unit conversion** — Automatic base-value normalization; query in any unit regardless of how data was stored
- **Validation** — Request validation via class-validator with structured error responses
- **Swagger** — Interactive API docs at `/api-docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (TypeScript) |
| Framework | NestJS 11 |
| Database | MongoDB 7 (Mongoose ODM) |
| Validation | class-validator + class-transformer |
| Docs | Swagger (OpenAPI 3.0) |
| Testing | Jest + Supertest |
| Container | Docker + Docker Compose |
| Package Manager | pnpm |

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                    Controller Layer                   │
│  MetricsController (POST, GET /metrics, GET /chart)   │
├───────────────────────────────────────────────────────┤
│                     Service Layer                     │
│  MetricsService (IMetricsService)                     │
│  ├── DistanceConverter  (IUnitConverter<DistanceUnit>)│
│  └── TemperatureConverter (IUnitConverter<TempUnit>)  │
├───────────────────────────────────────────────────────┤
│                   Repository Layer                    │
│  MetricsRepository (IMetricsRepository)               │
│  └── create, findWithCount                            │
│  DailyMetricRepository (IDailyMetricRepository)       │
│  └── upsertDaily, findByRange                         │
├───────────────────────────────────────────────────────┤
│                     Data Layer                        │
│  MongoDB                                              │
│  ├── metrics   — raw entries, index {userId,type,date}│
│  └── dailymetrics — pre-computed per-day snapshots    │
└───────────────────────────────────────────────────────┘
```

**Key patterns:**
- **Interface-driven DI** — Services, repositories, and converters are injected via Symbol tokens (`IMetricsService`, `IMetricsRepository`, `IDailyMetricRepository`, `IUnitConverter<T>`)
- **Repository pattern** — All Mongoose data access is encapsulated in repositories, keeping the service focused on business logic
- **Write-time materialization** — On every metric insert, a `DailyMetric` record is upserted (latest-per-day wins), making chart reads a simple indexed `find()` instead of expensive aggregation
- **Base-value normalization** — All metrics store both original value/unit and a `baseValue` (meters / °C), enabling efficient querying and conversion
- **Strategy pattern** — Unit converters registered in a `Map<MetricType, IUnitConverter>` for extensibility

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker & Docker Compose (for MongoDB)

### 1. Clone & Install

```bash
git clone <repo-url>
cd everfit-metric-tracking
pnpm install
```

### 2. Start MongoDB

```bash
docker compose up mongo -d
```

### 3. Configure Environment

Copy `.env.example` to `.env` (or use the defaults):

```env
NODE_ENV=development
PORT=3000
APP_NAME="Everfit Metric Tracking API"
API_PREFIX=api
APP_VERSION=1.0.0

SWAGGER_ENABLED=true
SWAGGER_TITLE="Everfit Metric Tracking API"
SWAGGER_DESCRIPTION="API documentation for Everfit Metric Tracking"
SWAGGER_PREFIX=api-docs

MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=everfit-metrics
```

### 4. Run

```bash
# Development (watch mode)
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

### 5. Run with Docker

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000/api` and Swagger at `http://localhost:3000/api-docs`.

---

## API Reference

### Base URL: `/api`

### Create Metric

```
POST /api/metrics
```

**Body:**
```json
{
  "userId": "user-1",
  "type": "distance",
  "value": 100,
  "unit": "meter",
  "date": "2026-03-24T00:00:00.000Z"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | ✅ | User identifier |
| `type` | enum | ✅ | `distance` or `temperature` |
| `value` | number | ✅ | Must be ≥ 0 for distance |
| `unit` | string | ✅ | See [Supported Units](#supported-units) |
| `date` | ISO 8601 | ✅ | Date of the measurement |

### List Metrics

```
GET /api/metrics?userId=user-1&type=distance&unit=meter&page=1&limit=20
```

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `userId` | string | ✅ | — | |
| `type` | enum | ✅ | — | `distance` or `temperature` |
| `unit` | string | ❌ | original | Target unit for conversion |
| `page` | int | ❌ | 1 | Min: 1 |
| `limit` | int | ❌ | 20 | Min: 1, Max: 100 |

**Response:**
```json
{
  "data": [
    { "userId": "user-1", "type": "distance", "value": 100, "unit": "meter", "date": "2026-03-24T00:00:00.000Z" }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### Chart Data

```
GET /api/metrics/chart?userId=user-1&type=distance&period=1m&unit=meter
```

Returns the **latest metric value per day** within the specified period — optimized via pre-computed daily snapshots.

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | ✅ | |
| `type` | enum | ✅ | `distance` or `temperature` |
| `period` | string | ✅ | Format: `<n><w\|m\|y>` (e.g., `1w`, `1m`, `3m`, `1y`) |
| `unit` | string | ❌ | Target unit; defaults to base unit (meter / °C) |

**Response:**
```json
{
  "userId": "user-1",
  "type": "distance",
  "unit": "meter",
  "period": "1m",
  "from": "2026-02-24T...",
  "to": "2026-03-24T...",
  "dataPoints": [
    { "date": "2026-03-20", "value": 1500.5 },
    { "date": "2026-03-21", "value": 2300.0 }
  ]
}
```

### Supported Units

| Metric Type | Units | Base Unit |
|-------------|-------|-----------|
| `distance` | `meter`, `centimeter`, `inch`, `feet`, `yard` | meter |
| `temperature` | `C`, `F`, `K` | °C (Celsius) |

---

## Testing

```bash
# Unit tests (33 tests — converters)
pnpm test

# E2E integration tests (24 tests — full API)
pnpm test:e2e

# Test coverage
pnpm test:cov
```

**E2E tests** connect to Docker MongoDB using a separate `everfit-metrics-test` database (auto-cleaned before/after each run).

### Test Coverage

| Area | Tests | Covers |
|------|-------|--------|
| DistanceConverter | 17 | All unit conversions, edge cases, negative values, unsupported units |
| TemperatureConverter | 16 | C↔F↔K conversions, edge cases, unsupported units |
| POST /metrics | 9 | Create, validation, negative distance, invalid types/units |
| GET /metrics | 7 | Filtering, unit conversion, pagination, validation |
| GET /metrics/chart | 8 | Daily snapshots, latest-per-day, period filtering, conversion |

---

## Design Decisions

### 1. Base-Value Normalization
Every metric is stored with its original `value`/`unit` AND a computed `baseValue` (meters or °C). This enables:
- Efficient queries without runtime conversion
- Converting to any unit on read via `fromBase(baseValue, targetUnit)`
- Correct aggregation in charts (operate on `baseValue`, convert after)

### 2. Repository Pattern
All Mongoose data access is encapsulated behind interfaces (`IMetricsRepository`, `IDailyMetricRepository`). The service layer only deals with business logic — validation, conversion, mapping. This makes the service unit-testable without a database.

### 3. Interface-Driven DI with Symbol Tokens
All services, repositories, and converters implement interfaces and are injected via Symbol tokens. This enables:
- Easy mocking in tests
- Swappable implementations
- Clear contracts between layers

### 4. Generic Converter Interface
`IUnitConverter<TUnit>` with `toBase()`, `fromBase()`, `convert()` makes adding new metric types straightforward — implement the interface and register in the module.

### 5. Pre-computed Daily Metrics (Write-time Materialization)
Instead of running an expensive aggregation pipeline on every chart request, a separate `DailyMetric` collection stores the latest metric entry per (userId, type, day). On each metric create, an upsert updates the daily record only if the new entry is later ("latest wins"). This reduces chart read latency from ~1-2s to ~5-10ms at the cost of ~5ms extra per write.

### 6. Compound Indexes
- `metrics` collection: `{ userId: 1, type: 1, date: -1 }` — covers list and filter queries
- `dailymetrics` collection: `{ userId: 1, type: 1, date: 1 }` (unique) — covers chart range queries

---

## Project Structure

```
src/
├── main.ts                                    # Bootstrap, pipes, CORS, Swagger
├── app.module.ts                              # Root module
├── commons/
│   ├── dto/api-response.ts                    # ResponseEntity wrapper
│   ├── enums/                                 # MetricType, DistanceUnit, TemperatureUnit
│   └── errors/                                # Error constants + custom exceptions
├── configs/
│   ├── app/app.config.ts                      # App config (port, name, swagger)
│   ├── config.validation.ts                   # Joi env validation
│   ├── database/mongo-db/                     # MongooseModule.forRootAsync
│   └── swagger/swagger.config.ts              # Swagger setup
├── filters/
│   ├── global-exception.filter.ts             # Global exception handler
│   └── handler/                               # HttpException + Default handlers
├── interceptors/
│   └── response.interceptor.ts                # Wraps responses with requestId + timestamp
└── modules/
    ├── health/
    │   ├── health.controller.ts               # GET /health
    │   └── health.module.ts
    └── metrics/
        ├── metrics.module.ts                  # Feature module (DI wiring)
        ├── metrics.controller.ts              # POST, GET /metrics, GET /chart
        ├── services/
        │   └── metrics.service.ts             # Business logic + conversion
        ├── repositories/
        │   ├── metrics.repository.ts          # Raw metric data access
        │   └── daily-metric.repository.ts     # Pre-computed daily snapshots
        ├── schemas/
        │   ├── metric.schema.ts               # Metric schema + compound index
        │   └── daily-metric.schema.ts         # DailyMetric schema + unique index
        ├── dto/                               # CreateMetricDto, QueryMetricDto, ChartQueryDto
        ├── converters/                        # Distance/Temperature converters + interface
        └── interfaces/                        # Service, repository, daily-repo interfaces + tokens

test/
├── unit/                                      # Converter unit tests (33 tests)
└── metrics.e2e-spec.ts                        # Integration tests (24 tests)

scripts/
├── seed-metrics.ts                            # Seed 10M rows for perf testing
└── backfill-daily-metrics.ts                  # Populate dailymetrics from existing data
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
| `pnpm test:cov` | Run tests with coverage |
| `pnpm lint` | Lint with ESLint |
| `pnpm seed` | Backfill daily metrics from raw data |
