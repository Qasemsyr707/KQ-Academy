/* eslint-disable @typescript-eslint/no-require-imports */
// KQ Classroom Pro: the LiveKit RoomService calls behind each moderation action (src/lib/live-classroom.ts).
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const TrackSource = { CAMERA: 1, MICROPHONE: 2, SCREEN_SHARE: 3, SCREEN_SHARE_AUDIO: 4 };

function harness({ actor = { id: 'teacher-1', role: 'INSTRUCTOR' }, settings = {}, seats = {}, connected = ['s1', 's2'], livekit = true, deleteError = null } = {}) {
  const calls = [];
  const db = {
    session: { id: 'c1', status: 'live', instructorId: 'teacher-1', locked: false, waitingRoom: false, chatEnabled: true, reactionsEnabled: true, screenShareAllowed: true,
      course: { id: 'course-1', instructorId: 'teacher-1' }, ...settings },
    seats: { s1: { status: 'admitted', role: 'student' }, s2: { status: 'admitted', role: 'student' }, ...seats },
    audit: [],
  };
  class RoomServiceClient {
    constructor(url, key, secret) { calls.push(['client', url, !!key, !!secret]); }
    async listParticipants(room) {
      return connected.map(identity => ({ identity, room, tracks: [{ sid: `${identity}-mic`, muted: false }, { sid: `${identity}-cam`, muted: true }],
        permission: { canPublish: true, canPublishSources: [2, 1, 3, 4], canPublishData: true } }));
    }
    async updateParticipant(room, identity, metadata, permission) { calls.push(['update', room, identity, permission]); }
    async mutePublishedTrack(room, identity, sid, muted) { calls.push(['mute', room, identity, sid, muted]); }
    async removeParticipant(room, identity) { calls.push(['remove', room, identity]); }
    async updateRoomMetadata(room, metadata) { calls.push(['metadata', room, JSON.parse(metadata)]); }
    async deleteRoom(room) { calls.push(['delete', room]); if (deleteError) throw deleteError; }
    async sendData(room, data, kind, options) { calls.push(['send', room, JSON.parse(new TextDecoder().decode(data)), kind, options]); }
  }
  const key = where => where.liveClassId_userId.userId;
  const prisma = {
    liveClass: {
      findUnique: async ({ where }) => (where.id === 'c1' ? db.session : null),
      update: async ({ data }) => Object.assign(db.session, data),
    },
    liveClassParticipant: {
      findUnique: async ({ where }) => db.seats[key(where)] ?? null,
      findMany: async ({ where }) => Object.entries(db.seats).filter(([, s]) => !where.status || s.status === where.status).map(([userId, s]) => ({ userId, user: { name: userId }, handRaisedAt: null, removedReason: null, firstJoinedAt: null, ...s })),
      update: async ({ where, data }) => Object.assign(db.seats[key(where)], data),
      upsert: async ({ where, update, create }) => { db.seats[key(where)] = db.seats[key(where)] ? Object.assign(db.seats[key(where)], update) : { ...create }; return db.seats[key(where)]; },
      count: async ({ where }) => (db.seats[where.userId] ? 1 : 0),
    },
    user: { findUnique: async ({ where }) => (where.id.startsWith('s') ? { id: where.id, role: 'STUDENT', isBanned: false, name: `Student ${where.id}` } : { id: where.id, role: 'INSTRUCTOR', isBanned: false, name: 'Teacher' }) },
    enrollment: { findUnique: async () => ({ id: 'e' }) },
    liveClassAuditLog: { create: async ({ data }) => { db.audit.push(data); return data; }, findMany: async () => [] },
  };
  if (livekit) { process.env.LIVEKIT_API_KEY = 'k'; process.env.LIVEKIT_API_SECRET = 's'; process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://lk.example.invalid'; }
  else { delete process.env.LIVEKIT_API_SECRET; }
  const lib = loadTs('../src/lib/live-classroom.ts', {
    'livekit-server-sdk': { RoomServiceClient, TrackSource, DataPacket_Kind: { RELIABLE: 0 } }, '@/lib/db': { prisma },
    '@/lib/permission-check': { hasPermission: async () => true },
    '@/lib/rate-limit': { consume: () => ({ allowed: true, retryAfter: 0 }) },
  });
  return { lib, calls, db, act: body => lib.moderate(actor, 'c1', body) };
}

test('grant sets exactly the requested sources on LiveKit, keeps metadata locked and clears the raised hand', async () => {
  const h = harness({ seats: { s1: { status: 'admitted', role: 'student', handRaisedAt: new Date() } } });
  await h.act({ action: 'grant', userId: 's1', media: 'camera' });
  const update = h.calls.find(c => c[0] === 'update');
  assert.equal(update[1], 'live_c1');
  assert.deepEqual(update[3].canPublishSources, [2, 1]);
  assert.equal(update[3].canPublish, true);
  assert.equal(update[3].canUpdateMetadata, false);
  assert.equal(h.db.seats.s1.handRaisedAt, null);
  assert.equal(h.calls[0][1], 'https://lk.example.invalid');
});

test('revoke removes every source and mutes what is still live; mute only touches unmuted tracks', async () => {
  const h = harness();
  await h.act({ action: 'revoke', userId: 's1' });
  const update = h.calls.find(c => c[0] === 'update');
  assert.deepEqual(update[3].canPublishSources, []);
  assert.equal(update[3].canPublish, false);
  assert.deepEqual(h.calls.filter(c => c[0] === 'mute').map(c => c[3]), ['s1-mic']);
  const m = harness();
  await m.act({ action: 'mute', userId: 's2' });
  assert.deepEqual(m.calls.filter(c => c[0] === 'mute').map(c => [c[2], c[3], c[4]]), [['s2', 's2-mic', true]]);
});

test('mute all affects only students of this class, never the host', async () => {
  const h = harness({ connected: ['teacher-1', 's1', 's2'] });
  await h.act({ action: 'muteAll' });
  assert.deepEqual(h.calls.filter(c => c[0] === 'mute').map(c => c[2]).sort(), ['s1', 's2']);
});

test('remove disconnects the participant on LiveKit and stores the reason', async () => {
  const h = harness();
  assert.equal(await h.act({ action: 'remove', userId: 's2', reason: '  سبب واضح  ' }), 'تمت إزالة الطالب من الحصة');
  assert.deepEqual(h.calls.find(c => c[0] === 'remove'), ['remove', 'live_c1', 's2']);
  assert.equal(h.db.seats.s2.status, 'removed');
  assert.equal(h.db.seats.s2.removedReason, 'سبب واضح');
  assert.deepEqual(h.db.audit.at(-1), { liveClassId: 'c1', actorId: 'teacher-1', action: 'remove', targetUserId: 's2', detail: { reason: 'سبب واضح' } });
});

test('turning chat off changes no LiveKit permission (polls keep the data channel) and publishes trusted room settings', async () => {
  const h = harness({ seats: { s2: { status: 'admitted', role: 'assistant' } } });
  await h.act({ action: 'settings', chatEnabled: false });
  assert.equal(h.calls.filter(c => c[0] === 'update').length, 0);
  const meta = h.calls.find(c => c[0] === 'metadata');
  assert.equal(meta[2].kq, 1);
  assert.equal(meta[2].chatEnabled, false);
  assert.equal(h.db.session.chatEnabled, false);
});

test('disallowing screen share strips screen sources from students who already had them', async () => {
  const h = harness();
  await h.act({ action: 'settings', screenShareAllowed: false });
  for (const c of h.calls.filter(x => x[0] === 'update')) assert.deepEqual(c[3].canPublishSources, [2, 1]);
});

test('a student who is not connected cannot be granted media; without LiveKit nothing claims success', async () => {
  const h = harness({ connected: [] });
  await assert.rejects(h.act({ action: 'grant', userId: 's1', media: 'microphone' }), e => e.status === 404);
  const off = harness({ livekit: false });
  await assert.rejects(off.act({ action: 'mute', userId: 's1' }), e => e.status === 503);
  assert.equal(off.calls.length, 0);
});

test('ending deletes only this class room; a LiveKit failure is reported, an already-gone room counts as closed', async () => {
  const h = harness();
  assert.equal(await h.lib.closeLiveRoom('teacher-1', 'c1'), true);
  assert.deepEqual(h.calls.filter(c => c[0] === 'delete'), [['delete', 'live_c1']]);
  assert.deepEqual(h.db.audit.at(-1).detail, { roomClosed: true });
  const down = harness({ deleteError: Object.assign(new Error('unavailable'), { status: 503 }) });
  assert.equal(await down.lib.closeLiveRoom('teacher-1', 'c1'), false);
  assert.deepEqual(down.db.audit.at(-1).detail, { roomClosed: false });
  const gone = harness({ deleteError: Object.assign(new Error('not found'), { status: 404, code: 'not_found' }) });
  assert.equal(await gone.lib.closeLiveRoom('teacher-1', 'c1'), true);
});

test('chat, reactions and polls are independent: each switch blocks only its own kind, for students only', async () => {
  const student = { id: 's1', role: 'STUDENT' };
  const off = (settings) => harness({ actor: student, settings });
  // Chat off: student chat refused, reactions still relayed.
  let h = off({ chatEnabled: false });
  await assert.rejects(h.lib.relayMessage(student, 'c1', { kind: 'chat', text: 'hi' }), e => e.status === 403);
  await h.lib.relayMessage(student, 'c1', { kind: 'reaction', emoji: '👏' });
  // Reactions off: reactions refused, chat still relayed.
  h = off({ reactionsEnabled: false });
  await assert.rejects(h.lib.relayMessage(student, 'c1', { kind: 'reaction', emoji: '👏' }), e => e.status === 403);
  await h.lib.relayMessage(student, 'c1', { kind: 'chat', text: 'سؤال' });
  const sent = h.calls.filter(c => c[0] === 'send');
  assert.equal(sent.length, 1);
  assert.equal(sent[0][1], 'live_c1');
  assert.equal(sent[0][4].topic, 'kq-chat');
  assert.deepEqual({ from: sent[0][2].from, name: sent[0][2].name, msg: sent[0][2].msg, role: sent[0][2].role }, { from: 's1', name: 'Student s1', msg: 'سؤال', role: 'student' });
  // Host and assistant may still talk while chat is off; neither switch ever touched permissions.
  const host = harness({ settings: { chatEnabled: false } });
  await host.lib.relayMessage({ id: 'teacher-1', role: 'INSTRUCTOR' }, 'c1', { kind: 'chat', text: 'تنبيه' });
  assert.equal(host.calls.find(c => c[0] === 'send')[2].role, 'host');
  const assistant = harness({ actor: student, settings: { chatEnabled: false }, seats: { s1: { status: 'admitted', role: 'assistant' } } });
  await assistant.lib.relayMessage(student, 'c1', { kind: 'chat', text: 'مساعد' });
  assert.equal(assistant.calls.find(c => c[0] === 'send')[2].role, 'assistant');
});

test('relay refuses forged or unsafe messages and non-participants', async () => {
  const student = { id: 's1', role: 'STUDENT' };
  const h = harness({ actor: student });
  for (const body of [{ kind: 'chat', text: '   ' }, { kind: 'reaction', emoji: '<script>' }, { kind: 'admin' }, ['x'], null]) {
    await assert.rejects(h.lib.relayMessage(student, 'c1', body), e => e.status === 400, JSON.stringify(body));
  }
  const removed = harness({ actor: student, seats: { s1: { status: 'removed', role: 'student' } } });
  await assert.rejects(removed.lib.relayMessage(student, 'c1', { kind: 'chat', text: 'x' }), e => e.status === 403);
  const ended = harness({ actor: student, settings: { status: 'ended' } });
  await assert.rejects(ended.lib.relayMessage(student, 'c1', { kind: 'chat', text: 'x' }), e => e.status === 409);
  const long = harness({ actor: student });
  await long.lib.relayMessage(student, 'c1', { kind: 'chat', text: 'ب'.repeat(900) });
  assert.equal(long.calls.find(c => c[0] === 'send')[2].msg.length, 500);
});

test('the panel disconnects anyone connected whose seat was removed, denied or is still pending', async () => {
  const h = harness({ connected: ['s1', 's2', 's3', 'teacher-1'], seats: { s2: { status: 'removed', role: 'student' }, s3: { status: 'pending', role: 'student' } } });
  const state = await h.lib.classroomState({ id: 'teacher-1', role: 'INSTRUCTOR' }, 'c1');
  assert.deepEqual(h.calls.filter(c => c[0] === 'remove').map(c => c[2]).sort(), ['s2', 's3']);
  assert.equal(state.participants.find(p => p.userId === 's2').online, false);
  assert.equal(state.participants.find(p => p.userId === 's1').online, true);
});
