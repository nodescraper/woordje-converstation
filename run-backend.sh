#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -d .venv ]; then echo "Run ./setup.sh first."; exit 1; fi
# shellcheck disable=SC1091
source .venv/bin/activate
# load backend/.env if present (API keys), ignoring comments
if [ -f .env ]; then set -a; . ./.env; set +a; fi
echo "Backend API -> http://localhost:5001"
python app.py
