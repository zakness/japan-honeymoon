---
name: create-pr
description: >
  Creates a well-structured GitHub pull request with a generated title and description.
  Use this skill whenever the user wants to open a PR, submit their work for review, or
  share their branch — whether they say "create a PR", "open a pull request", "submit
  this for review", "make a PR", "/create-pr", or anything similar.
---

# Create Pull Request

Open a ready-for-review GitHub pull request with a clear, human-readable description
generated from the branch's commits and diff.

## Step 1: Pre-flight checks

Run `.claude/skills/create-pr/pr-preflight.sh` — outputs current branch, uncommitted changes, commits ahead of main, upstream tracking info, and tracking status.

**Abort conditions:**

- On `main`, `beta`, or `prod`: stop. Tell the user to switch to a feature branch.
- Uncommitted changes: stop. Tell the user to commit first (suggest `/commit`).
- No commits ahead of main: stop. Nothing to PR.

If there's no upstream or the branch is ahead of origin, push it:

```bash
git push -u origin HEAD
```

## Step 2: Search for related GitHub issues

```bash
gh issue list --state open --limit 50 --json number,title,body
```

Use the branch name, commit messages, and diff to find issues that this PR likely
addresses. For each candidate, confirm with the user:

> "This PR seems related to issue #N: _[title]_. Should I add `Closes #N` to the PR?"

Only include `Closes #N` lines the user confirms.

## Step 3: Understand the changes

Run `.claude/skills/create-pr/pr-diff.sh` — outputs commit list, file stat, and full diff against main.

Use this to understand the scope, motivation, and nature of the changes. Read any
modified files that need more context (e.g., if a file name doesn't make its purpose obvious).

## Step 4: Draft the PR

Generate a title and body based on your understanding of the changes.

**Title:** Short (under 70 chars), imperative mood, describes what the PR does.
Example: `feat(calculator): handle zero-quota edge case`

**Body template:**

```markdown
## Motivation

<1-2 sentences explaining the problem this solves or the need being addressed>

## Changes

- <bullet describing a meaningful change>
- <bullet describing another change>

## Screenshots

<!-- Add screenshots for any UI changes, or delete this section if none -->

## Test plan

- [ ] <specific manual step to verify the main behavior>
- [ ] <another step if needed>
```

**Closes lines** (if any confirmed in Step 2):
Add at the end of the body, after the test plan:

```
Closes #N
```

**Tips for a good description:**

- Motivation answers "why" — not "what" (the diff shows what)
- Changes are specific and meaningful, not just a restatement of commit messages
- Test plan steps are concrete enough that a reviewer could follow them independently
- Screenshots section: include it whenever there are UI changes; remove it if purely backend

## Step 5: Create the PR

```bash
gh pr create \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body>
EOF
)"
```

After the PR is created, output the PR URL so the user can open it.

## Hard limits

- Never create PRs targeting `beta` or `prod` — target `main` only (unless the user explicitly says otherwise)
- Never push with `--force`
- Never create a draft PR — always ready-for-review
