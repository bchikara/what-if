#!/usr/bin/env node

/**
 * K6-Based Experiment Runner
 * Professional load testing with database failure simulation
 * Generates real metrics for LinkedIn content
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

const CONFIG = {
  phases: {
    warmup: { duration: '30s', vus: 50, rps: 25 },
    normal: { duration: '60s', vus: 100, rps: 50 },
    crash: { duration: '120s', vus: 100, rps: 50 }, // DB will be down
    recovery: { duration: '90s', vus: 100, rps: 50 },
  },
  crashAt: 90, // seconds into test
  restoreAt: 210, // seconds into test
  outputDir: './experiment-results',
};

class K6ExperimentRunner {
  constructor() {
    this.k6Processes = [];
    this.dbCrashScheduled = false;
    this.results = {
      rest: null,
      kafka: null,
      metadata: {
        timestamp: new Date().toISOString(),
        config: CONFIG,
      },
    };

    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
  }

  async checkK6Installed() {
    try {
      await execPromise('k6 version');
      console.log('✅ k6 is installed');
      return true;
    } catch (err) {
      console.error('❌ k6 is not installed!');
      console.error('Install it: brew install k6 (macOS) or see https://k6.io/docs/getting-started/installation/');
      return false;
    }
  }

  async checkServicesRunning() {
    try {
      await execPromise('curl -s http://localhost:3001/metrics > /dev/null');
      console.log('✅ REST service is running on port 3001');
    } catch {
      console.error('❌ REST service not running! Start it: npm run start:rest');
      return false;
    }

    try {
      await execPromise('curl -s http://localhost:3002/metrics > /dev/null');
      console.log('✅ Kafka producer is running on port 3002');
    } catch {
      console.error('❌ Kafka producer not running! Start it: npm run start:kafka');
      return false;
    }

    try {
      await execPromise('curl -s http://localhost:3003/health > /dev/null');
      console.log('✅ Kafka consumer is running on port 3003');
    } catch {
      console.error('❌ Kafka consumer not running! Start it: npm run start:consumer');
      return false;
    }

    return true;
  }

  generateK6Script(architecture) {
    const url = architecture === 'rest'
      ? 'http://localhost:3001/update-location'
      : 'http://localhost:3002/produce-event';

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('request_duration');

export const options = {
  scenarios: {
    ${architecture}_load: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '${CONFIG.phases.warmup.duration + CONFIG.phases.normal.duration + CONFIG.phases.crash.duration + CONFIG.phases.recovery.duration}',
      preAllocatedVUs: 150,
      maxVUs: 300,
    },
  },
  thresholds: {
    'errors': ['rate<0.9'], // Allow up to 90% errors (expected during DB crash for REST)
    'request_duration': ['p(95)<5000'], // 5s timeout
  },
};

export default function () {
  const driverId = \`driver_\${Math.floor(Math.random() * 5000)}\`;
  const lat = 37.7749 + Math.random() * 0.1;
  const lng = -122.4194 + Math.random() * 0.1;

  const payload = JSON.stringify({
    driverId,
    lat,
    lng,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '5s',
  };

  const res = http.post('${url}', payload, params);

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  errorRate.add(!success);
  latency.add(res.timings.duration);

  sleep(0.02); // Small sleep to prevent overwhelming the system
}
`;
  }

  async runK6Test(architecture) {
    const scriptPath = path.join(CONFIG.outputDir, `k6-${architecture}.js`);
    const outputPath = path.join(CONFIG.outputDir, `k6-${architecture}-results.json`);

    // Write k6 script
    const script = this.generateK6Script(architecture);
    fs.writeFileSync(scriptPath, script);

    console.log(`\n🚀 Starting k6 load test for ${architecture.toUpperCase()}...`);
    console.log(`   Script: ${scriptPath}`);
    console.log(`   Output: ${outputPath}`);

    return new Promise((resolve, reject) => {
      const k6Process = spawn('k6', [
        'run',
        '--out', `json=${outputPath}`,
        '--summary-export', `${CONFIG.outputDir}/k6-${architecture}-summary.json`,
        scriptPath
      ], {
        stdio: 'inherit',
      });

      this.k6Processes.push(k6Process);

      k6Process.on('close', (code) => {
        console.log(`\n✅ k6 test for ${architecture.toUpperCase()} completed with code ${code}`);
        resolve(code);
      });

      k6Process.on('error', (err) => {
        console.error(`\n❌ k6 test for ${architecture.toUpperCase()} failed:`, err);
        reject(err);
      });
    });
  }

  async scheduleDatabaseChaos() {
    console.log(`\n⏰ Scheduling database crash at ${CONFIG.crashAt}s...`);

    setTimeout(async () => {
      console.log('\n💥 ═══════════════════════════════════════════════════════');
      console.log('💥 CRASHING DATABASE NOW!');
      console.log('💥 ═══════════════════════════════════════════════════════\n');

      try {
        await execPromise('docker-compose stop postgres');
        console.log('✅ PostgreSQL stopped');
      } catch (err) {
        console.error('⚠️ Failed to stop database:', err.message);
      }
    }, CONFIG.crashAt * 1000);

    setTimeout(async () => {
      console.log('\n🔄 ═══════════════════════════════════════════════════════');
      console.log('🔄 RESTORING DATABASE NOW!');
      console.log('🔄 ═══════════════════════════════════════════════════════\n');

      try {
        await execPromise('docker-compose start postgres');
        console.log('✅ PostgreSQL started');
        console.log('⏳ Waiting 10s for database to be ready...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('✅ Database should be ready now');
      } catch (err) {
        console.error('⚠️ Failed to restore database:', err.message);
      }
    }, CONFIG.restoreAt * 1000);
  }

  async parseK6Results(architecture) {
    const summaryPath = path.join(CONFIG.outputDir, `k6-${architecture}-summary.json`);

    if (!fs.existsSync(summaryPath)) {
      console.error(`⚠️ No summary found for ${architecture}`);
      return null;
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    // Extract key metrics
    const httpReqDuration = summary.metrics.http_req_duration || {};
    const httpReqs = summary.metrics.http_reqs || {};
    const errors = summary.metrics.errors || {};

    return {
      totalRequests: httpReqs.count || 0,
      successCount: Math.floor((httpReqs.count || 0) * (1 - (errors.rate || 0))),
      errorCount: Math.floor((httpReqs.count || 0) * (errors.rate || 0)),
      errorRate: ((errors.rate || 0) * 100).toFixed(2),
      latency: {
        avg: (httpReqDuration.avg || 0).toFixed(2),
        p50: (httpReqDuration.med || 0).toFixed(2),
        p95: (httpReqDuration['p(95)'] || 0).toFixed(2),
        p99: (httpReqDuration['p(99)'] || 0).toFixed(2),
      },
    };
  }

  async generateComparison() {
    console.log('\n📊 Parsing results...');

    this.results.rest = await this.parseK6Results('rest');
    this.results.kafka = await this.parseK6Results('kafka');

    if (!this.results.rest || !this.results.kafka) {
      console.error('❌ Failed to parse results');
      return null;
    }

    const comparison = {
      errorRateDiff: (parseFloat(this.results.rest.errorRate) - parseFloat(this.results.kafka.errorRate)).toFixed(2),
      latencyImprovement: (
        (parseFloat(this.results.rest.latency.avg) - parseFloat(this.results.kafka.latency.avg)) /
        parseFloat(this.results.rest.latency.avg) * 100
      ).toFixed(2),
    };

    this.results.comparison = comparison;

    // Save final report
    const reportPath = path.join(CONFIG.outputDir, `experiment-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Final report saved: ${reportPath}`);

    return this.results;
  }

  printSummary() {
    if (!this.results.rest || !this.results.kafka) {
      console.error('❌ No results to display');
      return;
    }

    const { rest, kafka, comparison } = this.results;

    console.log('\n' + '═'.repeat(80));
    console.log('📊 EXPERIMENT RESULTS');
    console.log('═'.repeat(80));

    console.log('\n🔴 REST ARCHITECTURE:');
    console.log(`   Total Requests:    ${rest.totalRequests.toLocaleString()}`);
    console.log(`   ✅ Success:         ${rest.successCount.toLocaleString()}`);
    console.log(`   ❌ Errors:          ${rest.errorCount.toLocaleString()}`);
    console.log(`   📉 Error Rate:      ${rest.errorRate}%`);
    console.log(`   ⏱️  Avg Latency:     ${rest.latency.avg}ms`);
    console.log(`   ⏱️  P95 Latency:     ${rest.latency.p95}ms`);

    console.log('\n🟢 KAFKA ARCHITECTURE:');
    console.log(`   Total Requests:    ${kafka.totalRequests.toLocaleString()}`);
    console.log(`   ✅ Success:         ${kafka.successCount.toLocaleString()}`);
    console.log(`   ❌ Errors:          ${kafka.errorCount.toLocaleString()}`);
    console.log(`   📉 Error Rate:      ${kafka.errorRate}%`);
    console.log(`   ⏱️  Avg Latency:     ${kafka.latency.avg}ms`);
    console.log(`   ⏱️  P95 Latency:     ${kafka.latency.p95}ms`);

    console.log('\n🎯 COMPARISON:');
    console.log(`   Error Rate Diff:   ${comparison.errorRateDiff}% (Kafka is better by this amount)`);
    console.log(`   Latency Improve:   ${comparison.latencyImprovement}% faster`);

    console.log('\n💰 BUSINESS IMPACT:');
    const restRevenueLost = (rest.errorCount * 0.05 * 25);
    const kafkaRevenueLost = (kafka.errorCount * 0.05 * 25);
    console.log(`   REST Lost:         $${restRevenueLost.toFixed(2)}`);
    console.log(`   Kafka Lost:        $${kafkaRevenueLost.toFixed(2)}`);
    console.log(`   💵 Savings:         $${(restRevenueLost - kafkaRevenueLost).toFixed(2)}`);

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Run "npm run generate-visuals" to create LinkedIn graphics!');
    console.log('═'.repeat(80));
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    this.k6Processes.forEach(proc => {
      if (!proc.killed) {
        proc.kill();
      }
    });
  }
}

async function main() {
  const runner = new K6ExperimentRunner();

  console.log('═'.repeat(80));
  console.log('🚀 REST vs KAFKA - Automated Experiment');
  console.log('═'.repeat(80));
  console.log('\n📋 Experiment Plan:');
  console.log(`   • Phase 1: Warmup + Normal (0-${CONFIG.crashAt}s)`);
  console.log(`   • Phase 2: Database CRASH (${CONFIG.crashAt}s)`);
  console.log(`   • Phase 3: Degraded Mode (${CONFIG.crashAt}-${CONFIG.restoreAt}s)`);
  console.log(`   • Phase 4: Database RESTORE (${CONFIG.restoreAt}s)`);
  console.log(`   • Phase 5: Recovery (${CONFIG.restoreAt}s - end)`);
  console.log('\n');

  // Pre-flight checks
  if (!await runner.checkK6Installed()) {
    process.exit(1);
  }

  if (!await runner.checkServicesRunning()) {
    console.error('\n❌ Please start all services first:');
    console.error('   Terminal 1: npm run start:rest');
    console.error('   Terminal 2: npm run start:kafka');
    console.error('   Terminal 3: npm run start:consumer');
    process.exit(1);
  }

  // Schedule database chaos
  runner.scheduleDatabaseChaos();

  // Run tests in parallel
  try {
    await Promise.all([
      runner.runK6Test('rest'),
      runner.runK6Test('kafka'),
    ]);

    await runner.generateComparison();
    runner.printSummary();
  } catch (err) {
    console.error('\n❌ Experiment failed:', err);
    await runner.cleanup();
    process.exit(1);
  }

  await runner.cleanup();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { K6ExperimentRunner };
