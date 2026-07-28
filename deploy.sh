#!/usr/bin/env bash
# Build + deploy Duo Budget to Netlify (production). Usage: ./deploy.sh "message"
set -euo pipefail
cd "$(dirname "$0")"
npm run build
NETLIFY_AUTH_TOKEN="$(cat .netlify-token)" \
  npx --yes netlify-cli deploy --prod --dir=dist \
  --functions=netlify/functions \
  --site=62e99ed2-cf02-42a6-9eb6-ef1cf990372d \
  --message="${1:-update}"
