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

## Contributing

Each project is self-contained with its own README and setup instructions.

## License

MIT
