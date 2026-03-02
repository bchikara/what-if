import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const checkDuration = new Trend('check_duration');
const dbFallbacks = new Counter('db_fallbacks');
const falsePositives = new Counter('false_positives');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '60s', target: 500 },
    { duration: '120s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10'],
    errors: ['rate<0.1'],
  },
};

function generateUsername() {
  const random = Math.random();
  if (random < 0.9) {
    // 90% - Usernames that definitely DON'T exist (won't match seed pattern)
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    return `testuser_${timestamp}_${randomNum}`;
  } else {
    // 10% - Usernames that might exist (match seed pattern)
    const prefixes = ['user', 'dev', 'admin', 'test', 'demo', 'cool', 'super', 'pro', 'elite', 'master'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(Math.random() * 10000000);
    return `${prefix}${num}`;
  }
}

export default function () {
  const username = generateUsername();
  const payload = JSON.stringify({ username });
  const params = { headers: { 'Content-Type': 'application/json' } };

  const start = Date.now();
  const res = http.post('http://localhost:3003/check-username', payload, params);
  const duration = Date.now() - start;

  checkDuration.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has username': (r) => JSON.parse(r.body).username !== undefined,
    'response has available field': (r) => JSON.parse(r.body).available !== undefined,
  });

  errorRate.add(!success);

  if (success) {
    const body = JSON.parse(res.body);
    if (body.databaseQueried) {
      dbFallbacks.add(1);
    }
    if (body.falsePositive) {
      falsePositives.add(1);
    }
  }

  sleep(0.01);
}
