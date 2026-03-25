# Trade-Offs & Design Decisions

This document explains the key architectural trade-offs made in this project, what alternatives exist, and why each decision was made.

---

## 1. MongoDB vs PostgreSQL

**Chose:** MongoDB  
**Alternative:** PostgreSQL

| Factor | MongoDB | PostgreSQL |
|--------|---------|------------|
| Aggregation | Native `$group`, `$match`, `$sort` pipeline — ideal for chart endpoint | Requires `GROUP BY` + window functions |
| Schema flexibility | Easy to add new metric types without migrations | Schema migrations needed |
| Transactions | Limited (single-doc atomic only in standalone) | Full ACID transactions |
| Joins | No joins (denormalized) | Rich JOIN support |

**Why MongoDB:** The assignment's core challenge — aggregating latest-per-day values — maps perfectly to MongoDB's aggregation pipeline. The data model is document-oriented (each metric is a standalone record with no relational dependencies). For this use case, MongoDB's aggregation framework is more natural than SQL `GROUP BY` + subqueries.

**Production consideration:** If the system evolved to need cross-collection consistency (e.g., linking metrics to user profiles, billing), PostgreSQL would be the safer choice.

---

## 2. Base-Value Normalization vs On-the-Fly Conversion

**Chose:** Store `baseValue` alongside `value` + `unit`  
**Alternative:** Convert at query time only

| Factor | Base-value stored | On-the-fly only |
|--------|-------------------|-----------------|
| Storage | ~8 extra bytes per document | No overhead |
| Query performance | Aggregate/sort on `baseValue` directly | Must convert every doc before aggregation |
| Write complexity | Slightly higher (compute on insert) | Simpler insert |
| Correctness | Conversion happens once, at write time | Conversion happens on every read |

**Why base-value:** The chart endpoint aggregates across potentially thousands of documents. Converting in the aggregation pipeline would require a `$switch` stage for every unit — fragile and slow. Storing `baseValue` lets the pipeline operate on a single, consistent numeric field. The 8-byte overhead per document is negligible.

---

## 3. Offset Pagination vs Cursor-Based Pagination

**Chose:** Offset (`skip` + `limit`)  
**Alternative:** Cursor-based (`_id` > last_seen_id)

| Factor | Offset | Cursor-based |
|--------|--------|--------------|
| Implementation | Simple, familiar `?page=2&limit=20` | Requires opaque cursor encoding |
| Performance at depth | Degrades — `skip(10000)` scans 10K docs | Constant — seeks by index |
| Random page access | Yes (`?page=50`) | No (sequential only) |
| Client complexity | Low | Medium (must track cursor) |

**Why offset:** For a take-home assignment, offset pagination is the standard expectation. The compound index `{ userId, type, date }` makes `skip` efficient for typical page depths (< 100 pages). Cursor-based pagination would be the right choice if:
- Users had millions of metrics each
- Deep pagination was a common access pattern

**Migration path:** Switch to cursor-based by using `{ date: { $lt: lastSeenDate }, _id: { $lt: lastSeenId } }` as the cursor — the existing index supports this.

---

## 4. Standalone MongoDB vs Replica Set

**Chose:** Standalone (single node in Docker)  
**Alternative:** Replica set (3-node minimum)

**Why standalone:** Development simplicity. A replica set adds container orchestration complexity that's outside the scope of this assignment.

**Production requirement:** A 3-node replica set is mandatory for:
- **Transactions** — multi-document transactions require a replica set
- **High availability** — automatic failover on node failure
- **Read scaling** — secondary reads for heavy query workloads

---

## 5. No Caching Layer

**Chose:** Direct MongoDB queries, no cache  
**Alternative:** Redis cache for chart data, in-memory cache for config

| Factor | No cache | Redis cache |
|--------|----------|-------------|
| Freshness | Always up-to-date | Stale for TTL duration |
| Latency | ~5-20ms per query | ~1ms cache hit |
| Complexity | Zero | Cache invalidation logic needed |
| Infrastructure | MongoDB only | MongoDB + Redis |

**Why no cache:** For this assignment's scale, MongoDB with proper indexes handles all queries in single-digit milliseconds. The chart endpoint is the most expensive operation, but the aggregation pipeline with the compound index is efficient.

**When to add cache:**
- Chart data with `period=1y` across millions of records
- High read-to-write ratio (>> 10:1)
- Multiple users requesting the same chart simultaneously
- Cache strategy: Cache chart results with key `chart:{userId}:{type}:{period}:{unit}`, TTL 5 minutes, invalidate on new metric creation for that user+type

---

## 6. No Authentication / Authorization

**Chose:** Public API  
**Alternative:** JWT auth with user scoping

**Why no auth:** The assignment spec focuses on metric CRUD and unit conversion — auth would add complexity without demonstrating the core skills being evaluated.

**Production design:**
- JWT bearer tokens via `@nestjs/passport` + `@nestjs/jwt`
- `userId` extracted from token claims instead of request body/query
- Role-based guards for admin operations
- Rate limiting per API key (`@nestjs/throttler`)

---

## 7. NestJS Built-in Logger vs Structured Logging (Pino/Winston)

**Chose:** NestJS built-in `Logger`  
**Alternative:** `nestjs-pino` for structured JSON logging

| Factor | Built-in Logger | nestjs-pino |
|--------|----------------|-------------|
| Output format | Human-readable text | JSON (machine-parseable) |
| Performance | Synchronous (blocks event loop) | Asynchronous (worker thread) |
| Correlation | Manual `requestId` passing | Auto request context via `cls-hooked` |
| Log aggregation | Harder to parse | Direct to ELK/Datadog/CloudWatch |
| Dependencies | Zero | pino + pino-pretty + nestjs-pino |

**Why built-in:** Zero dependencies, sufficient for assignment scope. Human-readable output is easier to review.

**Production migration:** Replace with `nestjs-pino` for:
- JSON output for log aggregation (ELK, CloudWatch Logs)
- Async logging (no event loop blocking under load)
- Automatic request correlation without manual `requestId` threading

---

## 8. No Rate Limiting / Security Middleware

**Chose:** CORS only  
**Alternative:** Helmet + compression + rate limiting

**What's missing and why it matters in production:**

| Middleware | Purpose | Package |
|-----------|---------|---------|
| `helmet` | HTTP security headers (XSS, clickjacking, MIME sniffing) | `@nestjs/helmet` |
| `compression` | Gzip response bodies (30-70% size reduction) | `compression` |
| `@nestjs/throttler` | Rate limiting (e.g., 100 req/min per IP) | `@nestjs/throttler` |

**Why omitted:** These are infrastructure concerns orthogonal to the assignment's core challenge. In production, they'd be added as global middleware in `main.ts` — a 10-line change.

---

## 9. In-App Conversion vs Database-Level Conversion

**Chose:** Convert in application layer (TypeScript)  
**Alternative:** Convert using MongoDB `$switch` + `$multiply` in aggregation

| Factor | App-layer | DB-layer |
|--------|-----------|----------|
| Testability | Unit-testable converter classes | Requires integration tests |
| Extensibility | Add new unit → implement interface | Add new unit → modify pipeline |
| Performance | N conversions in JS after query | Conversion during aggregation |
| Code clarity | Clean OOP (Strategy pattern) | Complex pipeline stages |

**Why app-layer:** The converter classes are independently testable (33 unit tests), follow the Strategy pattern for extensibility, and keep the aggregation pipeline clean. The performance difference is negligible — converting 365 numbers (1 year of daily points) in JavaScript takes microseconds.

---

## 10. No Data Retention / TTL

**Chose:** Store all metrics indefinitely  
**Alternative:** TTL index to auto-expire old data

**Why no TTL:** The assignment doesn't specify retention requirements. Metrics are typically long-lived data (users want to see their historical progress).

**If needed:** Add a TTL index on `createdAt`:
```javascript
MetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year
```

Or use a scheduled job for more control (e.g., keep latest N entries per user per type).

---

## Summary Matrix

| Decision | Chose | Alternative | Reason |
|----------|-------|-------------|--------|
| Database | MongoDB | PostgreSQL | Aggregation pipeline fits perfectly |
| Storage | baseValue normalization | On-the-fly conversion | Query performance |
| Pagination | Offset | Cursor-based | Simplicity, adequate for scale |
| Deployment | Standalone MongoDB | Replica set | Development simplicity |
| Caching | None | Redis | Not needed at assignment scale |
| Auth | None | JWT | Outside assignment scope |
| Logging | Built-in Logger | nestjs-pino | Zero deps, human-readable |
| Security | CORS only | Helmet + throttler | Orthogonal to core challenge |
| Conversion | App-layer | DB-layer | Testability + extensibility |
| Retention | Indefinite | TTL index | No requirement specified |
