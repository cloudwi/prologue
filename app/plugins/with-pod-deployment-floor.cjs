const { withPodfile } = require('expo/config-plugins');

// Xcode 27 rejects resource-bundle targets below iOS 15. The app already
// requires iOS 16.4; align old pod targets with that floor without lowering
// any dependency that requires a newer version.
module.exports = (config) => withPodfile(config, (mod) => {
  const marker = '# prologue-pod-deployment-floor';
  if (mod.modResults.contents.includes(marker)) return mod;
  const hook = /(\s+react_native_post_install\([\s\S]*?\n[ \t]*\))\n/;
  if (!hook.test(mod.modResults.contents)) throw new Error('Cannot find React Native post_install hook');
  const floor = `
    ${marker}
    minimum_ios = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '16.4')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_s
        if current.empty? || (current.match?(/\\A[0-9.]+\\z/) && Gem::Version.new(current) < minimum_ios)
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios.to_s
        end
      end
    end
`;
  mod.modResults.contents = mod.modResults.contents.replace(hook, `$1\n${floor}`);
  return mod;
});
