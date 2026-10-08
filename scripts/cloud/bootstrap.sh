#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node -e 'if (+process.versions.node.split(".")[0] < 22) throw Error("Node.js 22 or newer is required")'
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
fi
pnpm install --frozen-lockfile
pnpm cloud:setup
printf '\nReady. Run pnpm cloud:dev. Use pnpm cloud:password to view the development-only login password.\n'
