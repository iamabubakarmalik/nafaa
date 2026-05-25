#!/bin/bash
# Generate all PNG sizes from SVGs for all platforms

set -e
cd "$(dirname "$0")"

# Ensure rsvg-convert is installed
if ! command -v rsvg-convert >/dev/null; then
  echo "Installing librsvg..."
  brew install librsvg
fi

mkdir -p png social app-icons og

echo "🎨 Generating App Icons..."
# iOS / Android app icons (square, all sizes)
rsvg-convert -w 1024 -h 1024 svg/nafaa-icon.svg -o png/app-icon-1024.png
rsvg-convert -w 512 -h 512 svg/nafaa-icon.svg -o png/icon-512.png
rsvg-convert -w 384 -h 384 svg/nafaa-icon.svg -o png/icon-384.png
rsvg-convert -w 256 -h 256 svg/nafaa-icon.svg -o png/icon-256.png
rsvg-convert -w 192 -h 192 svg/nafaa-icon.svg -o png/icon-192.png
rsvg-convert -w 180 -h 180 svg/nafaa-icon.svg -o png/apple-touch-icon.png
rsvg-convert -w 152 -h 152 svg/nafaa-icon.svg -o png/apple-touch-icon-152.png
rsvg-convert -w 96 -h 96 svg/nafaa-icon.svg -o png/notification-icon-96.png
rsvg-convert -w 48 -h 48 svg/nafaa-icon.svg -o png/favicon-48.png
rsvg-convert -w 32 -h 32 svg/nafaa-icon.svg -o png/favicon-32.png
rsvg-convert -w 16 -h 16 svg/nafaa-icon.svg -o png/favicon-16.png

# Adaptive icon foreground (Android)
rsvg-convert -w 512 -h 512 svg/nafaa-icon.svg -o png/adaptive-icon-foreground-512.png

echo "📱 Generating Wordmark Logo..."
rsvg-convert -w 1280 -h 400 svg/nafaa-logo-full.svg -o png/logo-full-1280.png
rsvg-convert -w 640 -h 200 svg/nafaa-logo-full.svg -o png/logo-full-640.png

echo "📸 Generating Social Posts..."
# Instagram post (square)
rsvg-convert -w 1080 -h 1080 svg/social-instagram-post.svg -o social/instagram-post.png

# Instagram story / WhatsApp status (9:16)
rsvg-convert -w 1080 -h 1920 svg/social-instagram-story.svg -o social/instagram-story.png
cp social/instagram-story.png social/whatsapp-status.png

# Features post
rsvg-convert -w 1080 -h 1080 svg/social-features-post.svg -o social/features-post.png

# Facebook cover (820x312)
rsvg-convert -w 1640 -h 624 svg/social-instagram-post.svg -o social/fb-cover.png

# Twitter header (1500x500)
rsvg-convert -w 1500 -h 500 svg/social-instagram-post.svg -o social/twitter-header.png

# LinkedIn banner (1584x396)
rsvg-convert -w 1584 -h 396 svg/social-instagram-post.svg -o social/linkedin-banner.png

echo "🌐 Generating OG Images..."
rsvg-convert -w 1200 -h 630 svg/social-instagram-post.svg -o og/og-default.png

echo ""
echo "✅ All PNGs generated successfully!"
echo ""
echo "📁 Files created:"
ls -lh png/ social/ og/ 2>/dev/null | head -40
