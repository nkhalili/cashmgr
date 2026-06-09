const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withIosLightIcon = (config) => {
  return withXcodeProject(config, async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const iosDir = path.join(projectRoot, 'ios');

    // Find the AppIcon.appiconset directory
    const appName = cfg.modRequest.projectName;
    const contentsPath = path.join(
      iosDir,
      appName,
      'Images.xcassets',
      'AppIcon.appiconset',
      'Contents.json'
    );

    if (!fs.existsSync(contentsPath)) return cfg;

    const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));

    // Find the "any" (default) entry — the one with no appearances
    const anyEntry = contents.images.find((img) => !img.appearances);
    if (!anyEntry) return cfg;

    // Only add the light entry if it doesn't already exist
    const hasLight = contents.images.some((img) =>
      img.appearances?.some((a) => a.appearance === 'luminosity' && a.value === 'light')
    );
    if (hasLight) return cfg;

    contents.images.push({
      filename: anyEntry.filename,
      idiom: anyEntry.idiom,
      platform: anyEntry.platform,
      size: anyEntry.size,
      appearances: [{ appearance: 'luminosity', value: 'light' }],
    });

    fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));

    return cfg;
  });
};

module.exports = withIosLightIcon;
