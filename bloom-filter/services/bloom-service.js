const express = require('express');
const { Pool } = require('pg');
const { BloomFilter } = require('bloom-filters');
const promClient = require('prom-client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.BLOOM_SERVICE_PORT || 3003;

// PostgreSQL connection pool (for fallback queries)
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'usernames',
  max: 10,
});

// Load Bloom Filter from file
let bloomFilter;
let bloomMetadata;

function loadBloomFilter() {
  console.log('Loading Bloom Filter...');
  const filePath = path.join(__dirname, '..', 'bloom-filter.json');

  if (!fs.existsSync(filePath)) {
    console.error('Bloom filter file not found! Run "npm run seed" first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  bloomMetadata = data.metadata;

  // Reconstruct Bloom filter
  bloomFilter = BloomFilter.create(data.size, 0.01);
  bloomFilter._bits = new Uint8Array(data.bits);
  bloomFilter.nbHashes = data.nbHashes;

  const sizeInMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  console.log(`Bloom Filter loaded: ${sizeInMB} MB`);
  console.log(`Total items: ${bloomMetadata.totalItems.toLocaleString()}`);
  console.log(`Target FPR: ${(bloomMetadata.fpr * 100).toFixed(2)}%\n`);
}

loadBloomFilter();

// Prometheus metrics
const register = new promClient.Registry();

const httpRequestsTotal = new promClient.Counter({
  name: 'bloom_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
  registers: [register],
});

const requestDuration = new promClient.Histogram({
  name: 'bloom_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.00001, 0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
  registers: [register],
});

const bloomCheckDuration = new promClient.Histogram({
  name: 'bloom_check_duration_seconds',
  help: 'Bloom filter check duration in seconds',
  buckets: [0.00001, 0.00005, 0.0001, 0.0005, 0.001],
  registers: [register],
});

const bloomChecksTotal = new promClient.Counter({
  name: 'bloom_checks_total',
  help: 'Total Bloom filter checks',
  labelNames: ['result'],
  registers: [register],
});

const dbFallbacksTotal = new promClient.Counter({
  name: 'bloom_db_fallbacks_total',
  help: 'Total database fallback queries',
  labelNames: ['actual_result'],
  registers: [register],
});

const falsePositivesTotal = new promClient.Counter({
  name: 'bloom_false_positives_total',
  help: 'Total false positives detected',
  registers: [register],
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'bloom-filter',
      bloomFilterLoaded: !!bloomFilter,
      bloomFilterSize: bloomMetadata?.totalItems,
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Check username availability
app.post('/check-username', async (req, res) => {
  const start = Date.now();
  const { username } = req.body;

  if (!username) {
    httpRequestsTotal.inc({ method: 'POST', status: 400 });
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Check Bloom filter first
    const bloomStart = Date.now();
    const mightExist = bloomFilter.has(username);
    const bloomDuration = (Date.now() - bloomStart) / 1000;

    bloomCheckDuration.observe(bloomDuration);
    bloomChecksTotal.inc({ result: mightExist ? 'maybe_exists' : 'definitely_not_exists' });

    let exists = false;
    let dbQueried = false;
    let falsePositive = false;

    // If Bloom filter says "might exist", check database
    if (mightExist) {
      dbQueried = true;
      const dbResult = await pool.query(
        'SELECT EXISTS(SELECT 1 FROM usernames WHERE username = $1)',
        [username]
      );
      exists = dbResult.rows[0].exists;

      dbFallbacksTotal.inc({ actual_result: exists ? 'exists' : 'not_exists' });

      // Detect false positive
      if (!exists) {
        falsePositive = true;
        falsePositivesTotal.inc();
      }
    }

    const totalDuration = (Date.now() - start) / 1000;
    requestDuration.observe({ method: 'POST', status: 200 }, totalDuration);
    httpRequestsTotal.inc({ method: 'POST', status: 200 });

    res.json({
      username,
      available: !exists,
      exists,
      method: 'bloom-filter',
      bloomFilterSays: mightExist ? 'maybe_exists' : 'definitely_not_exists',
      databaseQueried: dbQueried,
      falsePositive,
      bloomCheckTime: bloomDuration,
      totalTime: totalDuration,
    });
  } catch (error) {
    const totalDuration = (Date.now() - start) / 1000;
    requestDuration.observe({ method: 'POST', status: 500 }, totalDuration);
    httpRequestsTotal.inc({ method: 'POST', status: 500 });

    res.status(500).json({
      error: 'Query failed',
      message: error.message,
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start server
app.listen(PORT, () => {
  console.log(`Bloom Filter Service Started on Port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});
