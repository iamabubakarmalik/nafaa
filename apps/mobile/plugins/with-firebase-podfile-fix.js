/**
 * Expo config plugin to fix iOS build error:
 *   "include of non-modular header inside framework module 'RNFBApp...'"
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# nafaa-firebase-non-modular-fix';

const PATCH = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

module.exports = function withFirebasePodfileFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) return config;
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${PATCH}`
      );
      fs.writeFileSync(podfilePath, contents);
      console.log('[firebase-fix] Patched Podfile');
      return config;
    },
  ]);
};
