/**
 * Backfill script: populates the `dailymetrics` collection from existing `metrics`.
 *
 * Uses the same aggregation pipeline that was previously used at runtime,
 * but runs it ONCE to seed the pre-computed daily snapshots.
 *
 * Usage:  npx ts-node scripts/backfill-daily-metrics.ts
 *
 * Env vars (defaults match .env):
 *   MONGO_URI        mongodb://localhost:27017
 *   MONGO_DB_NAME    everfit-metrics
 */

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME ?? 'everfit-metrics';

interface AggregateResult {
  _id: { userId: string; type: string; date: string };
  baseValue: number;
  value: number;
  unit: string;
  latestEntryDate: Date;
}

async function backfill() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(MONGO_DB_NAME);

  const metrics = db.collection('metrics');
  const dailyMetrics = db.collection('dailymetrics');

  console.log('Starting backfill from metrics → dailymetrics...');

  // Aggregate: for each (userId, type, day), get the latest entry
  const pipeline = [
    { $sort: { date: -1 as const } },
    {
      $group: {
        _id: {
          userId: '$userId',
          type: '$type',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        },
        baseValue: { $first: '$baseValue' },
        value: { $first: '$value' },
        unit: { $first: '$unit' },
        latestEntryDate: { $first: '$date' },
      },
    },
  ];

  const cursor = metrics.aggregate<AggregateResult>(pipeline, {
    allowDiskUse: true,
  });

  let count = 0;
  const BATCH_SIZE = 5000;
  let batch: ReturnType<typeof dailyMetrics.initializeUnorderedBulkOp> =
    dailyMetrics.initializeUnorderedBulkOp();

  for await (const doc of cursor) {
    const startOfDay = new Date(doc._id.date + 'T00:00:00.000Z');

    batch
      .find({
        userId: doc._id.userId,
        type: doc._id.type,
        date: startOfDay,
      })
      .upsert()
      .updateOne({
        $set: {
          userId: doc._id.userId,
          type: doc._id.type,
          date: startOfDay,
          baseValue: doc.baseValue,
          value: doc.value,
          unit: doc.unit,
          latestEntryDate: doc.latestEntryDate,
        },
      });

    count++;
    if (count % BATCH_SIZE === 0) {
      await batch.execute();
      batch = dailyMetrics.initializeUnorderedBulkOp();
      console.log(`  Processed ${count} daily records...`);
    }
  }

  // Flush remaining
  if (count % BATCH_SIZE !== 0) {
    await batch.execute();
  }

  console.log(`Backfill complete: ${count} daily records upserted.`);

  // Ensure index exists
  await dailyMetrics.createIndex(
    { userId: 1, type: 1, date: 1 },
    { unique: true },
  );
  console.log('Unique index on { userId, type, date } ensured.');

  await client.close();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
