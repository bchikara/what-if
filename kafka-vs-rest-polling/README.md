# REST vs Kafka: Database Failure Resilience

> Production-grade POC demonstrating why event-driven architectures outperform synchronous REST APIs during infrastructure failures.

## Overview

This project simulates Uber's real-time location tracking system using two architectures:
- **REST API** (synchronous, direct database writes)
- **Kafka Event Streaming** (asynchronous, buffered writes with circuit breaker)

### Key Results

When the database crashes for 2 minutes:
- **REST**: 40-50% error rate, immediate service degradation
- **Kafka**: 0.33% error rate, graceful degradation with auto-recovery

**Business Impact**: Kafka saves **$9K+ in revenue per 5 minutes** of database downtime.

---

## Quick Start

### Prerequisites

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Verify installation
k6 version
```

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- Kafka + Zookeeper
- PostgreSQL
- Prometheus
- Grafana

### 2. Start Services (3 terminals)

**Terminal 1: REST API**
```bash
npm run start:rest
# Running on http://localhost:3001
```

**Terminal 2: Kafka Producer**
```bash
npm run start:kafka
# Running on http://localhost:3002
```

**Terminal 3: Kafka Consumer**
```bash
npm run start:consumer
# Running on http://localhost:3003
```

### 3. Run Experiment

```bash
npm run experiment
```

This will:
- Load test both architectures at 50 req/s
- Crash the database at 90 seconds
- Restore at 210 seconds
- Display real metrics comparing both approaches

### 4. Generate Visuals (Optional)

```bash
npm run generate-visuals
```

Creates LinkedIn-ready SVG graphics in `./visuals/`

---

## Project Structure

```
.
├── k6/                         # Load testing
│   ├── runner.js              # Professional experiment runner
│   └── runner-legacy.js       # Original version
│
├── rest-polling-service/       # Synchronous REST API
│   └── server.js
│
├── kafka-pubsub-service/       # Async Kafka architecture
│   ├── server.js              # Producer API
│   └── consumer.js            # Consumer with circuit breaker
│
├── scripts/                    # Utility scripts
│   └── generate-visuals.js
│
├── docker-compose.yml          # Infrastructure setup
├── .env.example               # Environment template
└── package.json
```

---

## Architecture Comparison

### REST (Synchronous)

```
Driver → REST API → PostgreSQL → Response (25ms)
                ↓ (DB down)
             500 Error
```

**Problem**: Tight coupling means DB failure = API failure

### Kafka (Asynchronous)

```
Driver → Producer → Kafka → Consumer → PostgreSQL
            ↓                    ↓
       202 Accepted         Circuit Breaker
         (5ms)              (buffers on failure)
```

**Solution**: Decoupled with built-in buffering and auto-recovery

---

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_USER=user
DB_HOST=localhost
DB_NAME=uber_db
DB_PASSWORD=your_password
DB_PORT=5432

# Connection Pool
DB_CONNECTION_TIMEOUT_MS=2000
DB_IDLE_TIMEOUT_MS=5000
DB_MAX_CONNECTIONS=10
```

---

## Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Key Metrics

- `rest_http_requests_total` - REST API requests
- `kafka_produce_total` - Events published
- `circuit_breaker_state` - 0=CLOSED, 1=HALF_OPEN, 2=OPEN
- `kafka_consumer_lag_seconds` - Consumer lag

---

## Troubleshooting

### Services won't start

```bash
# Check if ports are available
lsof -i :3001  # REST
lsof -i :3002  # Kafka Producer
lsof -i :3003  # Consumer
lsof -i :9092  # Kafka broker

# Restart services
docker-compose down
docker-compose up -d
```

### k6 not found

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6
```

### Database not ready

```bash
# Wait 10 seconds after docker-compose up
docker-compose logs postgres | grep "ready to accept"
```

---

## Use Cases

### For Interviews
- System design patterns (circuit breaker, event-driven)
- Production observability (Prometheus/Grafana)
- Chaos engineering (automated failure scenarios)

### For Learning
- Event-driven architecture
- Resilience patterns
- Load testing with k6
- Docker infrastructure

### For LinkedIn Content
- Professional metrics and visuals
- Business context ($9K+ savings)
- Real production scenarios

---

## Commands Reference

```bash
# Infrastructure
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
docker-compose logs -f    # Follow logs

# Services
npm run start:rest        # REST API (3001)
npm run start:kafka       # Kafka Producer (3002)
npm run start:consumer    # Consumer (3003)

# Testing
npm run experiment        # Run full experiment (5 min)
npm run experiment:legacy # Old version
npm run generate-visuals  # Create graphics
npm run full-demo         # Experiment + visuals
```

---

## Contributing

This is a POC for demonstration purposes. Feel free to fork and adapt for your use case.

### Potential Enhancements

- [ ] Add more failure scenarios (network lag, CPU throttle)
- [ ] Implement Grafana dashboards
- [ ] Add real-time web dashboard
- [ ] Simulate realistic traffic patterns
- [ ] Add multiple Kafka partitions
- [ ] Implement distributed tracing

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

Built to demonstrate production-grade system design patterns inspired by real-world challenges at scale.

**Technologies**: Node.js, Kafka, PostgreSQL, Prometheus, Grafana, k6, Docker
