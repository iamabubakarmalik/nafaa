#!/usr/bin/env bash
# WooCommerce plugin ka zip banata hai — Website Connect safhe ka
# "Download" button isi file ko deta hai (API ka public folder).
set -euo pipefail
cd "$(dirname "$0")/woocommerce"
out="../../apps/api/public/plugins"
mkdir -p "$out"
rm -f "$out/nafaa-woocommerce.zip"
zip -rq "$out/nafaa-woocommerce.zip" nafaa-pos -x '*.DS_Store'
echo "✅ $out/nafaa-woocommerce.zip"
