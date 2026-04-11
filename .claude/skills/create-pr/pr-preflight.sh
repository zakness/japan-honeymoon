#!/bin/bash
# Pre-flight checks for create-pr skill.
# Outputs: current branch, uncommitted changes, commits ahead of main, upstream tracking, and branch tracking status.

echo "=== branch ==="
git rev-parse --abbrev-ref HEAD
echo "=== status ==="
git status --porcelain
echo "=== commits ahead of main ==="
git log main..HEAD --oneline
echo "=== upstream ==="
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "(no upstream)"
echo "=== tracking status ==="
git status -sb
