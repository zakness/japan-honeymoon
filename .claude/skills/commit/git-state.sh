#!/bin/bash
# Show git working state: status, staged diff, unstaged diff, and recent log.
# Used by the commit skill to understand current changes without requiring approval.

git status --porcelain
echo "---"
git diff --staged
echo "---"
git diff
echo "---"
git log --oneline -5
