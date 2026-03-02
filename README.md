# What If Series

Production-grade POCs exploring "what if" scenarios in system design and architecture.

## Projects

### 1. [Kafka vs REST Polling](./kafka-vs-rest-polling)
**What if your database goes down?**

Demonstrates why event-driven architectures (Kafka) outperform synchronous REST APIs during infrastructure failures.

- **REST**: 50% error rate during database outage
- **Kafka**: 0% errors with circuit breaker auto-recovery
- Automated chaos engineering with k6 load testing
- Production-ready code with Prometheus/Grafana monitoring

**Tech**: Node.js, Kafka, PostgreSQL, k6, Docker

[Read more →](./kafka-vs-rest-polling/README.md)

---

### 2. [Bloom Filter Username Check](./bloom-filter-username-check)
**What if you could check 10 million usernames in under 1 millisecond?**

Compares PostgreSQL, Redis, and Bloom filters for username availability checks at scale.

- **PostgreSQL**: 23ms latency, 100K database queries
- **Redis**: 2.8ms latency, 500MB memory for 10M users
- **Bloom Filter**: 0.08ms latency, 9.6MB memory, 95% query reduction
- Real-world use cases: GitHub, Medium, Chrome

**Tech**: Node.js, PostgreSQL, Redis, Bloom Filters, k6, Docker

[Read more →](./bloom-filter/README.md)

---

## Contributing

Each project is self-contained with its own README and setup instructions.

## License

MIT
