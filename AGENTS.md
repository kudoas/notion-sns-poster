# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains all runtime TypeScript code for the Cloudflare Worker.
- `src/index.ts` defines Hono routes (`/health-check`, `/notion-webhook`) and orchestrates posting flow.
- `src/notion.ts` handles Notion API access and webhook verification.
- `src/sns/` contains SNS integrations and shared interface/utilities:
  - `interface.ts` for poster contracts
  - `bluesky.ts`, `twitter.ts` for provider-specific implementations
  - `*.test.ts` for unit tests colocated with SNS modules
- `src/config.ts` centralizes environment configuration.
- Root config files: `wrangler.toml`, `tsconfig*.json`, `bunfig.toml`.
- `test/` is currently reserved (`.keep`) for future non-colocated tests.

## Build, Test, and Development Commands
- `bun install --frozen-lockfile`: install dependencies exactly as locked (same as CI).
- `bun run dev`: start local Cloudflare Worker via Wrangler.
- `bun run typecheck`: run TypeScript checks (`tsc --noEmit`).
- `bun test`: execute unit tests with Bun test runner.
- `bun run deploy`: deploy Worker to Cloudflare (requires auth env vars/secrets).

## Coding Style & Naming Conventions
- Language: TypeScript (ES modules) on Bun + Cloudflare Workers.
- Follow existing style in touched files; prefer 2-space indentation and explicit, small functions.
- Naming:
  - `PascalCase` for classes/types (`NotionRepository`, `SnsPoster`)
  - `camelCase` for functions/variables
  - `UPPER_SNAKE_CASE` for environment variable keys
- Keep modules focused by responsibility (`config`, `notion`, `sns/*`).

## Testing Guidelines
- Framework: `bun:test`.
- Test files use `*.test.ts` naming and are colocated near source when practical.
- Add/adjust tests for behavior changes, especially provider logic, error handling, and payload formatting.
- Run `bun run typecheck && bun test` before opening a PR.

## Commit & Pull Request Guidelines
- Use Conventional Commit style seen in history (e.g., `fix(deps): ...`, `chore(deps): ...`).
- Keep commits scoped and descriptive; avoid mixing refactor and feature work.
- PRs should include:
  - concise summary of intent and impacted modules
  - test/typecheck results
  - related issue link (if available)
  - notes on required secret/config changes (`.dev.vars`, Cloudflare secrets)

## Security & Configuration Tips
- Never commit real secrets; use `.dev.vars.sample` as a template.
- Store production credentials with `wrangler secret put`.
- Validate webhook signature paths whenever touching `src/notion.ts` or webhook handlers.
