#!/bin/bash
set -e

echo "=== Building web frontend ==="
cd campus-runner-web
npm install --include=dev
node ./node_modules/vite/bin/vite.js build
echo "=== Web build complete ==="

echo "=== Installing server dependencies ==="
cd ../campus-runner-server
npm install
echo "=== All done ==="
