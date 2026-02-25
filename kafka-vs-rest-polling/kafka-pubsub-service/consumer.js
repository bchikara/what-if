const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const client = require('prom-client');
const express = require('express');
require('dotenv').config();

class CircuitBreaker {
  constructor(threshold = 5, timeout = 30000, resetTimeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.successCount = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw new Error(`Circuit breaker OPEN. Next attempt in ${waitTime}s`);
      }
      this.state = 'HALF_OPEN';
      console.log('[CircuitBreaker] Testing connection (HALF_OPEN)');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        console.log('[CircuitBreaker] Connection stable (CLOSED)');
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      const retryIn = this.resetTimeout / 1000;
      console.log(`[CircuitBreaker] OPEN after ${this.failureCount} failures (retry in ${retryIn}s)`);
    }
  }

  getState() {
    return this.state;
  }

  getStateValue() {
    const states = { 'CLOSED': 0, 'HALF_OPEN': 1, 'OPEN': 2 };
    return states[this.state] || 0;
  }
}

const app = express();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const kafkaConsumerLag = new client.Gauge({
  name: 'kafka_consumer_lag_seconds',
  help: 'Kafka consumer lag in seconds',
  registers: [register],
});

const circuitBreakerStateMetric = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  registers: [register],
});

const dbWriteFailures = new client.Counter({
  name: 'db_write_failures_total',
  help: 'Total database write failures',
  registers: [register],
});

const bufferedEvents = new client.Gauge({
  name: 'kafka_buffered_events_estimate',
  help: 'Estimated events in Kafka buffer',
  registers: [register],
});

const kafka = new Kafka({
  clientId: 'uber-consumer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'location-group' });

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

const circuitBreaker = new CircuitBreaker(5, 3000, 60000);

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'driver-locations', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { driverId, lat, lng, ts } = JSON.parse(message.value.toString());
      const lag = (Date.now() - ts) / 1000;
      kafkaConsumerLag.set(lag);

      try {
        await circuitBreaker.execute(async () => {
          await pool.query(
            'INSERT INTO driver_locations (driver_id, lat, lng, updated_at) VALUES ($1, $2, $3, NOW())',
            [driverId, lat, lng]
          );
        });

        circuitBreakerStateMetric.set(circuitBreaker.getStateValue());
      } catch (err) {
        dbWriteFailures.inc();
        circuitBreakerStateMetric.set(circuitBreaker.getStateValue());

        if (circuitBreaker.getState() === 'OPEN') {
          bufferedEvents.inc();
        }
      }
    },
  });
};

app.get('/health', (req, res) => {
  const state = circuitBreaker.getState();
  const isHealthy = state === 'CLOSED';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    circuitBreaker: state,
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

const PORT = process.env.KAFKA_CONSUMER_PORT || 3003;
app.listen(PORT, () => console.log(`Kafka Consumer on port ${PORT}`));

run().catch(console.error);
