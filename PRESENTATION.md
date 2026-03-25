---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-family: 'Segoe UI', Arial, sans-serif; }
  h1 { color: #1a1a2e; }
  h2 { color: #16213e; }
  table { font-size: 0.85em; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
  pre { font-size: 0.75em; }
---

# Everfit Metric Tracking API

**Take-home Assignment — Backend Engineer**

A RESTful API for tracking health & fitness metrics
with automatic unit conversion and chart visualization.

**Tech:** NestJS · MongoDB · TypeScript · Docker

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js + TypeScript |
| **Framework** | NestJS 11 |
| **Database** | MongoDB 7 (Mongoose) |
| **Validation** | class-validator + class-transformer |
| **API Docs** | Swagger (OpenAPI 3.0) |
| **Testing** | Jest + Supertest (57 tests) |
| **Container** | Docker + Docker Compose |
| **Package Manager** | pnpm |

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│              Controller Layer                   │
│  MetricsController — POST, GET, GET /chart      │
├─────────────────────────────────────────────────┤
│              Service Layer                      │
│  MetricsService + DistanceConverter             │
│                 + TemperatureConverter          │
├─────────────────────────────────────────────────┤
│             Repository Layer                    │
│  MetricsRepository     DailyMetricRepository    │
│  (raw CRUD)            (pre-computed snapshots) │
├─────────────────────────────────────────────────┤
│              Data Layer — MongoDB               │
│  metrics collection    dailymetrics collection  │
└─────────────────────────────────────────────────┘
```

**4 layers** · Interface-driven DI · Symbol tokens

---

## API Endpoints

### 3 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/metrics` | Record a metric entry |
| `GET` | `/api/metrics` | List metrics (paginated, with unit conversion) |
| `GET` | `/api/metrics/chart` | Chart data — latest value per day |

### Supported Metrics

| Type | Units | Base Unit |
|------|-------|-----------|
| `distance` | meter, centimeter, inch, feet, yard | meter |
| `temperature` | C, F, K | °C |

---

## Key Implementation: Unit Conversion

### Base-Value Normalization

Every metric stored with **both** original value AND base value:

```json
{
  "userId": "user-1",
  "type": "distance",
  "value": 1000,        ← original (centimeters)
  "unit": "centimeter",
  "baseValue": 10,      ← normalized (meters)
  "date": "2026-03-20T..."
}
```

**Why?** Aggregate/sort on `baseValue` directly. Convert to any unit on read.

**Strategy Pattern:** `IUnitConverter<T>` → `DistanceConverter`, `TemperatureConverter`

---

## Key Implementation: Repository Pattern

```
Controller → Service → Repository → MongoDB
               ↓
         IMetricsRepository (Symbol token)
         IDailyMetricRepository (Symbol token)
```

- All Mongoose queries encapsulated behind interfaces
- Service layer only does business logic (validation, conversion)
- Easy to mock in tests — no database dependency in unit tests
- Swappable implementations (e.g., switch to PostgreSQL)

---

## Performance Optimization

### Problem
Chart endpoint scanned **~100K docs** per request via `$group` aggregation.
With 10M documents: **~1-2 seconds** per chart request.

### Solution: Write-time Materialized Views

| | Before (Aggregation) | After (DailyMetric) |
|---|---|---|
| **Chart read** | ~1-2s | **~5-10ms** |
| **Write** | ~5ms | ~10ms |
| **How** | `$match→$sort→$group→$sort` | Simple `find()` |

On every metric create → upsert `DailyMetric` (latest-per-day wins)
Chart reads → indexed `find()` on pre-computed collection

**~100-200x faster reads** for ~5ms extra per write

---

## Live Demo

### Demo Flow (Swagger UI)

1. **Create metrics** — POST distance + temperature entries
2. **List metrics** — GET with unit conversion (meters → centimeters)
3. **Chart data** — GET chart (fast path, ~5ms)
4. **Legacy comparison** — GET `/chart/legacy` (slow path, ~1-2s)

### Performance Comparison
```bash
# Fast (pre-computed)
GET /api/metrics/chart?userId=user-1&type=distance&period=1y

# Slow (runtime aggregation)
GET /api/metrics/chart/legacy?userId=user-1&type=distance&period=1y
```

---

## Testing Strategy

### 57 Tests Total

| Category | Tests | Framework |
|----------|-------|-----------|
| DistanceConverter | 17 | Jest |
| TemperatureConverter | 16 | Jest |
| POST /metrics | 9 | Supertest |
| GET /metrics | 7 | Supertest |
| GET /metrics/chart | 8 | Supertest |

- **Unit tests:** All converter logic (edge cases, negative values, unsupported units)
- **E2E tests:** Full API lifecycle with real MongoDB (separate test database)
- **CI/CD:** GitHub Actions — lint → build → test → e2e → deploy

---

## Key Trade-Offs

| Decision | Chose | Why |
|----------|-------|-----|
| **MongoDB** over PostgreSQL | Aggregation pipeline fits metric data perfectly |
| **Base-value storage** over on-the-fly conversion | Query performance, single aggregation field |
| **Offset pagination** over cursor-based | Simpler API, adequate for typical usage |
| **Pre-computed daily metrics** over runtime aggregation | 100-200x faster chart reads |
| **No auth** | Outside assignment scope (would use JWT + Passport) |
| **No caching** | MongoDB with indexes is fast enough for this scale |
| **Built-in Logger** over Pino | Zero dependencies, sufficient for assignment |

---

## Assumptions Made

1. **Single user creates metrics** — no concurrent writes for same user/day (upsert handles race conditions safely)
2. **UTC dates** — all dates normalized to UTC; no timezone handling needed
3. **Two metric types only** — distance + temperature (extensible via converter interface)
4. **No authentication** — userId passed in request body/query (production: extract from JWT)
5. **Data retention** — all metrics stored indefinitely (no TTL requirement specified)

---

## Production Roadmap

If this were going to production, I'd add:

- 🔐 **JWT Authentication** — `@nestjs/passport` + `@nestjs/jwt`
- 📊 **Redis Caching** — cache chart results (TTL 5min)
- 📝 **Structured Logging** — `nestjs-pino` for JSON output → ELK/CloudWatch
- 🛡️ **Security** — Helmet, rate limiting (`@nestjs/throttler`), compression
- 🔄 **Replica Set** — 3-node MongoDB for HA + transactions
- 📈 **Monitoring** — Health checks, Prometheus metrics, alerting
- 🧪 **Load Testing** — k6 or Artillery for performance benchmarks

---

## Thank You

### Links

- 📦 **Repository:** [GitHub]
- 📖 **API Docs:** `http://localhost:3000/api-docs`
- 📋 **Trade-Offs:** `TRADE_OFFS.md`

### Questions?
