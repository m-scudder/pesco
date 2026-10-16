const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const PNGS = ['ic_launcher.png', 'ic_launcher_adaptive_back.png', 'ic_launcher_adaptive_fore.png'];
const XMLS = ['ic_launcher.xml', 'ic_launcher_round.xml'];

/**
 * Reinstall the approved Android Studio launcher assets after Expo's icon mod.
 * The source is committed, while android/ remains generated and gitignored.
 */
module.exports = function withAndroidLauncherIcons(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const source = path.join(config.modRequest.projectRoot, 'assets/android-icon/res');
      const destination = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      const copies = [];

      for (const density of DENSITIES) {
        for (const filename of PNGS) {
          copies.push(path.join('mipmap-' + density, filename));
        }
      }
      for (const filename of XMLS) {
        copies.push(path.join('mipmap-anydpi-v26', filename));
      }

      // Validate before changing generated files, so missing assets fail loudly.
      for (const relative of copies) {
        if (!fs.existsSync(path.join(source, relative))) {
          throw new Error('PESCO Android launcher icon source missing: ' + path.join(source, relative) +
            '. Run node scripts/save-android-icons.cjs and commit assets/android-icon/res.');
        }
      }
      for (const filename of XMLS) {
        const xml = fs.readFileSync(path.join(source, 'mipmap-anydpi-v26', filename), 'utf8');
        for (const ref of ['@mipmap/ic_launcher_adaptive_back', '@mipmap/ic_launcher_adaptive_fore']) {
          if (!xml.includes(ref)) throw new Error(filename + ' must reference ' + ref);
        }
      }

      for (const density of DENSITIES) {
        const directory = path.join(destination, 'mipmap-' + density);
        // Expo's PNG/WEBP files can conflict by Android resource name.
        for (const filename of [
          'ic_launcher.webp',
          'ic_launcher_round.webp',
          'ic_launcher_foreground.webp',
          'ic_launcher_round.png',
        ]) {
          fs.rmSync(path.join(directory, filename), { force: true });
        }
      }
      for (const relative of copies) {
        const target = path.join(destination, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(source, relative), target);
      }
      console.log('[PESCO] Installed Android Studio launcher resources (' + copies.length + ' files)');
      return config;
    },
  ]);
};
