const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const EVENT_STUBS = {
  '@/lib/notifications': {
    notify: async () => 0, notifySafely: async () => {}, notifyEnrollment: async () => {},
    adminRecipients: async () => [], notificationLink: value => value,
  },
  '@/lib/course-progress': {
    syncEnrollmentProgress: async () => ({ completedItemIds: [], totalItems: 0, progress: 0, complete: false }),
  },
};

// Run the installed TypeScript source in Node without adding a test dependency.
exports.loadTs = function loadTs(relativePath, mockImports = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const realRequire = instance.require.bind(instance);
  instance.require = function (specifier) {
    if (Object.hasOwn(mockImports, specifier)) return mockImports[specifier];
    // Unit tests with a hand-written in-memory database have no notification or
    // lesson-progress tables. They exercise payment/quiz rules only, so the event
    // side effects are stubbed for them. Tests using a real PrismaClient (which
    // has these models) load the real modules; see notifications-postgres.test.cjs.
    const memoryDb = mockImports['@/lib/db'] ? !mockImports['@/lib/db'].prisma?.notification : Object.keys(mockImports).length > 0;
    if (memoryDb && Object.hasOwn(EVENT_STUBS, specifier)) return EVENT_STUBS[specifier];
    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      const target = specifier.startsWith('@/')
        ? path.resolve(__dirname, '../src', specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      if (fs.existsSync(`${target}.ts`)) {
        return loadTs(path.relative(__dirname, `${target}.ts`), mockImports);
      }
    }
    return realRequire(specifier);
  };
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  instance._compile(output, filename);
  return instance.exports;
};
