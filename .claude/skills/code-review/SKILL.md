---
name: code-review
description: >
  Performs a comprehensive code review of the current branch using parallel subagents.
  Use when the user wants to review changes, check their work before a PR, or says
  "/code-review", "review my changes", "check my code", or anything similar.
---

# Request Code Review

Perform a comprehensive code review of your current branch changes using parallel subagents for analysis.

## Usage

`/code-review` - Review current git changes against plan and coding standards

## Prerequisites

Before reviewing, verify both conditions. If either fails, stop and help the user fix it:

1. **On a feature branch** — run `git rev-parse --abbrev-ref HEAD`. If on `main`, ask the user to create a feature branch first.
2. **Clean working tree** — run `git status --porcelain`. If there are uncommitted changes, suggest `/commit` first.

## Gather Context

Run these commands to understand the scope of changes:

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
git diff main...HEAD
```

If there are no commits ahead of main, tell the user there's nothing to review.

## Delegate Analysis to Subagents

The review itself happens via **parallel subagents** — this keeps the main context window clean and lets multiple review dimensions run simultaneously. Launch all agents in a single message.

### Agent 1: Code Quality & Correctness

```
You are a code reviewer. Analyze the following git diff for code quality and correctness.

## Review Criteria

### Code Quality
- Clean separation of concerns?
- Proper error handling (HTTP errors, DB errors, file I/O)?
- Type safety (no `any`, no unsafe casts)?
- Edge cases handled?

### Correctness
- Are all operations idempotent where they should be?
- Are DB/state transitions correct?
- Are all queries parameterized (no string interpolation into SQL)?
- Could any new writes create duplicate rows? Check UNIQUE constraints.
- If the schema changed, is there a safe migration path?

## Project Standards
Read CLAUDE.md at the repo root and .claude/code-review-checklist.md (if it exists) for project-specific conventions. Check that the changes follow these standards.

## Diff to Review
<paste the full diff here>

## Changed Files
<list the files from --stat>

Read each changed file in full to understand the surrounding context — don't review the diff in isolation.

## Output Format
For each finding, provide:
- **Severity**: Critical / Important / Minor
- **Location**: file:line
- **Issue**: What's wrong
- **Why it matters**: Impact if left unfixed
- **Fix**: How to resolve (if not obvious)

Also list 2-3 specific strengths you noticed.
```

### Agent 2: Testing & Requirements

```
You are a code reviewer focused on testing and requirements. Analyze the following changes.

## Review Criteria

### Testing
- Do tests assert real behavior?
- Edge cases covered?
- Is new logic covered by tests?
- Run the test suite and report any failures.

### Requirements
- Check if there's an active plan file in .claude/plans/ — if so, verify all requirements are met.
- Check recent git log messages — verify the implementation matches.
- Flag any scope creep (work beyond what was asked for).
- Flag breaking changes that aren't documented.

### Production Readiness
- If there are schema changes, is there a safe migration path?
- Are there obvious bugs?

## Diff to Review
<paste the full diff here>

## Changed Files
<list the files from --stat>

Read each changed file and its corresponding test file (if any) to understand coverage.

## Output Format
For each finding, provide:
- **Severity**: Critical / Important / Minor
- **Location**: file:line
- **Issue**: What's wrong
- **Why it matters**: Impact if left unfixed
- **Fix**: How to resolve (if not obvious)

Also note which areas have good test coverage.
```

### Important Notes for Agent Prompts

- Include the **full diff** in each agent's prompt — they need the actual code to review, not a summary.
- Include the **file list** from `git diff --stat` so agents know the scope.
- Tell agents to **read changed files** for full context beyond the diff.
- Use `subagent_type: "general-purpose"` for both agents.

## Synthesize the Review

Once both agents return, combine their findings into a single structured review. Deduplicate any overlapping issues and apply the severity guidelines from `.claude/code-review-checklist.md` (if present).

### Output Structure

Present the review to the user in this format:

```
## Code Review: <branch-name>

### Strengths
[Specific things done well, drawn from both agents' findings]

### Issues

#### Critical (Must Fix)
[Data loss, broken idempotency, security issues, test failures]

#### Important (Should Fix)
[Missing error handling, test gaps for complex logic, type safety violations]

#### Minor (Nice to Have)
[Code style, optimization opportunities, naming]

Number each issue sequentially across all severity levels for easy reference (e.g., "fix issue 3"):
1. `file:line` — What's wrong. Why it matters. How to fix.
2. `file:line` — ...

### Recommendations
[Improvements beyond the immediate issues]

### Assessment
**Ready to merge?** [Yes / No / Yes, with fixes]
**Reasoning:** [1-2 sentence technical summary]
```

## Review Quality Rules

- **Categorize honestly** — not everything is Critical. Use the severity guidelines.
- **Be specific** — every issue needs a `file:line` reference.
- **Explain why** — the developer needs to understand the impact, not just the rule.
- **Acknowledge strengths** — good code deserves recognition.
- **Give a clear verdict** — don't hedge. Say whether it's ready to merge.
- **Don't fabricate** — only comment on code you've actually seen in the diff.
