#!/usr/bin/env node
/**
 * Preserve the working Android Studio launcher assets outside Expo's ignored
 * android/ directory. This script COPYs rather than moves: the running native
 * project remains unchanged until you deliberately regenerate it.
 *
 * Usage:
 *   node scripts/save-android-icons.cjs
 *   node scripts/save-android-icons.cjs /path/to/AndroidIcon/res
 *
 * Next step (separate): register an Expo config plugin to reinstall these
 * assets after expo prebuild --clean. Copying alone does not do that.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(root, 'android/app/src/main/res'));
const destination = path.join(root, 'assets/android-icon/res');
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const pngs = ['ic_launcher.png', 'ic_launcher_adaptive_back.png', 'ic_launcher_adaptive_fore.png'];
const adaptiveXmls = ['ic_launcher.xml', 'ic_launcher_round.xml'];

function fail(message) {
  console.error('Error:', message);
  process.exit(1);
}
function readable(file) {
  try { return fs.statSync(file).isFile(); } catch { return false; }
}

if (!fs.existsSync(source)) fail('Source resource directory does not exist: ' + source);
if (source === destination) fail('Source and destination must differ.');

// Validate the entire set before writing anything.
const copies = [];
for (const density of densities) {
  for (const name of pngs) {
    const relative = path.join('mipmap-' + density, name);
    if (!readable(path.join(source, relative))) fail('Missing required icon: ' + relative);
    copies.push(relative);
  }
}
const adaptiveDir = 'mipmap-anydpi-v26';
const primary = path.join(source, adaptiveDir, 'ic_launcher.xml');
if (!readable(primary)) fail('Missing adaptive icon: ' + path.join(adaptiveDir, 'ic_launcher.xml'));
for (const name of adaptiveXmls) {
  const relative = path.join(adaptiveDir, name);
  if (!readable(path.join(source, relative))) {
    if (name === 'ic_launcher_round.xml') continue; // Optional.
    fail('Missing adaptive icon: ' + relative);
  }
  const xml = fs.readFileSync(path.join(source, relative), 'utf8');
  for (const ref of ['@mipmap/ic_launcher_adaptive_back', '@mipmap/ic_launcher_adaptive_fore']) {
    if (!xml.includes(ref)) fail(relative + ' must reference ' + ref + ' (not old Expo foreground)');
  }
  copies.push(relative);
}

for (const relative of copies) {
  const from = path.join(source, relative);
  const to = path.join(destination, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
console.log('Saved ' + copies.length + ' Android launcher assets to ' + path.relative(root, destination));
console.log('Original native resources were left untouched.');
console.log('Commit assets/android-icon/res and this script; android/ stays gitignored.');
console.log('Note: an Expo config plugin is still required to restore these resources after a clean prebuild.');
