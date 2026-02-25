#!/usr/bin/env node

/**
 * LinkedIn Visual Generator
 * Creates stunning graphics (not boring terminals!) for your content
 * Outputs PNG images using HTML Canvas or SVG
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
    ${rest.totalRequests.toLocaleString()}
  </text>

  <text x="150" y="290" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.success}">
    ✓ Success:
  </text>
  <text x="500" y="290" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.success}" text-anchor="end">
    ${rest.successCount.toLocaleString()}
  </text>

  <text x="150" y="340" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.error}">
    ✗ Errors:
  </text>
  <text x="500" y="340" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.error}" text-anchor="end">
    ${rest.errorCount.toLocaleString()}
  </text>

  <text x="150" y="390" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.error}">
    Error Rate:
  </text>
  <text x="500" y="390" font-family="Arial, sans-serif" font-size="32" font-weight="bold"
        fill="${COLORS.error}" text-anchor="end">
    ${rest.errorRate}%
  </text>

  <text x="150" y="460" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.text}">
    Avg Latency:
  </text>
  <text x="500" y="460" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.text}" text-anchor="end">
    ${rest.latency.avg}ms
  </text>

  <!-- REST Business Impact -->
  <rect x="150" y="520" width="350" height="180" fill="#2a1515" stroke="${COLORS.error}" stroke-width="2" rx="5"/>
  <text x="325" y="560" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${COLORS.error}" text-anchor="middle">
    Business Impact
  </text>
  <text x="325" y="600" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Lost Revenue: $${((rest.errorCount * 0.05 * 25) / 1000).toFixed(1)}K
  </text>
  <text x="325" y="635" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Affected Users: ${Math.floor(rest.errorCount / 3).toLocaleString()}
  </text>
  <text x="325" y="670" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.error}" text-anchor="middle">
    😡 Customer Impact: HIGH
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
    ${kafka.totalRequests.toLocaleString()}
  </text>

  <text x="700" y="290" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.success}">
    ✓ Success:
  </text>
  <text x="1050" y="290" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.success}" text-anchor="end">
    ${kafka.successCount.toLocaleString()}
  </text>

  <text x="700" y="340" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.error}">
    ✗ Errors:
  </text>
  <text x="1050" y="340" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.error}" text-anchor="end">
    ${kafka.errorCount.toLocaleString()}
  </text>

  <text x="700" y="390" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.success}">
    Error Rate:
  </text>
  <text x="1050" y="390" font-family="Arial, sans-serif" font-size="32" font-weight="bold"
        fill="${COLORS.success}" text-anchor="end">
    ${kafka.errorRate}%
  </text>

  <text x="700" y="460" font-family="Arial, sans-serif" font-size="20" fill="${COLORS.text}">
    Avg Latency:
  </text>
  <text x="1050" y="460" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${COLORS.text}" text-anchor="end">
    ${kafka.latency.avg}ms
  </text>

  <!-- Kafka Business Impact -->
  <rect x="700" y="520" width="350" height="180" fill="#152a25" stroke="${COLORS.success}" stroke-width="2" rx="5"/>
  <text x="875" y="560" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${COLORS.success}" text-anchor="middle">
    Business Impact
  </text>
  <text x="875" y="600" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Lost Revenue: $${((kafka.errorCount * 0.05 * 25) / 1000).toFixed(1)}K
  </text>
  <text x="875" y="635" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.text}" text-anchor="middle">
    Affected Users: ${Math.floor(kafka.errorCount / 3).toLocaleString()}
  </text>
  <text x="875" y="670" font-family="Arial, sans-serif" font-size="16"
        fill="${COLORS.success}" text-anchor="middle">
    😊 Customer Impact: NONE
  </text>

  <!-- Footer -->
  <text x="600" y="780" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.text}" text-anchor="middle" opacity="0.7">
    Database crashed for 2 hours • Same scenario, different architectures
  </text>
</svg>`;

    const filename = path.join(this.outputDir, 'comparison.svg');
    fs.writeFileSync(filename, svg);
    console.log(`✅ Comparison graphic saved: ${filename}`);
    return filename;
  }

  generateTimelineSVG() {
    const { timeline, events } = this.data;
    const width = 1200;
    const height = 600;
    const padding = { top: 80, right: 50, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find max values for scaling
    const maxTime = Math.max(
      ...timeline.rest.map(p => p.timestamp),
      ...timeline.kafka.map(p => p.timestamp)
    );
    const maxErrorRate = 100;

    // Scale functions
    const scaleX = (time) => padding.left + (time / maxTime) * chartWidth;
    const scaleY = (errorRate) => padding.top + chartHeight - (errorRate / maxErrorRate) * chartHeight;

    // Generate path for REST
    const restPath = timeline.rest.map((point, i) => {
      const x = scaleX(point.timestamp);
      const y = scaleY(point.errorRate);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate path for Kafka
    const kafkaPath = timeline.kafka.map((point, i) => {
      const x = scaleX(point.timestamp);
      const y = scaleY(point.errorRate);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${COLORS.background}"/>

  <!-- Title -->
  <text x="${width / 2}" y="40" font-family="Arial, sans-serif" font-size="28" font-weight="bold"
        fill="${COLORS.text}" text-anchor="middle">
    Error Rate Timeline: Database Failure at 60s
  </text>

  <!-- Grid lines -->
  ${[0, 25, 50, 75, 100].map(val => `
    <line x1="${padding.left}" y1="${scaleY(val)}" x2="${width - padding.right}" y2="${scaleY(val)}"
          stroke="#333" stroke-width="1" stroke-dasharray="5,5"/>
    <text x="${padding.left - 10}" y="${scaleY(val) + 5}" font-family="Arial, sans-serif" font-size="12"
          fill="${COLORS.text}" text-anchor="end">${val}%</text>
  `).join('')}

  <!-- Event markers -->
  ${events.map(event => {
    const x = scaleX(event.timestamp);
    return `
      <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}"
            stroke="${COLORS.error}" stroke-width="2" stroke-dasharray="10,5"/>
      <text x="${x}" y="${padding.top - 10}" font-family="Arial, sans-serif" font-size="12"
            fill="${COLORS.error}" text-anchor="middle">${event.event}</text>
    `;
  }).join('')}

  <!-- REST line -->
  <path d="${restPath}" fill="none" stroke="${COLORS.rest}" stroke-width="3"/>

  <!-- Kafka line -->
  <path d="${kafkaPath}" fill="none" stroke="${COLORS.kafka}" stroke-width="3"/>

  <!-- Legend -->
  <rect x="${width - 200}" y="100" width="150" height="80" fill="#1a1a1a" stroke="${COLORS.text}"
        stroke-width="1" rx="5"/>
  <line x1="${width - 180}" y1="130" x2="${width - 140}" y2="130"
        stroke="${COLORS.rest}" stroke-width="3"/>
  <text x="${width - 130}" y="135" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.rest}">REST</text>
  <line x1="${width - 180}" y1="160" x2="${width - 140}" y2="160"
        stroke="${COLORS.kafka}" stroke-width="3"/>
  <text x="${width - 130}" y="165" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.kafka}">Kafka</text>

  <!-- X-axis label -->
  <text x="${width / 2}" y="${height - 20}" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.text}" text-anchor="middle">Time (seconds)</text>

  <!-- Y-axis label -->
  <text x="20" y="${height / 2}" font-family="Arial, sans-serif" font-size="14"
        fill="${COLORS.text}" text-anchor="middle" transform="rotate(-90, 20, ${height / 2})">
    Error Rate (%)
  </text>
</svg>`;

    const filename = path.join(this.outputDir, 'timeline.svg');
    fs.writeFileSync(filename, svg);
    console.log(`✅ Timeline graphic saved: ${filename}`);
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
    console.log('\n🎨 Generating LinkedIn-ready visuals...\n');

    const files = {
      comparison: this.generateComparisonSVG(),
      timeline: this.generateTimelineSVG(),
      restArchitecture: this.generateArchitectureDiagramSVG('rest'),
      kafkaArchitecture: this.generateArchitectureDiagramSVG('kafka'),
    };

    console.log('\n✅ All visuals generated successfully!');
    console.log('\n📁 Files created:');
    Object.entries(files).forEach(([name, path]) => {
      console.log(`   ${name}: ${path}`);
    });

    console.log('\n💡 To convert SVG to PNG for LinkedIn:');
    console.log('   Use any online converter or command: convert visuals/*.svg visuals/*.png');

    return files;
  }
}

// Run if executed directly
if (require.main === module) {
  // Load the most recent experiment data
  const resultsDir = './experiment-results';
  if (!fs.existsSync(resultsDir)) {
    console.error('❌ No experiment results found. Run measure-experiment.js first!');
    process.exit(1);
  }

  const files = fs.readdirSync(resultsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('❌ No experiment JSON files found. Run measure-experiment.js first!');
    process.exit(1);
  }

  const latestFile = path.join(resultsDir, files[0]);
  console.log(`📊 Loading experiment data from: ${latestFile}`);

  const experimentData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
  const generator = new VisualGenerator(experimentData);
  generator.generateAllVisuals();
}

module.exports = { VisualGenerator, COLORS };
