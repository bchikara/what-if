const express = require('express');
const { Pool } = require('pg');
const promClient = require('prom-client');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.POSTGRES_SERVICE_PORT || 3001;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'usernames',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Prometheus metrics
const register = new promClient.Registry();

const httpRequestsTotal = new promClient.Counter({
  name: 'postgres_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
  registers: [register],
});

const requestDuration = new promClient.Histogram({
  name: 'postgres_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const dbQueryDuration = new promClient.Histogram({
  name: 'postgres_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const dbQueriesTotal = new promClient.Counter({
  name: 'postgres_db_queries_total',
  help: 'Total database queries executed',
  labelNames: ['result'],
  registers: [register],
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'postgres' });
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
    // Query database
    const queryStart = Date.now();
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM usernames WHERE username = $1)',
      [username]
    );
    const queryDuration = (Date.now() - queryStart) / 1000;

    const exists = result.rows[0].exists;

    // Record metrics
    dbQueryDuration.observe(queryDuration);
    dbQueriesTotal.inc({ result: exists ? 'exists' : 'not_exists' });

    const totalDuration = (Date.now() - start) / 1000;
    requestDuration.observe({ method: 'POST', status: 200 }, totalDuration);
    httpRequestsTotal.inc({ method: 'POST', status: 200 });

    res.json({
      username,
      available: !exists,
      exists,
      method: 'postgresql',
      queryTime: queryDuration,
      totalTime: totalDuration,
    });
  } catch (error) {
    const totalDuration = (Date.now() - start) / 1000;
    requestDuration.observe({ method: 'POST', status: 500 }, totalDuration);
    httpRequestsTotal.inc({ method: 'POST', status: 500 });

    res.status(500).json({
      error: 'Database query failed',
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
  console.log(`PostgreSQL Service Started on Port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});
