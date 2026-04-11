#!/bin/bash
# Understand changes for create-pr skill.
# Outputs: commit list, file stat, and full diff against main.

echo "=== commits ==="
git log main..HEAD --oneline
echo "=== stat ==="
git diff main...HEAD --stat
echo "=== diff ==="
git diff main...HEAD
