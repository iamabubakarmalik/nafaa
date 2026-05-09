const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  // Favicon
  'favicon-16': 16,
  'favicon-32': 32,
  'favicon-48': 48,

  // Apple Touch
  'apple-touch-icon': 180,
  'apple-touch-icon-152': 152,
  'apple-touch-icon-167': 167,

  // Android / PWA
  'icon-192': 192,
  'icon-256': 256,
  'icon-384': 384,
  'icon-512': 512,

  // Standard logo PNGs
  'logo-256': 256,
  'logo-512': 512,
  'logo-1024': 1024,

  // Mobile app icon (iOS/Android)
  'app-icon-1024': 1024,
  'adaptive-icon-foreground-512': 512,

  // Notification icon (Android, white silhouette)
  'notification-icon-96': 96,
};

async function generate() {
  const iconSrc = path.join(__dirname, 'svg/nafaa-icon.svg');

  for (const [name, size] of Object.entries(sizes)) {
    const out = path.join(__dirname, 'png', `${name}.png`);
    await sharp(iconSrc).resize(size, size).png().toFile(out);
    console.log(`✓ ${name}.png (${size}×${size})`);
  }

  // Full logo PNG
  const fullSrc = path.join(__dirname, 'svg/nafaa-logo-full.svg');
  await sharp(fullSrc).resize(1280, 320).png().toFile(path.join(__dirname, 'png', 'logo-full-1280.png'));
  console.log('✓ logo-full-1280.png');

  // Splash screen
  const splashSrc = path.join(__dirname, 'svg/nafaa-splash.svg');
  await sharp(splashSrc).resize(1284, 2778).png().toFile(path.join(__dirname, 'png', 'splash-1284x2778.png'));
  console.log('✓ splash-1284x2778.png');

  // Favicon ICO (multi-size)
  await sharp(iconSrc).resize(32, 32).png().toFile(path.join(__dirname, 'favicon', 'favicon.png'));
  console.log('✓ favicon.png (use online tool to convert to .ico if needed)');

  console.log('\n🎉 All assets generated in brand/png/');
}

generate().catch(console.error);
