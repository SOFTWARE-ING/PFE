// plugins/withNetworkSecurityConfig.js
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

// Étape 1 — Copie network_security_config.xml dans res/xml Android
const withCopyNetworkConfig = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const srcFile  = path.join(__dirname, 'network_security_config.xml');
      const destDir  = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      const destFile = path.join(destDir, 'network_security_config.xml');

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcFile, destFile);
      console.log('[withNetworkSecurityConfig] ✅ network_security_config.xml copié');
      return cfg;
    },
  ]);
};

// Étape 2 — Ajoute networkSecurityConfig dans AndroidManifest.xml
const withManifestNetworkConfig = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application[0];

    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:usesCleartextTraffic']  = 'true';

    console.log('[withNetworkSecurityConfig] ✅ AndroidManifest.xml mis à jour');
    return cfg;
  });
};

// Combine les deux étapes
module.exports = (config) => {
  config = withCopyNetworkConfig(config);
  config = withManifestNetworkConfig(config);
  return config;
};