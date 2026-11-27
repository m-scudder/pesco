const fs = require('node:fs');
const path = require('node:path');
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const FILE = 'LogBankMessageIntent.swift';

/**
 * Adds the "Log Bank Message in PESCO" App Intent to the iOS app target.
 * App Intents must be compiled into the app itself (not a pod) for the
 * Shortcuts app to list them. The source is committed under
 * modules/pesco-capture/ios-app; ios/ stays generated and gitignored.
 */
function withIntentSource(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const source = path.join(config.modRequest.projectRoot, 'modules/pesco-capture/ios-app', FILE);
      const target = path.join(config.modRequest.platformProjectRoot, config.modRequest.projectName, FILE);
      if (!fs.existsSync(source)) throw new Error('Missing App Intent source: ' + source);
      fs.copyFileSync(source, target);
      return config;
    },
  ]);
}

function withIntentInProject(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const groupName = config.modRequest.projectName;
    const filepath = path.join(groupName, FILE);
    if (!project.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName, project });
    }
    return config;
  });
}

module.exports = function withPescoCaptureIntent(config) {
  return withIntentInProject(withIntentSource(config));
};
