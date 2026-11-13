/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

test('mobile public trailers are signed and protected lesson sources stay redacted', () => {
  const trailer = 'https://iframe.mediadelivery.net/embed/123/11111111-2222-3333-4444-555555555555';
  const helper = loadTs('../src/lib/course-playback-links.ts', {
    '@/lib/bunny-playback': { getBunnyPlaybackUrl: source => { assert.equal(source, trailer); return source + '?token=signed&expires=999'; } },
  }).protectCoursePlaybackLinks;
  const original = { title: 'Visible course', previewVideoUrl: trailer, chapters: [{ lessons: [{ id: 'lesson', videoUrl: 'PRIVATE_SOURCE', content: 'PRIVATE_NOTES' }] }] };
  const result = helper(original);
  assert.equal(result.previewVideoUrl, trailer + '?token=signed&expires=999');
  assert.equal(result.title, original.title);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SOURCE|PRIVATE_NOTES/);
  assert.equal(original.chapters[0].lessons[0].videoUrl, 'PRIVATE_SOURCE');
});

test('missing trailer configuration fails closed without hiding course content', () => {
  const helper = loadTs('../src/lib/course-playback-links.ts', {
    '@/lib/bunny-playback': { getBunnyPlaybackUrl: () => { throw new Error('missing private key'); } },
  }).protectCoursePlaybackLinks;
  const result = helper({ id: 'course', title: 'Visible', price: 25, previewVideoUrl: 'unsigned-private-reference' });
  assert.equal(result.previewVideoUrl, null);
  assert.equal(result.title, 'Visible');
  assert.equal(result.price, 25);
  assert.doesNotMatch(JSON.stringify(result), /unsigned-private-reference|private key/);
});
