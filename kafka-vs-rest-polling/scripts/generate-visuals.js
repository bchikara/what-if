#!/usr/bin/env node

/**
 * Visual Generator
 * Creates professional SVG diagrams from experiment results
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  primary: '#FF6600',
  background: '#0A0A0A',
  text: '#FFFFFF',
  success: '#00FF88',
  error: '#FF3366',
  warning: '#FFAA00',
  kafka: '#00D9FF',
  rest: '#FF6600',
};

class VisualGenerator {
  constructor(experimentData) {
    this.data = experimentData;
    this.outputDir = './visuals';

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateComparisonSVG() {
    const { rest, kafka } = this.data;

    const restData = {
      totalRequests: rest.totalRequests || 0,
      successCount: (rest.totalRequests || 0) - (rest.errorCount || 0),
      errorCount: rest.errorCount || 0,
      errorRate: rest.errorRate || '0.00',
      latency: rest.latency || { avg: '0', p95: '0' }
    };

    const kafkaData = {
      totalRequests: kafka.totalRequests || 0,
      successCount: (kafka.totalRequests || 0) - (kafka.errorCount || 0),
      errorCount: kafka.errorCount || 0,
      errorRate: kafka.errorRate || '0.00',
      latency: kafka.latency || { avg: '0', p95: '0' }
    };

    const svg = `
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="800" fill="${COLORS.background}"/>

  <!-- Title -->
  <text x="600" y="60" font-family="Arial, sans-serif" font-size="36" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">
    REST vs Kafka: Database Failure Comparison
  </text>

  <!-- REST Column -->
  <rect x="100" y="120" width="450" height="620" fill="#1a1a1a" stroke="${COLORS.rest}" stroke-width="3" rx="10"/>
  <text x="325" y="170" font-family="Arial, sans-serif" font-size="28" font-weight="bold"
        fill="${COLORS.rest}" text-anchor="middle">
    REST Architecture
  </text>

  <!-- REST Metrics -->
  <text x="150" y="240" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.text}">
    Total Requests:
  </text>
  <text x="500" y="240" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.text}" text-anchor="end">
    ${restData.totalRequests.toLocaleString()}
  </text>

  <text x="150" y="290" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.success}">
    ✓ Success:
  </text>
  <text x="500" y="290" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.success}" text-anchor="end">
    ${restData.successCount.toLocaleString()}
  </text>

  <text x="150" y="340" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.error}">
    ✗ Errors:
  </text>
  <text x="500" y="340" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.error}" text-anchor="end">
    ${restData.errorCount.toLocaleString()}
  </text>

  <text x="150" y="390" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.error}">
    Error Rate:
  </text>
  <text x="500" y="390" font-family="Arial, sans-serif" font-size="32" font-weight="bold"
        fill="${COLORS.error}" text-anchor="end">
    ${restData.errorRate}%
  </text>

  <text x="150" y="460" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.text}">
    Avg Latency:
  </text>
  <text x="500" y="460" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.text}" text-anchor="end">
    ${restData.latency.avg}ms
  </text>

  <!-- REST Business Impact -->
  <rect x="150" y="520" width="350" height="180" fill="#2a1515" stroke="${COLORS.error}" stroke-width="2" rx="5"/>
  <text x="325" y="560" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${COLORS.error}" text-anchor="middle">
    Business Impact
  </text>
  <text x="325" y="600" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Lost Revenue: $${((restData.errorCount * 0.05 * 25) / 1000).toFixed(1)}K
  </text>
  <text x="325" y="635" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Affected Users: ${Math.floor(restData.errorCount / 3).toLocaleString()}
  </text>
  <text x="325" y="670" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.error}" text-anchor="middle">
    Customer Impact: HIGH
  </text>

  <!-- Kafka Column -->
  <rect x="650" y="120" width="450" height="620" fill="#1a1a1a" stroke="${COLORS.kafka}" stroke-width="3" rx="10"/>
  <text x="875" y="170" font-family="Arial, sans-serif" font-size="28" font-weight="bold"
        fill="${COLORS.kafka}" text-anchor="middle">
    Kafka Architecture
  </text>

  <!-- Kafka Metrics -->
  <text x="700" y="240" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.text}">
    Total Requests:
  </text>
  <text x="1050" y="240" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.text}" text-anchor="end">
    ${kafkaData.totalRequests.toLocaleString()}
  </text>

  <text x="700" y="290" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.success}">
    ✓ Success:
  </text>
  <text x="1050" y="290" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.success}" text-anchor="end">
    ${kafkaData.successCount.toLocaleString()}
  </text>

  <text x="700" y="340" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.error}">
    ✗ Errors:
  </text>
  <text x="1050" y="340" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.error}" text-anchor="end">
    ${kafkaData.errorCount.toLocaleString()}
  </text>

  <text x="700" y="390" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.success}">
    Error Rate:
  </text>
  <text x="1050" y="390" font-family="Arial, sans-serif" font-size="32" font-weight="bold"
        fill="${COLORS.success}" text-anchor="end">
    ${kafkaData.errorRate}%
  </text>

  <text x="700" y="460" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.text}">
    Avg Latency:
  </text>
  <text x="1050" y="460" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.text}" text-anchor="end">
    ${kafkaData.latency.avg}ms
  </text>

  <!-- Kafka Business Impact -->
  <rect x="700" y="520" width="350" height="180" fill="#152a25" stroke="${COLORS.success}" stroke-width="2" rx="5"/>
  <text x="875" y="560" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${COLORS.success}" text-anchor="middle">
    Business Impact
  </text>
  <text x="875" y="600" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Lost Revenue: $${((kafkaData.errorCount * 0.05 * 25) / 1000).toFixed(1)}K
  </text>
  <text x="875" y="635" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Affected Users: ${Math.floor(kafkaData.errorCount / 3).toLocaleString()}
  </text>
  <text x="875" y="670" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.success}" text-anchor="middle">
    Customer Impact: NONE
  </text>

  <!-- Footer -->
  <text x="600" y="780" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.text}" text-anchor="middle" opacity="0.7">
    Database crashed for 2 minutes • Same scenario, different architectures
  </text>
</svg>`;

    const filename = path.join(this.outputDir, 'comparison.svg');
    fs.writeFileSync(filename, svg);
    console.log(`✅ Comparison graphic saved: ${filename}`);
    return filename;
  }

  generateArchitectureDiagramSVG(type = 'rest') {
    const isRest = type === 'rest';
    const color = isRest ? COLORS.rest : COLORS.kafka;
    const title = isRest ? 'REST Polling Architecture' : 'Kafka Event Streaming Architecture';

    const svg = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="800" height="600" fill="${COLORS.background}"/>

  <!-- Title -->
  <text x="400" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold"
        fill="${color}" text-anchor="middle">
    ${title}
  </text>

  <!-- Driver -->
  <circle cx="100" cy="150" r="40" fill="${color}" opacity="0.3"/>
  <text x="100" y="155" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.text}" text-anchor="middle">Driver</text>

  ${isRest ? `
  <!-- REST Flow -->
  <line x1="140" y1="150" x2="250" y2="150" stroke="${color}" stroke-width="3" marker-end="url(#arrowRest)"/>
  <text x="195" y="140" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">POST /update</text>

  <!-- REST API -->
  <rect x="250" y="110" width="120" height="80" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="2" rx="5"/>
  <text x="310" y="155" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">REST API</text>

  <!-- Direct DB Connection -->
  <line x1="370" y1="150" x2="480" y2="150" stroke="${color}" stroke-width="3" marker-end="url(#arrowRest)"/>
  <text x="425" y="140" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">Synchronous</text>

  <!-- Database -->
  <rect x="480" y="110" width="120" height="80" fill="${COLORS.text}" opacity="0.2" stroke="${COLORS.text}" stroke-width="2" rx="5"/>
  <text x="540" y="155" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">PostgreSQL</text>

  <!-- Response -->
  <line x1="250" y1="170" x2="140" y2="170" stroke="${color}" stroke-width="3" marker-end="url(#arrowRest)"/>
  <text x="195" y="190" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">200 OK (25ms)</text>

  <!-- Problem Box -->
  <rect x="50" y="300" width="700" height="250" fill="#2a1515" stroke="${COLORS.error}" stroke-width="2" rx="10"/>
  <text x="400" y="340" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.error}" text-anchor="middle">⚠️ What happens when DB fails?</text>
  <text x="400" y="390" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">❌ API cannot respond until DB write completes</text>
  <text x="400" y="420" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">❌ Connection pool exhausted</text>
  <text x="400" y="450" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">❌ 100% error rate to drivers</text>
  <text x="400" y="480" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">❌ All location updates lost</text>
  <text x="400" y="520" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${COLORS.error}" text-anchor="middle">Tight Coupling = Cascading Failure</text>
  ` : `
  <!-- Kafka Flow -->
  <line x1="140" y1="150" x2="250" y2="150" stroke="${color}" stroke-width="3" marker-end="url(#arrowKafka)"/>
  <text x="195" y="140" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">POST /produce</text>

  <!-- Producer API -->
  <rect x="250" y="110" width="120" height="80" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="2" rx="5"/>
  <text x="310" y="150" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">Producer</text>
  <text x="310" y="165" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">API</text>

  <!-- Fast Response -->
  <line x1="250" y1="170" x2="140" y2="170" stroke="${color}" stroke-width="3" marker-end="url(#arrowKafka)"/>
  <text x="195" y="190" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">202 Accepted (5ms)</text>

  <!-- To Kafka -->
  <line x1="370" y1="150" x2="480" y2="150" stroke="${color}" stroke-width="3" marker-end="url(#arrowKafka)"/>
  <text x="425" y="140" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">Event</text>

  <!-- Kafka -->
  <rect x="480" y="110" width="120" height="80" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="2" rx="5"/>
  <text x="540" y="155" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">Kafka</text>

  <!-- Consumer -->
  <rect x="480" y="250" width="120" height="80" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="2" rx="5"/>
  <text x="540" y="295" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">Consumer</text>

  <!-- Kafka to Consumer -->
  <line x1="540" y1="190" x2="540" y2="250" stroke="${color}" stroke-width="3" marker-end="url(#arrowKafka)"/>

  <!-- Database -->
  <rect x="250" y="250" width="120" height="80" fill="${COLORS.text}" opacity="0.2" stroke="${COLORS.text}" stroke-width="2" rx="5"/>
  <text x="310" y="295" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">PostgreSQL</text>

  <!-- Consumer to DB -->
  <line x1="480" y1="290" x2="370" y2="290" stroke="${color}" stroke-width="3" marker-end="url(#arrowKafka)"/>
  <text x="425" y="280" font-family="Arial, sans-serif" font-size="12"
        fill="${COLORS.text}" text-anchor="middle">Async Write</text>

  <!-- Benefit Box -->
  <rect x="50" y="380" width="700" height="170" fill="#152a25" stroke="${COLORS.success}" stroke-width="2" rx="10"/>
  <text x="400" y="420" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.success}" text-anchor="middle">✅ What happens when DB fails?</text>
  <text x="400" y="460" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">✅ Producer API still accepts events (0% errors!)</text>
  <text x="400" y="490" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">✅ Events buffered in Kafka topic</text>
  <text x="400" y="520" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${COLORS.success}" text-anchor="middle">Decoupling = Graceful Degradation</text>
  `}

  <!-- Arrow markers -->
  <defs>
    <marker id="arrowRest" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="${COLORS.rest}"/>
    </marker>
    <marker id="arrowKafka" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="${COLORS.kafka}"/>
    </marker>
  </defs>
</svg>`;

    const filename = path.join(this.outputDir, `architecture-${type}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`✅ ${type.toUpperCase()} architecture diagram saved: ${filename}`);
    return filename;
  }

  generateAllVisuals() {
    console.log('\nGenerating visuals...\n');

    const files = {
      comparison: this.generateComparisonSVG(),
      restArchitecture: this.generateArchitectureDiagramSVG('rest'),
      kafkaArchitecture: this.generateArchitectureDiagramSVG('kafka'),
    };

    console.log('\nAll visuals generated successfully!');
    console.log('\nFiles created:');
    Object.entries(files).forEach(([name, path]) => {
      console.log(`   ${name}: ${path}`);
    });

    console.log('\nTo convert SVG to PNG: convert visuals/*.svg visuals/*.png');

    return files;
  }
}

function parseK6Summary(summaryPath) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const httpReqs = summary.metrics.http_reqs || {};
  const httpReqFailed = summary.metrics.http_req_failed || {};
  const errors = summary.metrics.errors || {};
  const duration = summary.metrics.http_req_duration || {};
  const checks = summary.metrics.checks || {};

  const totalRequests = httpReqs.count || 0;
  const errorCount = Math.floor(totalRequests * (httpReqFailed.rate || errors.value || 0));
  const errorRate = ((httpReqFailed.rate || errors.value || 0) * 100).toFixed(2);

  const successfulChecks = checks.passes || 0;
  const checkBasedErrors = totalRequests - successfulChecks;

  return {
    totalRequests,
    errorCount: Math.max(errorCount, checkBasedErrors),
    errorRate: Math.max(parseFloat(errorRate), ((checkBasedErrors / totalRequests) * 100)).toFixed(2),
    latency: {
      avg: (duration.avg || 0).toFixed(2),
      p95: (duration['p(95)'] || 0).toFixed(2),
    },
  };
}

// Run if executed directly
if (require.main === module) {
  const resultsDir = './experiment-results';
  if (!fs.existsSync(resultsDir)) {
    console.error('No experiment results found. Run npm run experiment first!');
    process.exit(1);
  }

  const restSummary = path.join(resultsDir, 'k6-rest-summary.json');
  const kafkaSummary = path.join(resultsDir, 'k6-kafka-summary.json');

  if (!fs.existsSync(restSummary) || !fs.existsSync(kafkaSummary)) {
    console.error('Missing k6 summary files. Run npm run experiment first!');
    process.exit(1);
  }

  console.log('Loading experiment data from k6 summaries...');

  const experimentData = {
    rest: parseK6Summary(restSummary),
    kafka: parseK6Summary(kafkaSummary),
  };

  const generator = new VisualGenerator(experimentData);
  generator.generateAllVisuals();
}

module.exports = { VisualGenerator, COLORS };
