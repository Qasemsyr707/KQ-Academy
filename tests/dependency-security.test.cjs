/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire } = require('node:module');
const { inspectRuntime } = require('../scripts/verify-runtime.cjs');
const { loadTs } = require('./load-ts.cjs');

test('the installed runtime and Next image optimizer use patched packages, including every locked Sharp copy', () => {
  const report = inspectRuntime();
  assert.equal(report.ok, true, report.errors.join('\n'));
  const nextRequire = createRequire(require.resolve('next/dist/server/image-optimizer'));
  assert.equal(nextRequire('sharp').versions.sharp, report.nextImageOptimizerSharp.version);
  assert.equal(require('sharp').versions.sharp, report.packages.sharp.version);
});

test('native Sharp used by Next and the application can decode PNG, resize and encode JPEG on the running Node version', async () => {
  const nextRequire = createRequire(require.resolve('next/dist/server/image-optimizer'));
  for (const sharp of [require('sharp'), nextRequire('sharp')]) {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#112233' } }).png().toBuffer();
    const jpeg = await sharp(png).resize(7, 5).jpeg().toBuffer();
    const metadata = await sharp(jpeg).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 7);
    assert.equal(metadata.height, 5);
    assert.equal(metadata.channels, 3);
  }
});

test('provider keys and enable flags cannot reactivate course payment gateways disabled for security reasons', t => {
  const configured = {
    NEXT_PUBLIC_APP_URL: 'https://academy.test',
    STRIPE_SECRET_KEY: 'sk_test_unit_only', STRIPE_WEBHOOK_SECRET: 'whsec_unit_only',
    PAYPAL_CLIENT_ID: 'paypal-unit-only', PAYPAL_CLIENT_SECRET: 'paypal-unit-only', PAYPAL_WEBHOOK_ID: 'paypal-unit-only',
    TABBY_SECRET_KEY: 'sk_test_unit_only', TABBY_MERCHANT_CODE: 'tabby-unit-only', TABBY_WEBHOOK_SECRET: 'tabby-unit-only',
    TAMARA_MERCHANT_TOKEN: 'tamara-unit-only', TAMARA_NOTIFICATION_TOKEN: 'tamara-unit-only',
    ENABLE_PAYPAL: 'true', ENABLE_TABBY: 'true', ENABLE_TAMARA: 'true',
  };
  const original = Object.fromEntries(Object.keys(configured).map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  Object.assign(process.env, configured);
  globalThis.fetch = async () => { networkCalls++; throw new Error('Unexpected network request'); };
  t.after(() => {
    for (const key of Object.keys(configured)) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    globalThis.fetch = originalFetch;
  });
  const { checkoutAvailable } = loadTs('../src/lib/payments/availability.ts');
  for (const provider of ['PAYPAL', 'TABBY', 'TAMARA']) assert.equal(checkoutAvailable(provider), false);
  for (const provider of ['STRIPE', 'MANUAL', 'WALLET']) assert.equal(checkoutAvailable(provider), true);
  assert.equal(networkCalls, 0);
});
