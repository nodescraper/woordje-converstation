#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d node_modules ]; then echo "Run ./setup.sh first."; exit 1; fi
echo "Frontend -> http://localhost:5173"
npm run dev
