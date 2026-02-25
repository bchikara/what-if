const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');
require('dotenv').config();

const app = express();
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'rest_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['status'],
  registers: [register],
});

const httpLatencySeconds = new client.Histogram({
  name: 'rest_http_latency_seconds',
  help: 'HTTP request latency in seconds',
  registers: [register],
});

const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'uber_db',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5432,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || 2000,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS) || 5000,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10
});

app.post('/update-location', async (req, res) => {
  const end = httpLatencySeconds.startTimer();
  const { driverId, lat, lng } = req.body;

  try {
    await pool.query(
      'INSERT INTO driver_locations (driver_id, lat, lng, updated_at) VALUES ($1, $2, $3, NOW())',
      [driverId, lat, lng]
    );
    httpRequestsTotal.inc({ status: '200' });
    end();
    res.status(200).json({ status: 'Updated' });
  } catch (err) {
    httpRequestsTotal.inc({ status: '500' });
    end();
    res.status(500).json({ error: 'DB Down' });
  }
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

const PORT = process.env.REST_PORT || 3001;
app.listen(PORT, () => console.log(`REST Service on port ${PORT}`));
