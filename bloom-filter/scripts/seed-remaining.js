const { Pool } = require('pg');
const redis = require('redis');
const { BloomFilter } = require('bloom-filters');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BLOOM_FILTER_FPR = parseFloat(process.env.BLOOM_FILTER_FPR || 0.01);

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'usernames',
  max: 20,
});

// Redis connection
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

async function seedRedisFromPostgres() {
  console.log('\nSeeding Redis from PostgreSQL...');

  await redisClient.connect();
  await redisClient.del('usernames'); // Clear existing set

  const BATCH_SIZE = 5000;
  let offset = 0;
  let total = 0;
  const startTime = Date.now();

  while (true) {
    const result = await pgPool.query(
      `SELECT username FROM usernames ORDER BY id LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );

    if (result.rows.length === 0) break;

    const usernames = result.rows.map(row => row.username);
    await redisClient.sAdd('usernames', usernames);

    total += result.rows.length;
    offset += BATCH_SIZE;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const rate = (total / elapsed).toFixed(0);
    process.stdout.write(`\rProgress: ${total.toLocaleString()} | ${rate} usernames/sec | Elapsed: ${elapsed}s`);

    if (result.rows.length < BATCH_SIZE) break;
  }

  const count = await redisClient.sCard('usernames');
  console.log(`\nRedis seeded: ${count.toLocaleString()} usernames\n`);

  await redisClient.disconnect();
  return count;
}

async function buildBloomFilterFromPostgres(totalCount) {
  console.log('Building Bloom Filter from PostgreSQL...');

  const filter = BloomFilter.create(totalCount, BLOOM_FILTER_FPR);
  const BATCH_SIZE = 5000;
  let offset = 0;
  let processed = 0;
  const startTime = Date.now();

  while (true) {
    const result = await pgPool.query(
      `SELECT username FROM usernames ORDER BY id LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );

    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      filter.add(row.username);
      processed++;
    }

    offset += BATCH_SIZE;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const rate = (processed / elapsed).toFixed(0);
    process.stdout.write(`\rProgress: ${processed.toLocaleString()}/${totalCount.toLocaleString()} | ${rate} usernames/sec | Elapsed: ${elapsed}s`);

    if (result.rows.length < BATCH_SIZE) break;
  }

  // Save to file
  const exported = filter.saveAsJSON();
  const filterData = {
    ...exported,
    metadata: {
      totalItems: totalCount,
      fpr: BLOOM_FILTER_FPR,
      createdAt: new Date().toISOString(),
    }
  };

  const filePath = path.join(__dirname, '..', 'bloom-filter.json');
  fs.writeFileSync(filePath, JSON.stringify(filterData));

  const sizeInMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n\nBloom Filter built and saved: ${sizeInMB} MB\n`);
}

async function main() {
  console.log(`
Bloom Filter Username Check - Complete Seeding from Postgres
Bloom filter FPR: ${(BLOOM_FILTER_FPR * 100).toFixed(2)}%
  `);

  try {
    // Get total count from PostgreSQL
    const countResult = await pgPool.query('SELECT COUNT(*) FROM usernames');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`PostgreSQL already has: ${totalCount.toLocaleString()} usernames\n`);

    // Seed Redis and Bloom Filter from PostgreSQL
    await seedRedisFromPostgres();
    await buildBloomFilterFromPostgres(totalCount);

    console.log('All data seeded successfully!\n');
    await pgPool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    await pgPool.end();
    process.exit(1);
  }
}

main();
