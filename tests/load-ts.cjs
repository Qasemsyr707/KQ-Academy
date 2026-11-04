const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Run the installed TypeScript source in Node without adding a test dependency.
exports.loadTs = function loadTs(relativePath, mockImports = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const realRequire = instance.require.bind(instance);
  instance.require = function (specifier) {
    if (Object.hasOwn(mockImports, specifier)) return mockImports[specifier];
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  instance._compile(output, filename);
  return instance.exports;
};
