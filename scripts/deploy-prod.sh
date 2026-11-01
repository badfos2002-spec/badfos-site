#!/usr/bin/env bash
# Deploy to production: fast-forward main to <ref> (default: develop), push, and
# run `vercel --prod` from a clean worktree so uncommitted local changes never ship.
# Usage: bash scripts/deploy-prod.sh [ref]
set -euo pipefail

REF="${1:-develop}"
REPO="/Users/mac/Desktop/badfos_site"
cd "$REPO"

git rev-parse --verify "${REF}^{commit}" >/dev/null
if ! git merge-base --is-ancestor main "$REF"; then
  echo "refusing: $REF is not a fast-forward of main" >&2
  exit 1
fi

git branch -f main "$REF"
git push origin main

W="$(mktemp -d /tmp/badfos-deploy.XXXXXX)"
git worktree add --detach "$W" main
cp -R .vercel "$W/"
(cd "$W" && vercel --prod --yes)
git worktree remove --force "$W"
