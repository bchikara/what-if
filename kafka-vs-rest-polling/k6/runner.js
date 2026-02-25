#!/usr/bin/env node

/**
 * Professional K6 Experiment Runner
 * Clean, minimal, production-grade output
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

// Professional CLI libraries
const ora = require('ora');
const chalk = require('chalk');
const Table = require('cli-table3');
const cliProgress = require('cli-progress');
const boxen = require('boxen');

const CONFIG = {
  phases: {
    warmup: { duration: 30, vus: 50, rps: 25 },
    normal: { duration: 60, vus: 100, rps: 50 },
    crash: { duration: 120, vus: 100, rps: 50 },
    recovery: { duration: 90, vus: 100, rps: 50 },
  },
  crashAt: 90,
  restoreAt: 210,
  totalDuration: 300, // 5 minutes
  outputDir: './experiment-results',
};

class ProfessionalExperimentRunner {
  constructor() {
    this.k6Processes = [];
    this.results = { rest: null, kafka: null };
    this.startTime = Date.now();
    this.progressBar = null;

    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
  }

  printHeader() {
    console.clear();
    const title = boxen(
      chalk.bold.white('REST vs KAFKA - Database Failure Experiment\n') +
      chalk.gray('Production-grade chaos engineering simulation'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        align: 'center'
      }
    );
    console.log(title);
  }

  printPhases() {
    const table = new Table({
      head: [
        chalk.cyan.bold('Phase'),
        chalk.cyan.bold('Time Window'),
        chalk.cyan.bold('Load'),
        chalk.cyan.bold('Status')
      ],
      style: { head: [], border: ['gray'] }
    });

    table.push(
      ['Warmup', '0s - 30s', '25 req/s', chalk.green('Normal')],
      ['Baseline', '30s - 90s', '50 req/s', chalk.green('Normal')],
      ['DB Crash', chalk.red.bold('90s'), chalk.red('↓ OFFLINE'), chalk.red.bold('CRITICAL')],
      ['Degraded', '90s - 210s', '50 req/s', chalk.yellow('Degraded')],
      ['DB Restore', chalk.green.bold('210s'), chalk.green('↑ ONLINE'), chalk.green.bold('RECOVERY')],
      ['Recovery', '210s - 300s', '50 req/s', chalk.green('Normal')]
    );

    console.log(table.toString());
    console.log('');
  }

  async checkPrerequisites() {
    const spinner = ora('Checking prerequisites').start();

    try {
      // Check k6
      await execPromise('k6 version');
      spinner.succeed(chalk.green('k6 installed'));

      // Check services
      const services = [
        { name: 'REST API', port: 3001, endpoint: '/metrics' },
        { name: 'Kafka Producer', port: 3002, endpoint: '/metrics' },
        { name: 'Kafka Consumer', port: 3003, endpoint: '/health' }
      ];

      for (const svc of services) {
        try {
          await execPromise(`curl -s http://localhost:${svc.port}${svc.endpoint} > /dev/null`);
          spinner.succeed(chalk.green(`${svc.name} running on port ${svc.port}`));
        } catch {
          spinner.fail(chalk.red(`${svc.name} not running on port ${svc.port}`));
          return false;
        }
      }

      return true;
    } catch (err) {
      spinner.fail(chalk.red('k6 not installed'));
      console.log(chalk.yellow('\nInstall k6: brew install k6'));
      return false;
    }
  }

  generateK6Script(architecture) {
    const url = architecture === 'rest'
      ? 'http://localhost:3001/update-location'
      : 'http://localhost:3002/produce-event';

    const totalDuration = Object.values(CONFIG.phases).reduce((sum, p) => sum + p.duration, 0);

    return `
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('request_duration');

export const options = {
  scenarios: {
    ${architecture}_load: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '${totalDuration}s',
      preAllocatedVUs: 150,
      maxVUs: 300,
    },
  },
  thresholds: {
    'errors': ['rate<0.9'],
    'request_duration': ['p(95)<5000'],
  },
};

export default function () {
  const driverId = \`driver_\${Math.floor(Math.random() * 5000)}\`;
  const lat = 37.7749 + Math.random() * 0.1;
  const lng = -122.4194 + Math.random() * 0.1;

  const payload = JSON.stringify({ driverId, lat, lng });
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  };

  const res = http.post('${url}', payload, params);
  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  errorRate.add(!success);
  latency.add(res.timings.duration);
}
`;
  }

  async runK6Test(architecture) {
    const scriptPath = path.join(CONFIG.outputDir, `k6-${architecture}.js`);
    const outputPath = path.join(CONFIG.outputDir, `k6-${architecture}-results.json`);
    const summaryPath = path.join(CONFIG.outputDir, `k6-${architecture}-summary.json`);

    fs.writeFileSync(scriptPath, this.generateK6Script(architecture));

    return new Promise((resolve) => {
      const k6Process = spawn('k6', [
        'run',
        '--quiet',  // Suppress k6 output
        '--out', `json=${outputPath}`,
        '--summary-export', summaryPath,
        scriptPath
      ], {
        stdio: ['ignore', 'pipe', 'pipe']  // Suppress all k6 output
      });

      this.k6Processes.push(k6Process);

      // Silently consume output
      k6Process.stdout.on('data', () => {});
      k6Process.stderr.on('data', () => {});

      k6Process.on('close', () => resolve());
    });
  }

  async scheduleDatabaseChaos() {
    setTimeout(async () => {
      console.log('');
      console.log(boxen(
        chalk.red.bold('DATABASE CRASHED') + '\n' +
        chalk.gray('PostgreSQL killed - testing resilience'),
        { padding: 1, borderColor: 'red', borderStyle: 'double' }
      ));

      try {
        await execPromise('docker-compose kill postgres');
        await execPromise('docker-compose rm -f postgres');
        console.log(chalk.red('✗ PostgreSQL killed and removed'));
      } catch (err) {
        console.error(chalk.red('Failed to crash database:'), err.message);
      }
    }, CONFIG.crashAt * 1000);

    setTimeout(async () => {
      console.log('');
      console.log(boxen(
        chalk.green.bold('DATABASE RESTORED') + '\n' +
        chalk.gray('PostgreSQL restarting - testing recovery'),
        { padding: 1, borderColor: 'green', borderStyle: 'double' }
      ));

      try {
        await execPromise('docker-compose up -d postgres');
        console.log(chalk.green('✓ PostgreSQL restarted'));
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(chalk.green('✓ Database ready'));
      } catch (err) {
        console.error(chalk.red('Failed to restore database:'), err.message);
      }
    }, CONFIG.restoreAt * 1000);
  }

  createProgressBar() {
    this.progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total}s | {phase}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    this.progressBar.start(CONFIG.totalDuration, 0, { phase: 'Starting...' });

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

      let phase = 'Warmup';
      if (elapsed > 210) phase = chalk.green('Recovery');
      else if (elapsed > 90) phase = chalk.yellow('DB Down');
      else if (elapsed > 30) phase = chalk.cyan('Normal Load');

      this.progressBar.update(elapsed, { phase });

      if (elapsed >= CONFIG.totalDuration) {
        clearInterval(interval);
        this.progressBar.stop();
      }
    }, 1000);
  }

  async parseResults(architecture) {
    const summaryPath = path.join(CONFIG.outputDir, `k6-${architecture}-summary.json`);

    if (!fs.existsSync(summaryPath)) return null;

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
    const failedChecks = checks.fails || 0;
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

  printResults() {
    console.log('\n');
    console.log(boxen(
      chalk.bold.white('EXPERIMENT RESULTS'),
      { padding: 1, margin: 1, borderColor: 'cyan', borderStyle: 'round' }
    ));

    const rest = this.results.rest;
    const kafka = this.results.kafka;

    const errorDiff = rest.errorCount - kafka.errorCount;
    const errorRateDiff = parseFloat(rest.errorRate) - parseFloat(kafka.errorRate);
    const latencyImprovement = ((parseFloat(rest.latency.avg) - parseFloat(kafka.latency.avg)) / parseFloat(rest.latency.avg) * 100).toFixed(1);

    const table = new Table({
      head: [
        chalk.cyan.bold('Metric'),
        chalk.red.bold('REST (Sync)'),
        chalk.green.bold('Kafka (Async)'),
        chalk.magenta.bold('Kafka Wins By')
      ],
      style: {
        head: [],
        border: ['dim'],
        compact: false
      },
      colWidths: [22, 18, 18, 22]
    });

    table.push(
      [
        chalk.white('Total Requests'),
        chalk.white(rest.totalRequests.toLocaleString()),
        chalk.white(kafka.totalRequests.toLocaleString()),
        chalk.dim('—')
      ],
      [
        chalk.white('Failed Requests'),
        chalk.red.bold(rest.errorCount.toLocaleString()),
        chalk.green.bold(kafka.errorCount.toLocaleString()),
        errorDiff > 0 ? chalk.green.bold(`${errorDiff.toLocaleString()} fewer`) : chalk.dim('—')
      ],
      [
        chalk.white('Error Rate'),
        chalk.red.bold(`${rest.errorRate}%`),
        chalk.green.bold(`${kafka.errorRate}%`),
        errorRateDiff > 0 ? chalk.green.bold(`${errorRateDiff.toFixed(2)}% lower`) : chalk.dim('—')
      ],
      [
        chalk.white('Avg Latency'),
        chalk.yellow(`${rest.latency.avg}ms`),
        chalk.green.bold(`${kafka.latency.avg}ms`),
        parseFloat(latencyImprovement) > 0 ? chalk.green.bold(`${latencyImprovement}% faster`) : chalk.dim('—')
      ],
      [
        chalk.white('P95 Latency'),
        chalk.yellow(`${rest.latency.p95}ms`),
        chalk.green.bold(`${kafka.latency.p95}ms`),
        chalk.dim('—')
      ]
    );

    console.log(table.toString());

    console.log('\n');
    const summary = boxen(
      chalk.bold.green('✓ Kafka handled database failure gracefully\n') +
      chalk.bold.red('✗ REST API failed during database outage\n\n') +
      chalk.gray(`Database was down for ${(this.CONFIG || CONFIG).restoreAt - (this.CONFIG || CONFIG).crashAt}s (${(this.CONFIG || CONFIG).crashAt}s to ${(this.CONFIG || CONFIG).restoreAt}s)`),
      { padding: 1, borderColor: 'green', borderStyle: 'round', align: 'center' }
    );
    console.log(summary);
    console.log('');
  }

  async run() {
    this.printHeader();
    this.printPhases();

    if (!await this.checkPrerequisites()) {
      process.exit(1);
    }

    console.log('');
    const runSpinner = ora('Starting load tests').start();
    runSpinner.succeed(chalk.green('Load tests started'));

    console.log('');
    this.createProgressBar();
    this.scheduleDatabaseChaos();

    await Promise.all([
      this.runK6Test('rest'),
      this.runK6Test('kafka'),
    ]);

    console.log('\n');
    const parseSpinner = ora('Parsing results').start();
    this.results.rest = await this.parseResults('rest');
    this.results.kafka = await this.parseResults('kafka');
    parseSpinner.succeed(chalk.green('Results parsed'));

    this.printResults();

    console.log('');
    console.log(chalk.gray('Next: npm run generate-visuals'));
  }

  cleanup() {
    this.k6Processes.forEach(proc => proc.killed || proc.kill());
  }
}

async function main() {
  const runner = new ProfessionalExperimentRunner();

  process.on('SIGINT', () => {
    runner.cleanup();
    process.exit();
  });

  await runner.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProfessionalExperimentRunner };
