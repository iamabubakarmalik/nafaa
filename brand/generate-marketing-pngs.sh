#!/bin/bash
set -e
cd "$(dirname "$0")"

# Install rsvg-convert if needed
if ! command -v rsvg-convert >/dev/null; then
  brew install librsvg
fi

mkdir -p png social

echo "🎨 Generating App Icon..."
rsvg-convert -w 1024 -h 1024 svg/nafaa-icon.svg -o png/app-icon-1024.png
rsvg-convert -w 512 -h 512 svg/nafaa-icon.svg -o png/icon-512.png
rsvg-convert -w 192 -h 192 svg/nafaa-icon.svg -o png/icon-192.png
rsvg-convert -w 96 -h 96 svg/nafaa-icon.svg -o png/notification-icon-96.png
rsvg-convert -w 48 -h 48 svg/nafaa-icon.svg -o png/favicon-48.png

echo "📸 Generating Profile Pic (Instagram/WhatsApp DP)..."
rsvg-convert -w 1080 -h 1080 svg/social-profile-pic.svg -o social/profile-pic.png
rsvg-convert -w 400 -h 400 svg/social-profile-pic.svg -o social/profile-pic-400.png

echo "📱 Generating 5-Day Post Series..."
rsvg-convert -w 1080 -h 1080 svg/post-day1-launch.svg -o social/day1-launch.png
rsvg-convert -w 1080 -h 1080 svg/post-day2-problem.svg -o social/day2-problem.png
rsvg-convert -w 1080 -h 1080 svg/post-day3-earning.svg -o social/day3-earning.png
rsvg-convert -w 1080 -h 1080 svg/post-day4-testimonial.svg -o social/day4-testimonial.png
rsvg-convert -w 1080 -h 1080 svg/post-day5-urgency.svg -o social/day5-urgency.png

echo "📺 Generating Stories / WhatsApp Status..."
rsvg-convert -w 1080 -h 1920 svg/story-launch.svg -o social/story-launch.png
cp social/story-launch.png social/whatsapp-status.png

echo ""
echo "✅ Generated! Open the social folder:"
echo "   open $(pwd)/social"
ls -lh social/
