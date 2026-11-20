const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Run the installed TypeScript source in Node without adding a test dependency.
exports.loadTs = function loadTs(relativePath, mockImports = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const instance = new Module(filename, module);
  cache.set(filename, instance);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const realRequire = instance.require.bind(instance);
  instance.require = function (specifier) {
    if (Object.hasOwn(mockImports, specifier)) return mockImports[specifier];
    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      const target = specifier.startsWith('@/')
        ? path.resolve(__dirname, '../src', specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      // A relative import and the @/ alias must resolve to the same mocked module.
      for (const [key, value] of Object.entries(mockImports)) {
        if (key.startsWith('@/') && path.resolve(__dirname, '../src', key.slice(2)) === target) return value;
      }
      if (fs.existsSync(`${target}.ts`)) {
        return loadTs(path.relative(__dirname, `${target}.ts`), mockImports, cache);
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
