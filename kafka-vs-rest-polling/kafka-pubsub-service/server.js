const express = require('express');
const { Kafka } = require('kafkajs');
const client = require('prom-client');
require('dotenv').config();

const app = express();
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const kafkaProduceTotal = new client.Counter({
  name: 'kafka_produce_total',
  help: 'Total events produced',
  labelNames: ['status'],
  registers: [register],
});

const kafka = new Kafka({
  clientId: 'uber-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
producer.connect();

app.post('/produce-event', async (req, res) => {
  const { driverId, lat, lng } = req.body;

  try {
    await producer.send({
      topic: 'driver-locations',
      messages: [{
        value: JSON.stringify({ driverId, lat, lng, ts: Date.now() })
      }],
    });
    kafkaProduceTotal.inc({ status: '202' });
    res.status(202).json({ status: 'Accepted' });
  } catch (err) {
    kafkaProduceTotal.inc({ status: '500' });
    res.status(500).json({ error: 'Kafka Down' });
  }
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

const PORT = process.env.KAFKA_PRODUCER_PORT || 3002;
app.listen(PORT, () => console.log(`Kafka Producer on port ${PORT}`));
