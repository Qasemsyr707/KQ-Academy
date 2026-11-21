const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

function db({ users = {}, settings = {}, earnings = [] } = {}) {
  return {
    earnings,
    user: { findUnique: async ({ where }) => where.id ? users[where.id] ?? null : Object.values(users).find(u => u.affiliateCode === where.affiliateCode) ?? null },
    setting: { findUnique: async ({ where }) => (where.key in settings ? { key: where.key, value: settings[where.key] } : null) },
    affiliateEarning: { createMany: async ({ data, skipDuplicates }) => {
      assert.equal(skipDuplicates, true);
      if (earnings.some(e => e.sourceKey === data[0].sourceKey)) return { count: 0 };
      earnings.push(data[0]); return { count: 1 };
    } },
  };
}
const referrals = loadTs('../src/lib/referrals.ts');
const USERS = {
  ref: { id: 'ref', email: 'ref@example.invalid', isBanned: false, affiliateCode: 'REFCODE1' },
  buyer: { id: 'buyer', referredById: 'ref' },
  lonely: { id: 'lonely', referredById: null },
  banned: { id: 'banned', email: 'b@example.invalid', isBanned: true, affiliateCode: 'BANNED01' },
  victim: { id: 'victim', referredById: 'banned' },
};

test('attribution: a valid code of another, unbanned user; never self, never malformed', async () => {
  const d = db({ users: USERS });
  assert.equal(await referrals.resolveReferrer(d, 'REFCODE1', 'new@example.invalid'), 'ref');
  assert.equal(await referrals.resolveReferrer(d, 'REFCODE1', 'REF@example.invalid'), null, 'self referral by email');
  assert.equal(await referrals.resolveReferrer(d, 'BANNED01', 'new@example.invalid'), null, 'banned referrer');
  assert.equal(await referrals.resolveReferrer(d, 'nope', 'new@example.invalid'), null);
  assert.equal(await referrals.resolveReferrer(d, '<script>', 'new@example.invalid'), null);
  assert.equal(await referrals.resolveReferrer(d, undefined, 'new@example.invalid'), null);
});

test('commission: once per confirmed payment, configurable percent, USD conversion, no guessing', async () => {
  const d = db({ users: USERS, settings: { referralCommissionPercent: '12.5', exchangeRate: '15000' } });
  const usd = await referrals.recordReferralCommission(d, { sourceKey: 'payment:1', buyerId: 'buyer', amount: 40, currency: 'USD', courseId: 'c' });
  assert.deepEqual(usd, { amount: 5, percent: 12.5 });
  assert.equal(await referrals.recordReferralCommission(d, { sourceKey: 'payment:1', buyerId: 'buyer', amount: 40, currency: 'USD' }), null, 'replay is ignored');
  const syp = await referrals.recordReferralCommission(d, { sourceKey: 'payment:2', buyerId: 'buyer', amount: 300000, currency: 'SYP' });
  assert.equal(syp.amount, 2.5);
  assert.equal(d.earnings.length, 2);
  assert.equal(d.earnings[0].status, 'PENDING');
  assert.equal(d.earnings[0].ownerId, 'ref');
  assert.equal(await referrals.recordReferralCommission(d, { sourceKey: 'payment:3', buyerId: 'lonely', amount: 40, currency: 'USD' }), null, 'no referrer');
  assert.equal(await referrals.recordReferralCommission(d, { sourceKey: 'payment:4', buyerId: 'victim', amount: 40, currency: 'USD' }), null, 'banned referrer');
  assert.equal(await referrals.recordReferralCommission(d, { sourceKey: 'payment:5', buyerId: 'buyer', amount: -1, currency: 'USD' }), null);
  const noRate = db({ users: USERS });
  assert.equal(await referrals.recordReferralCommission(noRate, { sourceKey: 'payment:6', buyerId: 'buyer', amount: 300000, currency: 'SYP' }), null, 'no exchange rate: no invented USD value');
  const off = db({ users: USERS, settings: { referralCommissionPercent: '0' } });
  assert.equal(await referrals.recordReferralCommission(off, { sourceKey: 'payment:7', buyerId: 'buyer', amount: 40, currency: 'USD' }), null, 'programme off');
  const absurd = db({ users: USERS, settings: { referralCommissionPercent: '90' } });
  assert.equal(await referrals.commissionPercent(absurd), 0, 'an out-of-range setting disables rather than overpays');
});

test('social links: https on the platform domain only; no javascript, data, look-alikes or redirects', () => {
  const social = loadTs('../src/lib/social-links.ts');
  assert.equal(social.validateSocialUrl('FACEBOOK', 'https://www.facebook.com/kqacademy#top'), 'https://www.facebook.com/kqacademy');
  assert.equal(social.validateSocialUrl('YOUTUBE', 'https://youtu.be/abc'), 'https://youtu.be/abc');
  assert.equal(social.validateSocialUrl('WHATSAPP', 'https://wa.me/963900000000'), 'https://wa.me/963900000000');
  for (const [platform, url] of [
    ['FACEBOOK', 'javascript:alert(1)'], ['FACEBOOK', 'data:text/html,hi'], ['FACEBOOK', 'http://facebook.com/x'],
    ['FACEBOOK', 'https://facebook.com.evil.test/x'], ['FACEBOOK', 'https://evilfacebook.com/x'], ['INSTAGRAM', 'https://facebook.com/x'],
    ['FACEBOOK', 'https://l.facebook.com/l.php?u=https://evil.test'], ['X', 'https://x.com/i?next=https://evil.test'],
    ['TELEGRAM', 'https://user:pass@t.me/kq'], ['TIKTOK', 'https://www.tiktok.com:8443/@kq'], ['LINKEDIN', ''], ['LINKEDIN', 'not a url'],
  ]) {
    assert.throws(() => social.validateSocialUrl(platform, url), social.SocialLinkError, `${platform} ${url}`);
  }
  assert.equal(social.isSocialPlatform('MYSPACE'), false);
});
