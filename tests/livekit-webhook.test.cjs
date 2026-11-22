/* eslint-disable @typescript-eslint/no-require-imports */
// LiveKit webhook: signature required, join enforcement, retry-safe failures.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

function harness({ verify = true, enforceError = null } = {}) {
  const joins = [];
  class WebhookReceiver {
    constructor(key, secret) { this.ok = key === 'k' && secret === 's'; }
    async receive(body, auth) {
      if (!verify || !this.ok || auth !== 'signed') throw new Error('invalid');
      return JSON.parse(body);
    }
  }
  const route = loadTs('../src/app/api/livekit/webhook/route.ts', {
    'livekit-server-sdk': { WebhookReceiver },
    '@/lib/live-classroom': { enforceJoin: async (room, identity) => { if (enforceError) throw enforceError; joins.push([room, identity]); return true; } },
  });
  const post = (event, auth = 'signed') => route.POST(new Request('https://academy.test/api/livekit/webhook', {
    method: 'POST', headers: auth ? { authorization: auth } : {}, body: JSON.stringify(event) }));
  return { post, joins };
}

test.beforeEach(() => { process.env.LIVEKIT_API_KEY = 'k'; process.env.LIVEKIT_API_SECRET = 's'; });

test('only correctly signed webhooks are processed; participant_joined triggers seat enforcement', async () => {
  const h = harness();
  const joined = { event: 'participant_joined', room: { name: 'live_c1' }, participant: { identity: 's2' } };
  assert.equal((await h.post(joined)).status, 200);
  assert.deepEqual(h.joins, [['live_c1', 's2']]);
  assert.equal((await h.post({ event: 'room_finished', room: { name: 'live_c1' } })).status, 200);
  assert.equal(h.joins.length, 1, 'other events are acknowledged without action');
  assert.equal((await h.post(joined, 'forged')).status, 401);
  assert.equal((await h.post(joined, null)).status, 401);
  assert.equal(h.joins.length, 1);
});

test('missing keys fail closed and a processing failure asks LiveKit to retry', async () => {
  const h = harness({ enforceError: new Error('db down') });
  const orig = console.error; console.error = () => {};
  try { assert.equal((await h.post({ event: 'participant_joined', room: { name: 'live_c1' }, participant: { identity: 's2' } })).status, 503); }
  finally { console.error = orig; }
  delete process.env.LIVEKIT_API_SECRET;
  assert.equal((await harness().post({ event: 'participant_joined' })).status, 503);
});
