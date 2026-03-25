import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MetricsModule } from 'src/metrics/metrics.module';

const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI ??
  'mongodb://localhost:27017/everfit-metrics-test';

describe('Metrics API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(TEST_MONGO_URI), MetricsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    // Clean the test database before running tests
    await connection.dropDatabase();
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  // ── POST /metrics ─────────────────────────────────────────────

  describe('POST /metrics', () => {
    it('should create a distance metric', async () => {
      const dto = {
        userId: 'user-1',
        type: 'distance',
        value: 100,
        unit: 'meter',
        date: '2026-03-20T00:00:00.000Z',
      };

      const res = await supertest(app.getHttpServer())
        .post('/metrics')
        .send(dto)
        .expect(201);

      expect(res.body).toMatchObject({
        userId: 'user-1',
        type: 'distance',
        value: 100,
        unit: 'meter',
        baseValue: 100,
      });
      expect(res.body._id).toBeDefined();
    });

    it('should create a temperature metric', async () => {
      const dto = {
        userId: 'user-1',
        type: 'temperature',
        value: 98.6,
        unit: 'F',
        date: '2026-03-20T00:00:00.000Z',
      };

      const res = await supertest(app.getHttpServer())
        .post('/metrics')
        .send(dto)
        .expect(201);

      expect(res.body.type).toBe('temperature');
      expect(res.body.unit).toBe('F');
      // 98.6°F = 37°C
      expect(res.body.baseValue).toBeCloseTo(37, 1);
    });

    it('should convert distance to base unit (meters)', async () => {
      const dto = {
        userId: 'user-1',
        type: 'distance',
        value: 1000,
        unit: 'centimeter',
        date: '2026-03-21T00:00:00.000Z',
      };

      const res = await supertest(app.getHttpServer())
        .post('/metrics')
        .send(dto)
        .expect(201);

      // 1000 cm = 10 meters
      expect(res.body.baseValue).toBeCloseTo(10, 5);
    });

    it('should reject missing required fields', async () => {
      await supertest(app.getHttpServer())
        .post('/metrics')
        .send({})
        .expect(400);
    });

    it('should reject invalid metric type', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/metrics')
        .send({
          userId: 'user-1',
          type: 'invalid',
          value: 100,
          unit: 'meter',
          date: '2026-03-20T00:00:00.000Z',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject negative distance value', async () => {
      await supertest(app.getHttpServer())
        .post('/metrics')
        .send({
          userId: 'user-1',
          type: 'distance',
          value: -5,
          unit: 'meter',
          date: '2026-03-20T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should allow negative temperature value', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/metrics')
        .send({
          userId: 'user-1',
          type: 'temperature',
          value: -10,
          unit: 'C',
          date: '2026-03-20T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.value).toBe(-10);
      expect(res.body.baseValue).toBe(-10);
    });

    it('should reject invalid unit for metric type', async () => {
      await supertest(app.getHttpServer())
        .post('/metrics')
        .send({
          userId: 'user-1',
          type: 'distance',
          value: 100,
          unit: 'F',
          date: '2026-03-20T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should reject unknown properties (forbidNonWhitelisted)', async () => {
      await supertest(app.getHttpServer())
        .post('/metrics')
        .send({
          userId: 'user-1',
          type: 'distance',
          value: 100,
          unit: 'meter',
          date: '2026-03-20T00:00:00.000Z',
          unknown: 'field',
        })
        .expect(400);
    });
  });

  // ── GET /metrics ──────────────────────────────────────────────

  describe('GET /metrics', () => {
    beforeAll(async () => {
      // Seed data for list tests
      const entries = [
        {
          userId: 'user-list',
          type: 'distance',
          value: 100,
          unit: 'meter',
          date: '2026-03-01T00:00:00.000Z',
        },
        {
          userId: 'user-list',
          type: 'distance',
          value: 200,
          unit: 'meter',
          date: '2026-03-02T00:00:00.000Z',
        },
        {
          userId: 'user-list',
          type: 'distance',
          value: 500,
          unit: 'centimeter',
          date: '2026-03-03T00:00:00.000Z',
        },
        {
          userId: 'user-list',
          type: 'temperature',
          value: 36.6,
          unit: 'C',
          date: '2026-03-01T00:00:00.000Z',
        },
        {
          userId: 'other-user',
          type: 'distance',
          value: 50,
          unit: 'meter',
          date: '2026-03-01T00:00:00.000Z',
        },
      ];

      for (const entry of entries) {
        await supertest(app.getHttpServer()).post('/metrics').send(entry);
      }
    });

    it('should list metrics filtered by userId and type', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'distance' })
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(1);
      // Should be sorted by date descending
      expect(new Date(res.body.data[0].date).getTime()).toBeGreaterThanOrEqual(
        new Date(res.body.data[1].date).getTime(),
      );
    });

    it('should not return metrics from other users', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'distance' })
        .expect(200);

      const userIds = res.body.data.map((m: { userId: string }) => m.userId);
      expect(userIds.every((id: string) => id === 'user-list')).toBe(true);
    });

    it('should not return metrics of different type', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'temperature' })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('temperature');
    });

    it('should convert values to the requested unit', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'distance', unit: 'centimeter' })
        .expect(200);

      // All results should be in centimeters
      for (const metric of res.body.data) {
        expect(metric.unit).toBe('centimeter');
      }
      // 100 meters = 10000 centimeters
      const meters100 = res.body.data.find(
        (m: { value: number }) => Math.abs(m.value - 10000) < 1,
      );
      expect(meters100).toBeDefined();
    });

    it('should paginate results', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'distance', page: 1, limit: 2 })
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.totalPages).toBe(2);

      const page2 = await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'distance', page: 2, limit: 2 })
        .expect(200);

      expect(page2.body.data).toHaveLength(1);
      expect(page2.body.page).toBe(2);
    });

    it('should reject missing required query params', async () => {
      await supertest(app.getHttpServer())
        .get('/metrics')
        .query({})
        .expect(400);
    });

    it('should reject invalid unit for the metric type', async () => {
      await supertest(app.getHttpServer())
        .get('/metrics')
        .query({ userId: 'user-list', type: 'distance', unit: 'F' })
        .expect(400);
    });
  });

  // ── GET /metrics/chart ────────────────────────────────────────

  describe('GET /metrics/chart', () => {
    beforeAll(async () => {
      // Seed chart data: multiple entries per day for user-chart
      const entries = [
        {
          userId: 'user-chart',
          type: 'distance',
          value: 100,
          unit: 'meter',
          date: '2026-03-20T08:00:00.000Z',
        },
        {
          userId: 'user-chart',
          type: 'distance',
          value: 200,
          unit: 'meter',
          date: '2026-03-20T16:00:00.000Z',
        },
        {
          userId: 'user-chart',
          type: 'distance',
          value: 300,
          unit: 'meter',
          date: '2026-03-21T10:00:00.000Z',
        },
        {
          userId: 'user-chart',
          type: 'distance',
          value: 150,
          unit: 'meter',
          date: '2026-03-22T12:00:00.000Z',
        },
        {
          userId: 'user-chart',
          type: 'temperature',
          value: 37,
          unit: 'C',
          date: '2026-03-20T08:00:00.000Z',
        },
      ];

      for (const entry of entries) {
        await supertest(app.getHttpServer()).post('/metrics').send(entry);
      }
    });

    it('should return chart data with one point per day', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({ userId: 'user-chart', type: 'distance', period: '1m' })
        .expect(200);

      expect(res.body.userId).toBe('user-chart');
      expect(res.body.type).toBe('distance');
      expect(res.body.period).toBe('1m');
      expect(res.body.from).toBeDefined();
      expect(res.body.to).toBeDefined();
      expect(res.body.dataPoints).toBeDefined();
      expect(Array.isArray(res.body.dataPoints)).toBe(true);

      // Should have 3 distinct days
      expect(res.body.dataPoints.length).toBe(3);

      // Dates should be sorted ascending
      const dates = res.body.dataPoints.map((dp: { date: string }) => dp.date);
      expect(dates).toEqual([...dates].sort());
    });

    it('should pick the latest entry per day', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({ userId: 'user-chart', type: 'distance', period: '1m' })
        .expect(200);

      // On 2026-03-20 there are entries at 08:00 (100m) and 16:00 (200m)
      // Latest is 200m = 200 baseValue
      const march20 = res.body.dataPoints.find(
        (dp: { date: string }) => dp.date === '2026-03-20',
      );
      expect(march20).toBeDefined();
      expect(march20.value).toBeCloseTo(200, 1);
    });

    it('should convert chart values to requested unit', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({
          userId: 'user-chart',
          type: 'distance',
          period: '1m',
          unit: 'centimeter',
        })
        .expect(200);

      expect(res.body.unit).toBe('centimeter');

      // 200m = 20000cm for March 20 (latest entry)
      const march20 = res.body.dataPoints.find(
        (dp: { date: string }) => dp.date === '2026-03-20',
      );
      expect(march20.value).toBeCloseTo(20000, 1);
    });

    it('should filter by type correctly', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({ userId: 'user-chart', type: 'temperature', period: '1m' })
        .expect(200);

      expect(res.body.type).toBe('temperature');
      expect(res.body.dataPoints.length).toBe(1);
      expect(res.body.dataPoints[0].value).toBeCloseTo(37, 1);
    });

    it('should return empty dataPoints when no data in period', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({ userId: 'user-nonexistent', type: 'distance', period: '1w' })
        .expect(200);

      expect(res.body.dataPoints).toHaveLength(0);
    });

    it('should reject invalid period format', async () => {
      await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({ userId: 'user-chart', type: 'distance', period: 'invalid' })
        .expect(400);
    });

    it('should reject missing required params', async () => {
      await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({ userId: 'user-chart' })
        .expect(400);
    });

    it('should reject invalid unit for chart', async () => {
      await supertest(app.getHttpServer())
        .get('/metrics/chart')
        .query({
          userId: 'user-chart',
          type: 'distance',
          period: '1m',
          unit: 'K',
        })
        .expect(400);
    });
  });
});
