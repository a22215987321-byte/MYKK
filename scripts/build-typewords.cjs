// Rebuild the independently licensed static app without changing the Next host.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'vendor/typewords');
const generated = path.join(source, '.output/public');
const destination = path.join(root, 'public/apps/typewords');
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed`);
}
function files(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), `Unexpected static asset link: ${name}`);
    return entry.isDirectory() ? files(path.join(directory, entry.name), name) : [name];
  });
}
run(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'generate'], source);
const assets = new Set(files(generated));
assert.ok(assets.has('index.html') && assets.has('list/word.json'));
fs.mkdirSync(destination, { recursive: true });
for (const file of files(destination)) {
  if (assets.has(file) || ['LICENSE.txt', 'typewords-source.zip'].includes(file)) continue;
  const target = path.resolve(destination, file);
  assert.ok(target.startsWith(destination + path.sep));
  fs.unlinkSync(target);
}
for (const file of assets) {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(generated, file), target);
}
run(process.env.PYTHON || 'python', [path.join(__dirname, 'package-typewords-source.py')], root);
console.log(`Updated ${assets.size} TypeWords assets at /apps/typewords/`);
