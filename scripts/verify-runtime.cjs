/* eslint-disable @typescript-eslint/no-require-imports -- Cross-platform Node CLI. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const projectRoot = path.resolve(__dirname, '..');
const projectRequire = createRequire(path.join(projectRoot, 'package.json'));

function atLeast(actual, minimum) {
  const parse = value => /^v?(\d+)\.(\d+)\.(\d+)(?:\+[\w.-]+)?$/.exec(value)?.slice(1).map(Number);
  const a = parse(actual);
  const b = parse(minimum);
  if (!a || !b) return false;
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return true;
}

function packageDetails(name, requireFrom = projectRequire) {
  const entry = requireFrom.resolve(name);
  let directory = path.dirname(entry);
  while (true) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (pkg.name === name) return { version: pkg.version, entry: path.relative(projectRoot, entry) };
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Cannot locate installed package manifest: ${name}`);
    directory = parent;
  }
}

function inspectRuntime() {
  const nextRequire = createRequire(projectRequire.resolve('next/dist/server/image-optimizer'));
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  const sharpInLock = Object.entries(lock.packages ?? {})
    .filter(([name]) => /(?:^|\/)node_modules\/sharp$/.test(name))
    .map(([name, pkg]) => ({ path: name, version: pkg.version }));
  const packages = Object.fromEntries(['next', 'react', 'react-dom', 'next-auth', 'sharp']
    .map(name => [name, packageDetails(name)]));
  const nextImageOptimizerSharp = packageDetails('sharp', nextRequire);
  const errors = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const supportedNode = (nodeMajor === 24 && atLeast(process.versions.node, '24.22.2'))
    || (nodeMajor === 22 && atLeast(process.versions.node, '22.23.4'));
  if (!supportedNode) errors.push('Use Node.js >=24.22.2 <25, or the supported fallback >=22.23.4 <23.');
  if (!atLeast(packages.next.version, '16.4.5')) errors.push('Next.js must be >=16.4.5.');
  if (packages.react.version !== packages['react-dom'].version) errors.push('React and ReactDOM versions must match.');
  if (!atLeast(packages['next-auth'].version, '4.24.15')) errors.push('next-auth must be >=4.24.15.');
  if (!atLeast(packages.sharp.version, '0.35.5')) errors.push('Root Sharp must be >=0.35.5.');
  if (!atLeast(nextImageOptimizerSharp.version, '0.35.5')) errors.push('Sharp resolved by the Next.js image optimizer must be >=0.35.5.');
  if (!sharpInLock.length || sharpInLock.some(pkg => !atLeast(pkg.version, '0.35.5'))) {
    errors.push('Every Sharp package in package-lock.json must be >=0.35.5.');
  }
  return { ok: errors.length === 0, node: process.version, platform: process.platform,
    architecture: process.arch, packages, nextImageOptimizerSharp, sharpInLock, errors };
}

if (require.main === module) {
  try {
    const report = inspectRuntime();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Runtime verification failed' }));
    process.exitCode = 1;
  }
}

module.exports = { inspectRuntime };
