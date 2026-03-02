const express = require('express');
const redis = require('redis');
const promClient = require('prom-client');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.REDIS_SERVICE_PORT || 3002;

// Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

// Prometheus metrics
const register = new promClient.Registry();

const httpRequestsTotal = new promClient.Counter({
  name: 'redis_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
  registers: [register],
});

const requestDuration = new promClient.Histogram({
  name: 'redis_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register],
});

const redisQueryDuration = new promClient.Histogram({
  name: 'redis_query_duration_seconds',
  help: 'Redis query duration in seconds',
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register],
});

const redisQueriesTotal = new promClient.Counter({
  name: 'redis_queries_total',
  help: 'Total Redis queries executed',
  labelNames: ['result'],
  registers: [register],
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'healthy', service: 'redis' });
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
    // Query Redis SET
    const queryStart = Date.now();
    const exists = await redisClient.sIsMember('usernames', username);
    const queryDuration = (Date.now() - queryStart) / 1000;

    // Record metrics
    redisQueryDuration.observe(queryDuration);
    redisQueriesTotal.inc({ result: exists ? 'exists' : 'not_exists' });

    const totalDuration = (Date.now() - start) / 1000;
    requestDuration.observe({ method: 'POST', status: 200 }, totalDuration);
    httpRequestsTotal.inc({ method: 'POST', status: 200 });

    res.json({
      username,
      available: !exists,
      exists,
      method: 'redis',
      queryTime: queryDuration,
      totalTime: totalDuration,
    });
  } catch (error) {
    const totalDuration = (Date.now() - start) / 1000;
    requestDuration.observe({ method: 'POST', status: 500 }, totalDuration);
    httpRequestsTotal.inc({ method: 'POST', status: 500 });

    res.status(500).json({
      error: 'Redis query failed',
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
  console.log(`Redis Service Started on Port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await redisClient.disconnect();
  process.exit(0);
});
