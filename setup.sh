#!/usr/bin/env bash
# One-shot setup for both halves of the project.
#
# By default this installs spaCy models for Dutch, English and German. Override
# the set with WOORDJE_SPACY_MODELS, e.g.:
#   WOORDJE_SPACY_MODELS="nl_core_news_sm fr_core_news_sm" ./setup.sh
# (Any language still works without its model — analysis falls back to a regex
#  tokenizer + morphology-only grammar. Model package names are in
#  backend/languages.py.)
set -e
cd "$(dirname "$0")"

SPACY_MODELS="${WOORDJE_SPACY_MODELS:-nl_core_news_sm en_core_web_sm de_core_news_sm}"

echo "==> Backend: virtual environment + Python deps"
cd backend
if [ ! -d .venv ]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
pip install -r requirements.txt
# Install dev deps too if present (pytest), so `pytest` works out of the box.
if [ -f requirements-dev.txt ]; then pip install -r requirements-dev.txt; fi

echo "==> Backend: spaCy models ($SPACY_MODELS)"
for model in $SPACY_MODELS; do
  echo "    - $model"
  python -m spacy download "$model" || echo "      (skipped: '$model' could not be downloaded)"
done
deactivate
cd ..

echo "==> Frontend: npm install"
cd frontend
npm install
cd ..

echo ""
echo "Setup complete."
echo "  1. Start the backend:   ./run-backend.sh   (http://localhost:5001, docs at /api/docs)"
echo "  2. Start the frontend:  ./run-frontend.sh  (http://localhost:5173)"
echo "  Make sure LM Studio (or a cloud key in backend/.env) is available for generation."
