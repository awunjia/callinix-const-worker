#!/usr/bin/env bash
# Debug dashboard.callinix.com gateway (run after deploy)
set -euo pipefail

DASHBOARD="${DASHBOARD:-https://dashboard.callinix.com}"
APP="${APP:-https://app.callinix.com}"
PREVIEW="${PREVIEW_SECRET:-}"
PROXY="${PROXY_HEADER_SECRET:-}"

echo "=== Worker health (env bindings, no secret values) ==="
curl -sS "${DASHBOARD}/__callinx-health" | python3 -m json.tool 2>/dev/null || curl -sS "${DASHBOARD}/__callinx-health"
echo ""

echo "=== Public dashboard (expect under-construction headers) ==="
curl -sI "${DASHBOARD}/" | grep -E '^(HTTP|content-type|x-frame-options|set-cookie)' || true
echo ""

if [[ -n "${PREVIEW}" ]]; then
  echo "=== Preview URL (expect Set-Cookie + real app OR proxy; NOT const HTML) ==="
  curl -sI "${DASHBOARD}/?preview=${PREVIEW}" | grep -E '^(HTTP|set-cookie|location|content-type)' || true
  BODY=$(curl -sL "${DASHBOARD}/?preview=${PREVIEW}" | head -c 120)
  if echo "${BODY}" | grep -q 'Your AI voice receptionist'; then
    echo "FAIL: Response body looks like under-construction page"
  else
    echo "OK: Body does not look like under-construction (or empty)"
  fi
  echo "Body start: ${BODY}..."
else
  echo "Skip preview test: set PREVIEW_SECRET env var"
fi
echo ""

echo "=== app.callinix.com without bypass (expect 302 → dashboard) ==="
curl -sI "${APP}/" | grep -E '^(HTTP|location)' || true
echo ""

if [[ -n "${PROXY}" ]]; then
  echo "=== app.callinix.com with X-Callinx-Proxy (expect 200, NOT 522) ==="
  curl -sI "${APP}/" -H "X-Callinx-Proxy: ${PROXY}" | grep -E '^(HTTP|content-type)' || true
else
  echo "Skip proxy bypass test: set PROXY_HEADER_SECRET env var"
fi
