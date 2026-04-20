#!/usr/bin/env bash

set -euo pipefail

SCRIPT_VERSION="1.0.0"

print_help() {
  cat <<'EOF'
Usage:
  npm run mobile:test:smoke:auth:local
  npm run mobile:test:smoke:auth:local -- --help
  npm run mobile:test:smoke:auth:local -- --version

Required environment variables:
  TMS_USERNAME
  TMS_PASSWORD

Example:
  export TMS_USERNAME="your-user"
  export TMS_PASSWORD="your-password"
  npm run mobile:test:smoke:auth:local
EOF
}

print_version() {
  printf '%s\n' "run-smoke-auth-local.sh v${SCRIPT_VERSION}"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_help
  exit 0
fi

if [[ "${1:-}" == "--version" || "${1:-}" == "-v" ]]; then
  print_version
  exit 0
fi

if [[ -z "${TMS_USERNAME:-}" || -z "${TMS_PASSWORD:-}" ]]; then
  printf '%s\n' "Error: Missing required environment variables for mobile smoke auth run." >&2
  printf '%s\n' "Set TMS_USERNAME and TMS_PASSWORD in your shell, then retry." >&2
  printf '%s\n' "Tip: npm run mobile:test:smoke:auth:local -- --help" >&2
  exit 1
fi

exec npm --prefix ./tmsapp/mobile run test:smoke:auth
