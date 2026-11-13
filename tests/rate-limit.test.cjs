/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const limiter = () => loadTs('../src/lib/rate-limit.ts');
const req = headers => new Request('https://academy.test/api/courses/search?q=x', { headers });

test('a burst is allowed, then requests are refused with Retry-After, then the bucket refills', () => {
  const { consume } = limiter();
  const rule = { name: 't', burst: 3, perMinute: 60 };
  const t0 = 1_000_000;
  assert.deepEqual([1, 2, 3].map(() => consume(rule, 'ip', t0).allowed), [true, true, true]);
  const refused = consume(rule, 'ip', t0);
  assert.equal(refused.allowed, false);
  assert.equal(refused.retryAfter, 1);                 // 60/min = one token per second
  assert.equal(consume(rule, 'ip', t0 + 999).allowed, false);
  assert.equal(consume(rule, 'ip', t0 + 2_000).allowed, true);
  // Another visitor and another rule have their own buckets.
  assert.equal(consume(rule, 'other-ip', t0).allowed, true);
  assert.equal(consume({ ...rule, name: 'u' }, 'ip', t0).allowed, true);
});

test('real people never reach the search or verification limits', () => {
  const { consume, RATE_RULES } = limiter();
  // A fast typist: one search and one suggestion request every second for five minutes.
  let refused = 0;
  for (let s = 0; s < 300; s++) {
    if (!consume(RATE_RULES.search, 'typist', s * 1000).allowed) refused++;
    if (!consume(RATE_RULES.suggest, 'typist', s * 1000 + 300).allowed) refused++;
  }
  assert.equal(refused, 0);
  // Thirty people behind one carrier NAT each check a certificate within a minute.
  let ok = 0;
  for (let i = 0; i < 30; i++) if (consume(RATE_RULES.verify, 'shared-nat', i * 2000).allowed) ok++;
  assert.equal(ok, 30);
});

test('bulk enumeration of certificate numbers is throttled', () => {
  const { consume, RATE_RULES } = limiter();
  let allowed = 0;
  for (let i = 0; i < 1000; i++) if (consume(RATE_RULES.verify, 'scraper', i * 10).allowed) allowed++;   // 1000 lookups in 10 s
  assert.ok(allowed <= RATE_RULES.verify.burst + 7, `allowed ${allowed}`);
});

test('the client IP comes from the proxy, and a forged left-most X-Forwarded-For cannot pick the bucket', () => {
  const { clientIp } = limiter();
  assert.equal(clientIp(req({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.1.1.1, 203.0.113.7' }).headers), '203.0.113.7');
  assert.equal(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 198.51.100.4' }).headers), '198.51.100.4');
  assert.equal(clientIp(req({}).headers), 'direct');
});

test('limitRequest answers 429 with an Arabic message and Retry-After; success passes through', async () => {
  const { limitRequest } = limiter();
  const rule = { name: 'http', burst: 1, perMinute: 6 };
  assert.equal(limitRequest(req({ 'x-real-ip': '192.0.2.1' }), rule), null);
  const res = limitRequest(req({ 'x-real-ip': '192.0.2.1' }), rule);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), '10');
  assert.match((await res.json()).error, /طلبات كثيرة/);
});
