#!/usr/bin/env bash
# Runs a command on the latest main and pushes what it changed, trying again from the latest main if someone pushed
# meanwhile: `scripts/on-main.sh "<commit message>" "<files>" <command…>`. The workflows commit through this, so they
# never wait in one queue for each other (GitHub keeps only one run waiting in a concurrency group, and cancels the
# rest), and two cuts can ship at once: each change is made again on top of the other's rather than merged.
set -euo pipefail
# It resets the checkout to origin/main, which would throw away work in a clone of your own.
if [ "${GITHUB_ACTIONS:-}" != true ]; then
  echo "scripts/on-main.sh runs only in this repository's workflows: it resets the checkout to origin/main" >&2
  exit 1
fi
message=$1 files=$2
shift 2
for try in 1 2 3 4 5; do
  git fetch -q origin main
  git reset -q --hard origin/main
  "$@"
  # shellcheck disable=SC2086
  git diff --quiet -- $files && exit 0
  # shellcheck disable=SC2086
  git commit -q -m "$message" -- $files
  git push -q origin HEAD:main && exit 0
  # Refused because main moved is worth another try; refused for anything else (permissions) isn't.
  git fetch -q origin main
  if git merge-base --is-ancestor origin/main HEAD; then
    echo "::error::the push to main was refused, though main hadn't moved: check the workflow's permissions"
    exit 1
  fi
  sleep $((try * 3))
done
echo "::error::main kept moving under this run: run it again"
exit 1
