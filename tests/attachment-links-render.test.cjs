const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadTs } = require('./load-ts.cjs');

const filename = path.resolve(__dirname, '../src/components/AttachmentLinks.tsx');
const component = new Module(filename, module);
component.filename = filename;
component.paths = Module._nodeModulePaths(path.dirname(filename));
const realRequire = component.require.bind(component);
component.require = specifier => specifier === '@/lib/attachment-links'
  ? loadTs('../src/lib/attachment-links.ts') : realRequire(specifier);
component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { AttachmentLinks } = component.exports;
const render = attachment => renderToStaticMarkup(React.createElement(AttachmentLinks, { attachment }));

test('original attachment exposes separate native open and download links through its protected ID', () => {
  const html = render({ id: 'attachment_1', name: 'Lecture.pdf', url: '/api/files/original_1' });
  const links = html.match(/<a\b[^>]*>/g);
  assert.equal(links.length, 2);
  assert.match(links[0], /href="\/api\/attachments\/attachment_1\/file"/);
  assert.match(links[0], /target="_blank"/);
  assert.match(links[0], /rel="noopener noreferrer"/);
  assert.match(links[1], /href="\/api\/attachments\/attachment_1\/file\?download=1"/);
  assert.match(links[1], /download=""/);
  assert.doesNotMatch(links[1], /target=/);
  assert.doesNotMatch(html, /\/api\/files\/original_1/);
});

test('old external, image-host and embedded data records request original reupload without external links', () => {
  for (const url of ['https://i.ibb.co/example/lecture.jpg', 'https://example.test/lecture.pdf', 'data:application/pdf;base64,AAAA']) {
    const html = render({ id: 'old_attachment', name: 'Lecture.pdf', url });
    assert.match(html, /role="status"/);
    assert.match(html, /إعادة رفع الملف الأصلي/);
    assert.doesNotMatch(html, /<a\b/);
    assert.equal(html.includes(url), false);
  }
});

test('serialized protected link retains the missing-original warning', () => {
  const html = render({ id: 'old_attachment', name: 'Lecture.pdf', url: '/api/attachments/old_attachment/file', requiresReupload: true });
  assert.match(html, /إعادة رفع الملف الأصلي/);
  assert.doesNotMatch(html, /<a\b/);
});
