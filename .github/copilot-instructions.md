# Copilot Instructions for This Repository

## Project Context
- This repository is a Cloudflare Workers app (Hono + Bun + TypeScript) that receives Notion webhooks and posts to Bluesky/Twitter.
- Core files:
  - `src/index.ts`: webhook route and orchestration
  - `src/notion.ts`: Notion API + webhook signature verification
  - `src/sns/*.ts`: SNS posting implementations

## Review Priorities (in order)
1. Prevent behavioral regressions in webhook processing and posting flow.
2. Catch security issues (signature verification, secret leakage, unsafe logging).
3. Ensure testability and adequate test updates.
4. Keep changes small, focused, and consistent with existing code.

## What Copilot Should Check
- Webhook verification is preserved and validated before processing business logic.
- Secrets/tokens are never hardcoded, committed, or printed to logs.
- Error handling does not swallow failures silently.
- Posting status updates are logically correct (flag if article is marked posted when all SNS posts failed).
- Changes to SNS integrations include/adjust unit tests (`*.test.ts` with `bun:test`).
- Environment variable additions are reflected in `.dev.vars.sample`, docs, and deployment assumptions.

## Commands to Reference in Reviews
- `bun run typecheck`
- `bun test`
- `bun run dev`

## Code Style Expectations
- TypeScript with ES modules.
- Prefer explicit types over `any`; keep functions single-purpose.
- Follow existing naming:
  - `PascalCase` for classes/types
  - `camelCase` for variables/functions
  - `UPPER_SNAKE_CASE` for env keys
- Avoid large refactors unless explicitly requested.

## PR Feedback Format
- Prioritize actionable findings with file paths and concrete fix suggestions.
- Distinguish:
  - must-fix issues (bug/security/regression)
  - optional improvements (readability/refactor)
- For documentation-only PRs, keep feedback lightweight and skip unnecessary code-level concerns.
