/**
 * Seed script: inserts 10M metric documents into MongoDB using bulk writes.
 *
 * Usage:  npx ts-node scripts/seed-metrics.ts
 * Or:     node --require ts-node/register scripts/seed-metrics.ts
 *
 * Env vars (defaults match .env):
 *   MONGO_URI        mongodb://localhost:27017
 *   MONGO_DB_NAME    everfit-metrics
 *   TOTAL_ROWS       10000000
 *   BATCH_SIZE       50000
 */

import { MongoClient } from 'mongodb';

// ── Config ──────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB_NAME ?? 'everfit-metrics';
const TOTAL = Number(process.env.TOTAL_ROWS ?? 10_000_000);
const BATCH = Number(process.env.BATCH_SIZE ?? 50_000);

// ── Reference data ──────────────────────────────────────────────
const DISTANCE_UNITS = ['meter', 'centimeter', 'inch', 'feet', 'yard'] as const;
const TEMP_UNITS = ['C', 'F', 'K'] as const;

// Conversion factors to base unit (meter / Celsius)
const DISTANCE_TO_BASE: Record<string, number> = {
  meter: 1,
  centimeter: 0.01,
  inch: 0.0254,
  feet: 0.3048,
  yard: 0.9144,
};

function tempToBase(value: number, unit: string): number {
  switch (unit) {
    case 'C': return value;
    case 'F': return (value - 32) * (5 / 9);
    case 'K': return value - 273.15;
    default:  return value;
  }
}

// ── Helpers ─────────────────────────────────────────────────────
const USER_IDS = Array.from({ length: 50 }, (_, i) => `user-${i + 1}`);

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(): Date {
  const start = new Date('2025-01-01').getTime();
  const end = new Date('2026-03-24').getTime();
  return new Date(start + Math.random() * (end - start));
}

function generateDoc() {
  const isDistance = Math.random() < 0.5;

  if (isDistance) {
    const unit = randomItem(DISTANCE_UNITS);
    const value = Math.round(Math.random() * 10000 * 100) / 100; // 0–10000, 2 decimals
    const date = randomDate();
    const epochDay = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
    return {
      userId: randomItem(USER_IDS),
      type: 'distance',
      value,
      unit,
      baseValue: value * DISTANCE_TO_BASE[unit],
      date,
      epochDay,
    };
  }

  const unit = randomItem(TEMP_UNITS);
  const value = Math.round((Math.random() * 100 - 20) * 100) / 100; // -20 to 80
  const date = randomDate();
  const epochDay = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return {
    userId: randomItem(USER_IDS),
    type: 'temperature',
    value,
    unit,
    baseValue: tempToBase(value, unit),
    date: date,
    epochDay,
  };
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log(`Connecting to ${MONGO_URI}/${DB_NAME} …`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db = client.db(DB_NAME);
  const collection = db.collection('metrics');

  // Drop existing data for clean seed
  const existing = await collection.countDocuments();
  if (existing > 0) {
    console.log(`Dropping ${existing.toLocaleString()} existing documents…`);
    await collection.deleteMany({});
  }

  console.log(`Inserting ${TOTAL.toLocaleString()} documents in batches of ${BATCH.toLocaleString()}…\n`);

  const totalStart = Date.now();
  let inserted = 0;

  while (inserted < TOTAL) {
    const batchSize = Math.min(BATCH, TOTAL - inserted);
    const docs = Array.from({ length: batchSize }, () => generateDoc());

    const batchStart = Date.now();
    await collection.insertMany(docs, { ordered: false });
    const batchMs = Date.now() - batchStart;

    inserted += batchSize;
    const pct = ((inserted / TOTAL) * 100).toFixed(1);
    const rate = Math.round(batchSize / (batchMs / 1000));
    console.log(
      `  ${inserted.toLocaleString()} / ${TOTAL.toLocaleString()} (${pct}%) — batch: ${batchMs}ms — ${rate.toLocaleString()} docs/s`,
    );
  }

  const totalSec = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\n✅ Done! Inserted ${TOTAL.toLocaleString()} documents in ${totalSec}s`);

  // Ensure indexes exist
  console.log('Ensuring indexes…');
  await collection.createIndex({ userId: 1, type: 1, date: -1 });
  await collection.createIndex({ userId: 1 });
  await collection.createIndex({ type: 1 });
  await collection.createIndex({ date: -1 });
  console.log('Indexes created.');

  await client.close();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
