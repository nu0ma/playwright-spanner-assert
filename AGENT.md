# Project Overview

## Purpose
`playwright-spanner-assert` is a Playwright helper library that triggers Cloud Spanner state validation via the external `spalidate` CLI. It wraps the CLI with a friendly TypeScript API so end-to-end browser tests can assert database contents against YAML fixtures.

## Key Components
- **Client factory (`src/client.ts`)** – Loads configuration, resolves expected-data files, and runs `spalidate` with placeholder substitution and optional debug hooks.
- **Configuration loader (`src/config-loader.ts`)** – Reads `playwright-spanner-assert.yaml`, validates it with Zod, expands relative paths, and caches results.
- **Spalidate runner (`src/spalidate-runner.ts`)** – Spawns the CLI with default or user-supplied command/arguments, enforces a 60s timeout, and surfaces rich error objects from `src/errors.ts`.
- **Public API (`src/index.ts`, `src/public-api.ts`)** – Exposes a default client plus factory helpers alongside typed error constructors and config types.

## Configuration & Usage
1. Install `playwright-spanner-assert` alongside the `spalidate` binary and define your Cloud Spanner schema/fixtures in YAML.
2. Create `playwright-spanner-assert.yaml` (see `playwright-spanner-assert.yaml.example`) to describe schema, default expected data, and database metadata. Optional overrides let you customize the CLI command, arguments, env vars, and working directory.
3. In Playwright tests, call `validateDatabaseState('<expected>.yaml')`; omit the argument to fall back to `defaultExpectedData`. Use `createPlaywrightSpannerAssert({ configPath })` when you need multiple configs.

## Tooling Notes
- Written in TypeScript; build output lives under `dist/` and is controlled by `tsconfig.json` plus `tsdown.config.ts`.
- Example fixtures and Playwright scenarios reside in `examples/` and `tests/`.
- Scripts in `package.json` and `Taskfile.yml` support formatting, linting, and test execution.

## Error Handling
Custom errors provide machine-readable `code` values (`CONFIG_NOT_FOUND`, `CONFIG_INVALID`, `EXPECTED_DATA_NOT_FOUND`, `SPALIDATE_FAILED`, etc.) to help consumers distinguish configuration, data, and runtime failures.
