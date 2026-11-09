/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node verification. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');

/** Run only after building this checkout. No database or provider is contacted. */
async function checkProduction() {
  const root = path.resolve(__dirname, '..');
  execFileSync(process.execPath, [path.join(__dirname, 'verify-runtime.cjs')], { cwd: root, stdio: 'pipe' });
  assert.ok(fs.existsSync(path.join(root, '.next/BUILD_ID')), 'Run npm run build first');
  const port = await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const { port: selected } = socket.address();
      socket.close(() => resolve(selected));
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  const env = { ...process.env, NODE_ENV: 'production', NEXTAUTH_SECRET: randomUUID(), NEXTAUTH_URL: origin,
    NEXT_PUBLIC_APP_URL: origin, NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of Object.keys(env)) {
    if (key === 'DATABASE_URL' || /^(STRIPE_|PAYPAL_|TABBY_|TAMARA_)/.test(key)) delete env[key];
  }
  // A benign SVG disguised as PNG exercises content sniffing, not an exploit.
  const uploads = path.join(root, 'public/uploads');
  fs.mkdirSync(uploads, { recursive: true });
  const fixtureName = `_kq-image-check-${randomUUID()}.png`;
  const fixture = path.join(uploads, fixtureName);
  fs.writeFileSync(fixture, '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="gold"/></svg>', { flag: 'wx' });
  const app = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  const results = [];
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Local server readiness timed out')), 60_000);
      const observe = chunk => {
        logs = (logs + chunk).slice(-8000);
        if (/Ready in/.test(logs)) { clearTimeout(timer); resolve(); }
      };
      app.stdout.on('data', observe);
      app.stderr.on('data', observe);
      app.once('error', error => { clearTimeout(timer); reject(error); });
      app.once('exit', code => { clearTimeout(timer); reject(new Error(`Local server exited: ${code}`)); });
    });
    const cases = [
      ['/api/mobile/checkout', 'POST', { userId: 'victim', courseId: 'course', paymentType: 'online' }, 401],
      ['/api/checkout/gateway', 'POST', { courseId: 'course', provider: 'STRIPE' }, 401],
      ['/api/livekit?room=arbitrary&username=teacher', 'GET', null, 401],
      ['/api/mobile/courses', 'POST', { title: 'Unauthorized course' }, 401],
      ['/api/admin/settings', 'GET', null, 401],
      ['/api/admin/payments/approve', 'POST', { paymentId: 'payment' }, 401],
      ['/api/admin/users/victim', 'PUT', { role: 'ADMIN' }, 403],
      ['/api/webhooks/payments/stripe', 'POST', { type: 'checkout.session.completed', data: { object: { id: 'forged' } } }, 401],
    ];
    for (const [route, method, body, expected] of cases) {
      const response = await fetch(origin + route, { method, signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', Origin: origin },
        ...(body === null ? {} : { body: JSON.stringify(body) }) });
      assert.equal(response.status, expected, `${method} ${route}`);
      await response.arrayBuffer();
      results.push({ route, method, status: response.status });
    }
    for (const source of ['/file.svg', `/uploads/${fixtureName}`]) {
      const url = new URL('/_next/image', origin);
      url.search = new URLSearchParams({ url: source, w: '64', q: '75' }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      assert.equal(response.status, 400, `SVG content must be rejected: ${source}`);
      await response.arrayBuffer();
      results.push({ check: source === '/file.svg' ? 'SVG rejected' : 'SVG disguised as PNG rejected', status: response.status });
    }
    const image = await fetch(`${origin}/_next/image?url=%2Flogo.png&w=64&q=75`, {
      headers: { Accept: 'image/webp' }, signal: AbortSignal.timeout(15_000),
    });
    assert.equal(image.status, 200, 'Raster image optimization remains available');
    assert.match(image.headers.get('content-type'), /^image\/(png|webp|jpeg)/);
    assert.ok((await image.arrayBuffer()).byteLength > 0);
    results.push({ check: 'Raster optimization', status: image.status });

    const lesson = await fetch(`${origin}/courses/package-verification/learn`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const csp = lesson.headers.get('content-security-policy') ?? '';
    assert.match(csp, /frame-src 'self' https:\/\/iframe\.mediadelivery\.net https:\/\/player\.mediadelivery\.net;/);
    assert.ok(!csp.includes('*'), 'Bunny iframe policy must stay restricted');
    if (lesson.status >= 300 && lesson.status < 400) {
      assert.equal(new URL(lesson.headers.get('location'), origin).pathname, '/login');
      await lesson.arrayBuffer();
    } else {
      assert.equal(lesson.status, 200);
      const html = await lesson.text();
      assert.match(html, /http-equiv="refresh"[^>]*\/login/);
      assert.doesNotMatch(html, /<iframe/i);
    }
    results.push({ check: 'Anonymous lesson redirect and Bunny CSP', status: lesson.status });
    return { node: process.version, platform: process.platform, databaseConfigured: false, providerCredentialsConfigured: false, passed: results.length, results };
  } finally {
    if (app.exitCode === null && app.signalCode === null) {
      const closed = new Promise(resolve => app.once('exit', resolve));
      app.kill();
      await closed;
    }
    fs.unlinkSync(fixture);
  }
}

checkProduction().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
