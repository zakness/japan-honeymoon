---
name: commit
description: >
  Creates well-structured git commits following the Conventional Commits specification.
  Use this skill whenever the user wants to commit, save, or checkpoint their changes —
  whether they say "/commit", "commit my changes", "make a commit", "save this", or
  anything similar. Also use it when wrapping up a task if the user has uncommitted changes
  and hasn't said not to commit.
---

# Git Commit

Create focused, atomic commits following the Conventional Commits specification.

## Step-by-step

**1. Check the branch first — before anything else.**

Run `git branch --show-current`. If the branch is `main`, `beta`, or `prod`: do not stage or commit anything yet. Infer a branch name from the changes, create it with `git checkout -b <branch-name>`, and proceed.

**2. Understand the current state.**

Run `.claude/skills/commit/git-state.sh` — outputs status, staged diff, unstaged diff, and recent log separated by `---`.

**3. Group changes into logical, atomic commits.**

Each commit should be small enough that a human reviewer can understand it in isolation — ideally under 10 files and 200 lines changed. A commit that touches every layer of the stack is a sign it needs splitting.

**Split when any of these are true:**

- More than ~10 files changed
- More than ~200 lines changed (additions + deletions)
- Changes span multiple architectural layers (DB, services, UI, tests)

**Natural split points by layer** — use this order when splitting a large change:

1. **DB / migrations** — SQL files; can be deployed independently
2. **Schema / types** — Zod schemas, TypeScript type definitions
3. **Services / logic** — business logic consumers (calculators, scoring, utilities)
4. **UI / components** — React components and hooks
5. **Scripts** — standalone scripts and tooling
6. **Tests** — test files and mocks (can follow each layer or be grouped at the end)

Always present your proposed grouping to the user before committing when there are more than ~10 files changed, or when the split is non-obvious. For small or obviously related changes, just proceed.

**4. Stage and commit each group.**

```bash
git add <files>
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<optional body — explain why, not what>
EOF
)"
```

If a pre-commit hook fails: fix the underlying issue, re-stage, and create a **new** commit. Never use `--amend` or `--no-verify`.

**5. Verify.**

Run `git status` to confirm everything is committed.

## Conventional Commits format

```
<type>[optional scope]: <description>
```

| Type       | Use for                         |
| ---------- | ------------------------------- |
| `feat`     | New feature                     |
| `fix`      | Bug fix                         |
| `docs`     | Documentation only              |
| `style`    | Formatting, no logic change     |
| `refactor` | Restructure without feature/fix |
| `perf`     | Performance improvement         |
| `test`     | Tests only                      |
| `build`    | Build system or dependencies    |
| `ci`       | CI/CD config                    |
| `chore`    | Maintenance, misc               |
| `revert`   | Revert a prior commit           |

Breaking changes: append `!` after the type (`feat!:`) and/or add a `BREAKING CHANGE:` footer.

**Message rules:**

- Description under 72 characters, present tense, imperative mood ("add" not "added")
- Body explains _why_, not _what_ — the diff already shows what changed
- Reference issues when relevant: `Closes #123`
- Never add "co-authored by Claude Code" or similar attribution

## Hard limits

- Never commit to `main`, `beta`, or `prod` — auto-create a feature branch instead
- Never commit `.env`, credentials, or private keys
- Never use `--force`, `--no-verify`, `--amend`, or `reset --hard` unless the user explicitly asks
- Never update git config
