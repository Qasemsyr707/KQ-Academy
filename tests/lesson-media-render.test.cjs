/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadTs } = require('./load-ts.cjs');

const filename = path.resolve(__dirname, '../src/components/LessonMediaPlayer.tsx');
const instance = new Module(filename, module);
instance.filename = filename;
instance.paths = Module._nodeModulePaths(path.dirname(filename));
const requireReal = instance.require.bind(instance);
instance.require = specifier => specifier.startsWith('@/lib/') ? loadTs(`../src/lib/${specifier.slice(6)}.ts`) : requireReal(specifier);
instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { LessonMediaPlayer } = instance.exports;
const render = directUrl => renderToStaticMarkup(React.createElement(LessonMediaPlayer, { directUrl, title: 'Lecture' }));
const VIDEO = '11111111-2222-3333-4444-555555555555';

test('official Bunny iframe retains the server-issued token and player parameters', () => {
  for (const host of ['player.mediadelivery.net', 'iframe.mediadelivery.net']) {
    const html = render(`https://${host}/embed/123/${VIDEO}?autoplay=false&token=signature&expires=1234567890`);
    assert.match(html, /<iframe/);
    assert.match(html, /token=signature&amp;expires=1234567890/);
    assert.match(html, /title="Lecture"/);
    assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/i);
    assert.match(html, /allowFullScreen=""/i);
  }
});

test('lookalike domains, credentials and external PDFs cannot become an iframe', () => {
  for (const source of [`https://evil.test/iframe.mediadelivery.net/embed/123/${VIDEO}`, `https://iframe.mediadelivery.net.evil.test/embed/123/${VIDEO}`, 'https://example.test/handout.pdf', `https://user:password@iframe.mediadelivery.net/embed/123/${VIDEO}`, 'javascript:alert(1)', 'data:text/html,<h1>unsafe</h1>']) {
    assert.doesNotMatch(render(source), /<iframe/);
  }
});

test('legacy local PDFs, audio and uploaded video retain their respective players', () => {
  assert.match(render('/api/files/handout.pdf'), /<iframe/);
  assert.match(render('/api/files/handout.pdf'), /download=1/);
  assert.doesNotMatch(render('/uploads/handout.pdf'), /<iframe/);
  assert.match(render('/uploads/handout.pdf'), /التخزين المحمي/);
  assert.match(render('/uploads/audio.mp3'), /<audio/);
  assert.match(render('/uploads/lecture.mp4'), /<video/);
  assert.doesNotMatch(render('/uploads/lecture.mp4'), /autoPlay/i);
});
