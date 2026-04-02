#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
rm -rf www
mkdir -p www
cp ../index.html www/
cp ../style.css www/
cp ../app.js www/
cp ../manifest.webmanifest www/
cp ../sw.js www/
cp ../icon-192.png www/
cp ../icon-512.png www/
echo "Web assets copied into apk-wrapper/www"
