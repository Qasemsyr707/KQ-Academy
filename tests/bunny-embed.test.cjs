/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');
const { loadTs } = require('./load-ts.cjs');

const { parseBunnyEmbed } = loadTs('../src/lib/bunny-embed.ts');
const VIDEO = '11111111-2222-3333-4444-555555555555';
const EMBED = `https://iframe.mediadelivery.net/embed/123/${VIDEO}`;

test('official current and legacy Bunny player URLs normalize with supported player options', () => {
  const parsed = parseBunnyEmbed(EMBED.replace('iframe.', 'player.') + '?autoplay=0&muted=true&captions=en-auto&t=1h20m45s&showSpeed=1&nativeHls=auto&responsive=true');
  assert.equal(parsed.videoId, VIDEO);
  assert.equal(parsed.libraryId, '123');
  const url = new URL(parsed.url);
  assert.equal(url.origin, 'https://iframe.mediadelivery.net');
  for (const [key, value] of Object.entries({ autoplay: '0', muted: 'true', captions: 'en-auto', t: '1h20m45s', showSpeed: '1', nativeHls: 'auto', responsive: 'true' })) {
    assert.equal(url.searchParams.get(key), value);
  }
  assert.equal(parseBunnyEmbed(EMBED.replace('/embed/', '/play/')).url, EMBED);
  for (const start of ['30s', '20m', '1h', '1h20m', '01:20:45', '30.5']) {
    assert.equal(new URL(parseBunnyEmbed(EMBED + '?t=' + start).url).searchParams.get('t'), start);
  }
});

test('only a trusted iframe src is extracted; HTML, old tokens and unknown parameters are never saved', () => {
  const parsed = parseBunnyEmbed(`<div style="position:relative"><iframe src="${EMBED}?autoplay=false&amp;token=expired&amp;expires=123&amp;redirect=https://evil.test" onload="alert(1)" allowfullscreen></iframe></div>`);
  assert.equal(parsed.url, EMBED + '?autoplay=false');
  assert.equal(parseBunnyEmbed(`<iframe srcdoc="<script>" src="${EMBED}"></iframe>`), null);
  assert.equal(parseBunnyEmbed(`<iframe src="${EMBED}" src="https://evil.test"></iframe>`), null);
  assert.equal(parseBunnyEmbed(`<iframe src="${EMBED}"></iframe><iframe src="${EMBED}"></iframe>`), null);
});

test('host, protocol, path and identity tricks cannot reach a Bunny iframe', () => {
  for (const input of ['', null, {}, 'javascript:alert(1)', '//iframe.mediadelivery.net/embed/123/' + VIDEO,
    EMBED.replace('https:', 'http:'), EMBED.replace('.net', '.net.evil.test'),
    EMBED.replace('iframe.', 'evil.'), EMBED.replace('iframe.', 'user@iframe.'),
    EMBED.replace('.net/', '.net:444/'), EMBED.replace('.net/', '.net./'),
    EMBED.replace(VIDEO, 'invalid'), EMBED + '/extra', EMBED + '#fragment',
    EMBED.replace('/123/', '/0/'), EMBED.replace('https://', 'https:\\'),
    `<iframe src="https://evil.test/${EMBED}"></iframe>`]) {
    assert.equal(parseBunnyEmbed(input), null, String(input));
  }
});

function signer(t, env = {}) {
  const keys = ['BUNNY_LIBRARY_ID', 'BUNNY_STREAM_TOKEN_AUTH_KEY', 'BUNNY_STREAM_TOKEN_AUTH_ENABLED'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  t.after(() => { for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } });
  class BunnyServerError extends Error { constructor(status, message) { super(message); this.status = status; } }
  return loadTs('../src/lib/bunny-playback.ts', { '@/lib/bunny-upload-server': { BunnyServerError } }).getBunnyPlaybackUrl;
}

test('server signer follows Bunny SHA256 key + video ID + Unix seconds, discarding pasted expired tokens', t => {
  t.mock.method(Date, 'now', () => 1_800_000_000_000);
  const getUrl = signer(t, { BUNNY_LIBRARY_ID: '123', BUNNY_STREAM_TOKEN_AUTH_KEY: 'test-only-embed-key' });
  const url = new URL(getUrl(EMBED + '?token=old&expires=1&autoplay=false'));
  assert.equal(url.searchParams.get('expires'), '1800003600');
  assert.equal(url.searchParams.get('token'), createHash('sha256').update('test-only-embed-key' + VIDEO + '1800003600').digest('hex'));
  assert.equal(url.searchParams.get('autoplay'), 'false');
  assert.ok(!url.toString().includes('test-only-embed-key'));
});

test('signer fails closed for enabled authentication without key and foreign libraries', t => {
  const getUrl = signer(t, { BUNNY_LIBRARY_ID: '123', BUNNY_STREAM_TOKEN_AUTH_ENABLED: 'true' });
  assert.throws(() => getUrl(EMBED), error => error.status === 503);
  assert.throws(() => getUrl(EMBED.replace('/123/', '/999/')), error => error.status === 503);
});

test('unsigned libraries retain safe embeds and legacy local files', t => {
  const getUrl = signer(t, { BUNNY_LIBRARY_ID: '123' });
  assert.equal(getUrl(EMBED + '?token=stale&expires=1'), EMBED);
  assert.equal(getUrl('/uploads/existing.mp4'), '/uploads/existing.mp4');
  assert.throws(() => getUrl(EMBED.replace('.net', '.net.evil.test')), error => error.status === 400);
});
