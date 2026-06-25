#!/bin/bash
set -e

echo "🚀 Nafaa Desktop Auto-Release Script"
echo ""

# Bump version
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('apps/desktop/package.json', 'utf8'));
const parts = pkg.version.split('.');
parts[2] = parseInt(parts[2]) + 1;
pkg.version = parts.join('.');
fs.writeFileSync('apps/desktop/package.json', JSON.stringify(pkg, null, 2));
console.log('📦 New version:', pkg.version);
"

VERSION=$(node -p "require('./apps/desktop/package.json').version")

echo "🏗️  Building web app..."
pnpm --filter @nafaa/web build

echo "🍎 Building macOS..."
pnpm --filter @nafaa/desktop build:mac

echo "🪟 Building Windows..."
pnpm --filter @nafaa/desktop build:win

cd apps/desktop/release

# Rename Windows files
[ -f "Nafaa Setup $VERSION.exe" ] && mv "Nafaa Setup $VERSION.exe" "Nafaa-Setup-$VERSION.exe"
[ -f "Nafaa Setup $VERSION.exe.blockmap" ] && mv "Nafaa Setup $VERSION.exe.blockmap" "Nafaa-Setup-$VERSION.exe.blockmap"

echo "📤 Publishing GitHub Release v$VERSION..."

gh release create v$VERSION \
  --title "Nafaa Desktop v$VERSION" \
  --notes "Bug fixes and improvements. Auto-update will install this version on existing installs." \
  Nafaa-Setup-$VERSION.exe \
  Nafaa-Setup-$VERSION.exe.blockmap \
  Nafaa-$VERSION-arm64.dmg \
  Nafaa-$VERSION-arm64.dmg.blockmap \
  Nafaa-$VERSION.dmg \
  Nafaa-$VERSION.dmg.blockmap \
  latest.yml \
  latest-mac.yml

cd ../../..

# Commit version bump
git add apps/desktop/package.json
git commit -m "chore: bump desktop to v$VERSION"
git push origin main

echo ""
echo "✅ v$VERSION released successfully!"
echo "📱 Existing clients will auto-update within 10 seconds of opening the app."
echo "🌐 New downloads: https://nafaa.pk/download"
