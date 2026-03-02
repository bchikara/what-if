const { Pool } = require('pg');
const redis = require('redis');
const { BloomFilter } = require('bloom-filters');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOTAL_USERNAMES = parseInt(process.env.TOTAL_USERNAMES || 10000000);
const BATCH_SIZE = 10000;
const BLOOM_FILTER_SIZE = parseInt(process.env.BLOOM_FILTER_SIZE || 10000000);
const BLOOM_FILTER_FPR = parseFloat(process.env.BLOOM_FILTER_FPR || 0.01);

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'usernames',
  max: 20,
});

// Redis connection
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Generate realistic username
function generateUsername(index) {
  const prefixes = ['user', 'dev', 'admin', 'test', 'demo', 'cool', 'super', 'pro', 'elite', 'master'];
  const suffixes = ['_gaming', '_dev', '_official', '_real', '_pro', '_2024', '_og', '_x', ''];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix}${index}${suffix}`;
}

// Progress bar
function showProgress(current, total, startTime) {
  const percentage = ((current / total) * 100).toFixed(2);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const rate = (current / elapsed).toFixed(0);
  process.stdout.write(`\rProgress: ${current.toLocaleString()}/${total.toLocaleString()} (${percentage}%) | ${rate} usernames/sec | Elapsed: ${elapsed}s`);
}

async function seedPostgreSQL() {
  console.log('\nSeeding PostgreSQL...');

  // Create table
  await pgPool.query(`
    DROP TABLE IF EXISTS usernames;
    CREATE TABLE usernames (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_username ON usernames(username);
  `);

  const startTime = Date.now();
  let inserted = 0;

  for (let batch = 0; batch < TOTAL_USERNAMES / BATCH_SIZE; batch++) {
    const values = [];
    const placeholders = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const username = generateUsername(batch * BATCH_SIZE + i);
      values.push(username);
      placeholders.push(`($${i + 1})`);
    }

    const query = `INSERT INTO usernames (username) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`;
    await pgPool.query(query, values);

    inserted += BATCH_SIZE;
    showProgress(inserted, TOTAL_USERNAMES, startTime);
  }

  const count = await pgPool.query('SELECT COUNT(*) FROM usernames');
  console.log(`\nPostgreSQL seeded: ${count.rows[0].count} usernames\n`);
}

async function seedRedis() {
  console.log('Seeding Redis...');

  await redisClient.connect();
  await redisClient.del('usernames'); // Clear existing set

  const startTime = Date.now();
  let inserted = 0;

  for (let batch = 0; batch < TOTAL_USERNAMES / BATCH_SIZE; batch++) {
    const usernames = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const username = generateUsername(batch * BATCH_SIZE + i);
      usernames.push(username);
    }

    await redisClient.sAdd('usernames', usernames);

    inserted += BATCH_SIZE;
    showProgress(inserted, TOTAL_USERNAMES, startTime);
  }

  const count = await redisClient.sCard('usernames');
  console.log(`\nRedis seeded: ${count} usernames\n`);

  await redisClient.disconnect();
}

async function buildBloomFilter() {
  console.log('Building Bloom Filter...');

  const filter = BloomFilter.create(BLOOM_FILTER_SIZE, BLOOM_FILTER_FPR);
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_USERNAMES; i++) {
    const username = generateUsername(i);
    filter.add(username);

    if (i % 100000 === 0) {
      showProgress(i, TOTAL_USERNAMES, startTime);
    }
  }

  showProgress(TOTAL_USERNAMES, TOTAL_USERNAMES, startTime);

  // Save to file
  const filterData = {
    size: filter.size,
    nbHashes: filter.nbHashes,
    bits: Array.from(filter._bits),
    metadata: {
      totalItems: TOTAL_USERNAMES,
      fpr: BLOOM_FILTER_FPR,
      createdAt: new Date().toISOString(),
    }
  };

  const filePath = path.join(__dirname, '..', 'bloom-filter.json');
  fs.writeFileSync(filePath, JSON.stringify(filterData));

  const sizeInMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  console.log(`\nBloom Filter built and saved: ${sizeInMB} MB\n`);
}

async function main() {
  console.log(`
Bloom Filter Username Check - Data Seeding
Total usernames: ${TOTAL_USERNAMES.toLocaleString()}
Bloom filter FPR: ${(BLOOM_FILTER_FPR * 100).toFixed(2)}%
  `);

  try {
    await seedPostgreSQL();
    await seedRedis();
    await buildBloomFilter();

    console.log('All data seeded successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

main();
