/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { loadTs } = require('./load-ts.cjs');

const VIDEO = '11111111-2222-3333-4444-555555555555';
const URL = `https://player.mediadelivery.net/embed/123/${VIDEO}?autoplay=false`;
const normalized = `https://iframe.mediadelivery.net/embed/123/${VIDEO}?autoplay=false`;

// Exercise the rendered controls and their async handlers with an in-memory
// hook store. No browser, external API, or additional test dependency is needed.
function editorHarness(t, { lesson, uploader, respond } = {}) {
  const slots = [];
  let cursor = 0;
  const requests = [];
  const saved = [];
  let uploadCalls = 0;
  let completeCalls = 0;
  let pauseCalls = 0;
  class Paused extends Error {}
  const upload = {
    state: null, progress: 0, locked: false,
    upload: async (...args) => {
      uploadCalls++;
      return uploader ? uploader(...args) : { embedUrl: normalized };
    },
    pause: () => { pauseCalls++; upload.state = 'Paused'; },
    complete: () => { completeCalls++; },
  };
  const fakeReact = {
    ...React,
    useId: () => 'lesson-editor',
    useEffect: () => {},
    useRef: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useState: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
  };
  const filename = path.resolve(__dirname, '../src/components/LessonVideoEditor.tsx');
  const component = new Module(filename, module);
  component.filename = filename;
  component.paths = Module._nodeModulePaths(path.dirname(filename));
  const realRequire = component.require.bind(component);
  component.require = specifier => {
    if (specifier === 'react') return fakeReact;
    if (specifier === '@/hooks/use-bunny-upload') return { useBunnyUpload: () => upload, BunnyUploadPaused: Paused };
    if (specifier === '@/lib/bunny-embed') return loadTs('../src/lib/bunny-embed.ts');
    if (specifier === '@/components/BunnyUploadStatus') return { BunnyUploadStatus: () => null };
    if (specifier.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }), __esModule: true };
    return realRequire(specifier);
  };
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  t.mock.method(globalThis, 'fetch', async (url, config) => {
    requests.push({ url, method: config.method, body: JSON.parse(config.body) });
    return respond ? respond(requests.length) : Response.json({ lesson: { id: 'saved-lesson' } }, { status: 201 });
  });
  const render = () => {
    cursor = 0;
    return component.exports.LessonVideoEditor({ courseId: 'course-1', chapterId: 'chapter-1', lesson, onClose: () => {}, onSaved: message => saved.push(message) });
  };
  const nodes = node => {
    if (!node || typeof node !== 'object') return [];
    return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
  };
  const find = predicate => {
    const node = nodes(render()).find(predicate);
    assert.ok(node, 'Expected rendered control');
    return node;
  };
  const title = value => find(node => node.type === 'input' && node.props.id?.endsWith('-title')).props.onChange({ target: { value } });
  const button = text => find(node => node.type === 'button' && React.Children.toArray(node.props.children).includes(text));
  return {
    render, nodes, find, title, button,
    chooseUrl: () => { const radios = nodes(render()).filter(node => node.type === 'input' && node.props.type === 'radio'); radios[1].props.onChange(); },
    chooseFile: () => { const radios = nodes(render()).filter(node => node.type === 'input' && node.props.type === 'radio'); radios[0].props.onChange(); },
    link: value => find(node => node.type === 'textarea').props.onChange({ target: { value } }),
    file: value => find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [value] } }),
    submit: () => find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }),
    requests, saved, upload,
    counts: () => ({ uploadCalls, completeCalls, pauseCalls }),
  };
}

test('Bunny link saves only its normalized reference and never invokes upload', async t => {
  const h = editorHarness(t);
  h.title('درس جديد');
  h.chooseUrl();
  h.link(URL);
  assert.equal(h.nodes(h.render()).some(node => node.type === 'input' && node.props.type === 'file'), false);
  await h.submit();
  assert.equal(h.counts().uploadCalls, 0);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].body.videoSource, 'url');
  assert.equal(h.requests[0].body.videoUrl, normalized);
  assert.match(h.requests[0].body.operationId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(h.saved, ['تم ربط الفيديو بالدرس بنجاح']);
});

test('empty, malformed and untrusted links display validation without upload or save', async t => {
  const h = editorHarness(t);
  h.title('درس');
  h.chooseUrl();
  for (const value of ['', 'not-a-url', 'https://evil.example/embed/123/video']) {
    h.link(value);
    await h.submit();
    assert.equal(h.find(node => node.props?.role === 'alert').props.children, 'يرجى إدخال رابط فيديو صالح');
  }
  assert.equal(h.requests.length, 0);
  assert.equal(h.counts().uploadCalls, 0);
});

test('editing a legacy lesson title omits source and reference to preserve its video', async t => {
  const h = editorHarness(t, { lesson: { id: 'legacy', title: 'Old', videoUrl: '/uploads/legacy.mp4' } });
  h.title('عنوان معدل');
  await h.submit();
  assert.equal(h.requests[0].url, '/api/lessons/legacy');
  assert.equal(h.requests[0].method, 'PUT');
  assert.deepEqual(h.requests[0].body, { title: 'عنوان معدل' });
  assert.equal(h.counts().uploadCalls, 0);
  assert.deepEqual(h.saved, ['تم حفظ الدرس بنجاح']);
});

test('an existing lesson can explicitly replace its source with a Bunny reference', async t => {
  const h = editorHarness(t, { lesson: { id: 'old', title: 'Old', videoUrl: '/uploads/legacy.mp4' } });
  h.button('تغيير مصدر الفيديو').props.onClick();
  h.chooseUrl();
  h.link(URL);
  await h.submit();
  assert.equal(h.requests[0].method, 'PUT');
  assert.equal(h.requests[0].body.videoUrl, normalized);
  assert.equal(h.requests[0].body.videoSource, 'url');
});

test('switching away from a selected file preserves it and resumes through the same controller', async t => {
  const h = editorHarness(t);
  const file = { name: 'lesson.mp4', type: 'video/mp4' };
  h.title('درس');
  h.file(file);
  h.chooseUrl();
  h.chooseFile();
  await h.submit();
  assert.equal(h.counts().uploadCalls, 1);
  assert.equal(h.counts().pauseCalls, 1);
  assert.equal(h.counts().completeCalls, 1);
  assert.equal(h.requests[0].body.videoSource, 'file');
});

test('repeated clicks during an upload produce one upload and one lesson save', async t => {
  let finish;
  const h = editorHarness(t, { uploader: () => new Promise(resolve => { finish = resolve; }) });
  h.title('درس');
  h.file({ name: 'lesson.mp4' });
  const first = h.submit();
  await h.submit();
  assert.equal(h.counts().uploadCalls, 1);
  assert.equal(h.requests.length, 0);
  assert.deepEqual(h.saved, []);
  finish({ embedUrl: normalized });
  await first;
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.saved, ['تم حفظ الدرس بنجاح']);
});

test('lost save response retains the operation ID and reports success only after server confirmation', async t => {
  const h = editorHarness(t, { respond: count => {
    if (count === 1) throw new TypeError('network disconnected');
    return Response.json({ lesson: { id: 'saved' } });
  } });
  h.title('درس');
  h.chooseUrl();
  h.link(URL);
  await h.submit();
  assert.deepEqual(h.saved, []);
  assert.equal(h.find(node => node.props?.role === 'alert').props.children, 'تعذّر تأكيد حفظ الدرس، يرجى التحقق من الاتصال والمحاولة مجدداً');
  await h.submit();
  assert.equal(h.requests[0].body.operationId, h.requests[1].body.operationId);
  assert.deepEqual(h.saved, ['تم ربط الفيديو بالدرس بنجاح']);
});

test('server rejection retains the editor data and never reports a saved lesson', async t => {
  const h = editorHarness(t, { respond: () => Response.json({ error: 'الفيديو غير موجود' }, { status: 404 }) });
  h.title('درس');
  h.chooseUrl();
  h.link(URL);
  await h.submit();
  assert.deepEqual(h.saved, []);
  assert.equal(h.find(node => node.type === 'textarea').props.value, URL);
  assert.equal(h.find(node => node.props?.role === 'alert').props.children, 'الفيديو غير موجود');
});
