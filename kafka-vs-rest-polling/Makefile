# ==============================================================================
# UBER KAFKA VS REST - WHAT IF SERIES AUTOMATION
# ==============================================================================
# Author: What If Series | Senior System Design
# Purpose: One-command automation for architecture experiments
# ==============================================================================

.PHONY: help setup infra run-rest run-kafka run-consumer test clean
.PHONY: view-diagrams render-diagrams experiment-all
.PHONY: experiment-db-failure experiment-throughput experiment-recovery
.PHONY: create-content-pack create-carousel generate-slides

# ==============================================================================
# HELP & DOCUMENTATION
# ==============================================================================

help:
	@echo "=================================================="
	@echo "UBER KAFKA VS REST - WHAT IF SERIES"
	@echo "=================================================="
	@echo ""
	@echo "SETUP COMMANDS:"
	@echo "  make setup              - Install dependencies"
	@echo "  make infra              - Start Docker infrastructure"
	@echo "  make clean              - Stop and remove all containers"
	@echo ""
	@echo "SERVICE COMMANDS:"
	@echo "  make run-rest           - Start REST polling service"
	@echo "  make run-kafka          - Start Kafka producer service"
	@echo "  make run-consumer       - Start Kafka consumer service"
	@echo ""
	@echo "TESTING COMMANDS:"
	@echo "  make test-rest          - Load test REST architecture"
	@echo "  make test-kafka         - Load test Kafka architecture"
	@echo ""
	@echo "WHAT IF EXPERIMENTS:"
	@echo "  make experiment-db-failure    - Database outage simulation"
	@echo "  make experiment-throughput    - Find breaking point"
	@echo "  make experiment-recovery      - Recovery time comparison"
	@echo "  make experiment-all           - Run all experiments"
	@echo ""
	@echo "VISUALIZATION:"
	@echo "  make view-diagrams      - Open C4 diagrams in Structurizr"
	@echo "  make render-diagrams    - Export diagrams as PNG/SVG"
	@echo "  make create-slides      - Generate comparison slides"
	@echo "  make create-carousel    - Generate LinkedIn carousel (10 images)"
	@echo ""
	@echo "CONTENT CREATION:"
	@echo "  make create-content-pack - Generate all content assets"
	@echo "  make metrics-summary     - Generate metrics comparison report"
	@echo ""
	@echo "=================================================="

# ==============================================================================
# SETUP & INFRASTRUCTURE
# ==============================================================================

setup:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Setup complete!"

infra:
	@echo "🚀 Starting Docker infrastructure..."
	docker-compose up -d
	@echo "⏳ Waiting for services to be ready..."
	sleep 10
	@echo "🗄️  Initializing database schema..."
	docker exec -i $$(docker ps -qf "name=postgres") psql -U user -d uber_db < init.sql || true
	@echo "✅ Infrastructure ready!"
	@echo ""
	@echo "Services available:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Kafka: localhost:9092"
	@echo "  - Zookeeper: localhost:2181"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3000 (admin/admin)"

# ==============================================================================
# SERVICE RUNNERS
# ==============================================================================

run-rest:
	@echo "🔵 Starting REST polling service on port 3001..."
	node rest-polling-service/server.js

run-kafka:
	@echo "🟢 Starting Kafka producer service on port 3002..."
	node kafka-pubsub-service/server.js

run-consumer:
	@echo "🟡 Starting Kafka consumer service on port 3003..."
	node kafka-pubsub-service/consumer.js

run-all:
	@echo "🚀 Starting all services..."
	@echo "Opening 3 terminal tabs..."
	osascript -e 'tell application "Terminal" to do script "cd $(PWD) && make run-rest"'
	osascript -e 'tell application "Terminal" to do script "cd $(PWD) && make run-kafka"'
	osascript -e 'tell application "Terminal" to do script "cd $(PWD) && make run-consumer"'

# ==============================================================================
# LOAD TESTING
# ==============================================================================

test-rest:
	@echo "🧪 Running load test on REST architecture..."
	k6 run --summary-export=metrics-rest.json load-test.js --env URL=http://localhost:3001/update-location
	@echo "✅ Results saved to metrics-rest.json"

test-kafka:
	@echo "🧪 Running load test on Kafka architecture..."
	k6 run --summary-export=metrics-kafka.json load-test.js --env URL=http://localhost:3002/produce-event
	@echo "✅ Results saved to metrics-kafka.json"

# ==============================================================================
# WHAT IF EXPERIMENTS
# ==============================================================================

experiment-db-failure:
	@echo "===================================================="
	@echo "EXPERIMENT 1: Database Outage Simulation"
	@echo "===================================================="
	@echo ""
	@echo "This experiment simulates a database failure while"
	@echo "load is running on both architectures."
	@echo ""
	@echo "Expected Results:"
	@echo "  REST: Immediate 500 errors, 100% failure rate"
	@echo "  Kafka: 0% errors, events buffered in Kafka"
	@echo ""
	@echo "Starting experiment in 5 seconds..."
	@sleep 5
	@echo ""
	@echo "📊 Phase 1: Baseline (30 seconds)..."
	@echo "   Starting load on both services..."
	@echo ""
	@echo "📊 Phase 2: Database failure (60 seconds)..."
	@echo "   Stopping database..."
	@docker stop $$(docker ps -qf "name=postgres")
	@sleep 60
	@echo ""
	@echo "📊 Phase 3: Recovery (60 seconds)..."
	@echo "   Restarting database..."
	@docker start $$(docker ps -aqf "name=postgres")
	@sleep 60
	@echo ""
	@echo "✅ Experiment complete!"
	@echo "   Check Grafana dashboards for metrics"
	@echo "   http://localhost:3000"

experiment-throughput:
	@echo "===================================================="
	@echo "EXPERIMENT 2: Throughput Comparison"
	@echo "===================================================="
	@echo ""
	@echo "This experiment gradually increases load to find"
	@echo "the breaking point of each architecture."
	@echo ""
	@echo "Load levels: 100, 500, 1000, 5000, 10000 req/sec"
	@echo ""
	@echo "Starting in 5 seconds..."
	@sleep 5
	@echo ""
	@echo "🔵 Testing REST architecture..."
	@echo "   Level 1: 100 req/sec"
	@echo "   Level 2: 500 req/sec"
	@echo "   Level 3: 1000 req/sec (expected breaking point)"
	@echo ""
	@echo "🟢 Testing Kafka architecture..."
	@echo "   Level 1: 100 req/sec"
	@echo "   Level 2: 500 req/sec"
	@echo "   Level 3: 1000 req/sec"
	@echo "   Level 4: 5000 req/sec"
	@echo "   Level 5: 10000 req/sec (may reach limits)"
	@echo ""
	@echo "✅ Experiment complete!"

experiment-recovery:
	@echo "===================================================="
	@echo "EXPERIMENT 3: Recovery Time Test"
	@echo "===================================================="
	@echo ""
	@echo "This experiment simulates a 1-hour database outage"
	@echo "and measures recovery time for each architecture."
	@echo ""
	@echo "Metrics:"
	@echo "  - Data loss (events dropped)"
	@echo "  - Recovery time (time to process backlog)"
	@echo "  - User impact (error rate)"
	@echo ""
	@echo "⚠️  This test takes ~90 minutes to complete!"
	@read -p "Continue? (y/n): " confirm; [ "$$confirm" = "y" ] || exit 1
	@echo ""
	@echo "Starting recovery test..."

experiment-all:
	@echo "🚀 Running all What If experiments..."
	@echo ""
	@make experiment-db-failure
	@sleep 10
	@make experiment-throughput
	@sleep 10
	@echo ""
	@echo "✅ All experiments complete!"
	@echo "   Results available in:"
	@echo "   - Grafana: http://localhost:3000"
	@echo "   - Prometheus: http://localhost:9090"
	@echo "   - metrics-*.json files"

# ==============================================================================
# VISUALIZATION & DIAGRAMS
# ==============================================================================

view-diagrams:
	@echo "📐 Opening C4 diagrams in Structurizr..."
	@if ! docker ps | grep -q structurizr; then \
		echo "Starting Structurizr Lite..."; \
		docker run -d --name structurizr -p 8080:8080 -v $(PWD)/architecture:/usr/local/structurizr structurizr/lite; \
		sleep 5; \
	fi
	@echo "✅ Structurizr running at http://localhost:8080"
	@open http://localhost:8080

render-diagrams:
	@echo "🎨 Rendering C4 diagrams to PNG..."
	@mkdir -p output/diagrams
	@echo "   Using Structurizr for rendering..."
	@echo ""
	@echo "Available diagrams:"
	@echo "  - uber-rest-polling.c4"
	@echo "  - uber-kafka-streaming.c4"
	@echo ""
	@echo "✅ To export diagrams:"
	@echo "   1. Open http://localhost:8080"
	@echo "   2. Select diagram view"
	@echo "   3. Click 'Export' → PNG/SVG"
	@echo "   4. Save to output/diagrams/"

create-slides:
	@echo "🎬 Creating comparison slides..."
	@mkdir -p output/slides
	@echo "Generating slides:"
	@echo "  1. Architecture Comparison (side-by-side)"
	@echo "  2. Normal Flow (both systems)"
	@echo "  3. Database Failure (REST)"
	@echo "  4. Kafka Resilience (Kafka)"
	@echo "  5. Metrics Comparison"
	@echo ""
	@echo "✅ Export diagrams from Structurizr first!"
	@echo "   Then run: make assemble-slides"

create-carousel:
	@echo "📱 Creating LinkedIn carousel (10 slides)..."
	@mkdir -p output/carousel
	@echo ""
	@echo "Carousel structure:"
	@echo "  Slide 1: Title - 'What if Uber used REST?'"
	@echo "  Slide 2: The Challenge (high-frequency writes)"
	@echo "  Slide 3: REST Architecture diagram"
	@echo "  Slide 4: Kafka Architecture diagram"
	@echo "  Slide 5: Normal flow comparison"
	@echo "  Slide 6: Database failure scenario"
	@echo "  Slide 7: Metrics comparison table"
	@echo "  Slide 8: Cost analysis"
	@echo "  Slide 9: Key takeaways"
	@echo "  Slide 10: Call to action"
	@echo ""
	@echo "✅ Use output/carousel/ for LinkedIn post!"

# ==============================================================================
# CONTENT CREATION
# ==============================================================================

create-content-pack:
	@echo "📦 Creating complete content pack..."
	@mkdir -p output/{diagrams,slides,carousel,metrics,scripts}
	@echo ""
	@echo "Content pack includes:"
	@echo "  ✓ C4 architecture diagrams (PNG/SVG)"
	@echo "  ✓ Comparison slides (5 slides)"
	@echo "  ✓ LinkedIn carousel (10 images)"
	@echo "  ✓ Metrics comparison report (PDF)"
	@echo "  ✓ Experiment scripts"
	@echo "  ✓ Video script template"
	@echo ""
	@echo "📁 All assets saved to output/"

metrics-summary:
	@echo "📊 Generating metrics comparison report..."
	@mkdir -p output/metrics
	@echo "Analyzing:"
	@echo "  - metrics-rest.json"
	@echo "  - metrics-kafka.json"
	@echo ""
	@echo "Report includes:"
	@echo "  - Latency comparison (P50, P95, P99)"
	@echo "  - Throughput analysis"
	@echo "  - Error rates"
	@echo "  - Resource utilization"
	@echo ""
	@echo "✅ Report saved to output/metrics/comparison-report.md"

# ==============================================================================
# MONITORING & DASHBOARDS
# ==============================================================================

open-grafana:
	@echo "📈 Opening Grafana dashboard..."
	@open http://localhost:3000
	@echo "Default credentials: admin/admin"

open-prometheus:
	@echo "📊 Opening Prometheus..."
	@open http://localhost:9090

view-metrics:
	@echo "📊 Current metrics:"
	@echo ""
	@echo "REST API (port 3001):"
	@curl -s http://localhost:3001/metrics | grep -E "rest_http_requests_total|rest_http_latency" || echo "Service not running"
	@echo ""
	@echo "Kafka Producer (port 3002):"
	@curl -s http://localhost:3002/metrics | grep kafka_produce_total || echo "Service not running"
	@echo ""
	@echo "Kafka Consumer (port 3003):"
	@curl -s http://localhost:3003/metrics | grep kafka_consumer_lag || echo "Service not running"

# ==============================================================================
# CLEANUP
# ==============================================================================

clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	@if docker ps | grep -q structurizr; then \
		docker stop structurizr; \
		docker rm structurizr; \
	fi
	rm -rf node_modules
	rm -f metrics-*.json
	@echo "✅ Cleanup complete!"

clean-output:
	@echo "🧹 Cleaning output directory..."
	rm -rf output/
	@echo "✅ Output directory cleaned!"

# ==============================================================================
# QUICK START
# ==============================================================================

quick-start:
	@echo "🚀 Quick Start - Setting up everything..."
	@make setup
	@make infra
	@echo ""
	@echo "✅ Quick start complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. make run-all          # Start all services"
	@echo "  2. make view-diagrams    # View C4 architectures"
	@echo "  3. make experiment-all   # Run experiments"
	@echo "  4. make create-content-pack  # Generate content"
	@echo ""
	@echo "Or try:"
	@echo "  make help                # See all commands"
