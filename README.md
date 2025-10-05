# playwright-spanner-assert

A simple utility for validating Cloud Spanner data from Playwright tests.

[![npm version](https://img.shields.io/npm/v/playwright-spanner-assert)](https://www.npmjs.com/package/playwright-spanner-assert)
[![CI](https://github.com/nu0ma/playwright-spanner-assert/actions/workflows/ci.yml/badge.svg)](https://github.com/nu0ma/playwright-spanner-assert/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nu0ma/playwright-spanner-assert)

## Example

```ts
import { test } from '@playwright/test';
import playwrightSpannerAssert from 'playwright-spanner-assert';

test('user is created correctly', async () => {
  // Your test code...

  // Validate Spanner state with expected data
  await playwrightSpannerAssert.validateDatabaseState('expected/user.yaml');
});
```

### Expected data file format example

Follow the [spalidate](https://github.com/nu0ma/spalidate) format:

```yaml
tables:
  Users:
    count: 1
    columns:
      Id: '1'
      Name: 'Alice'
      Email: 'alice@example.com'

  Posts:
    count: 3
    columns:
      UserId: '1'
```

## Quick Start

### 1. Install

```bash
npm install playwright-spanner-assert
go install github.com/nu0ma/spalidate@latest
```

### 2. Create config file

Create `playwright-spanner-assert.yaml` in your project root:

```yaml
database:
  projectId: my-project
  instanceId: my-instance
  database: my-database
```

### 3. Create expected data file

Create `expected/users.yaml`:

```yaml
tables:
  Users:
    count: 2
    columns:
      Id: '1'
      Name: 'Alice'
```

### 4. Use in tests

```ts
import { test } from '@playwright/test';
import playwrightSpannerAssert from 'playwright-spanner-assert';

test('user is created correctly', async ({ page }) => {
  // Interact with your app
  await page.goto('/signup');
  await page.fill('input[name="name"]', 'Alice');
  await page.click('button[type="submit"]');

  // Validate database state
  await playwrightSpannerAssert.validateDatabaseState('expected/users.yaml');
});
```

Done! That's all you need 🎉

---

## Installation

### 1. Install Node.js package

```bash
npm install playwright-spanner-assert
```

### 2. Install spalidate CLI (Go binary)

[spalidate](https://github.com/nu0ma/spalidate) is a Cloud Spanner data validation tool written in Go and is required to run validations.

```bash
go install github.com/nu0ma/spalidate@latest
```

Make sure `spalidate` is in your PATH.

## Configuration

### Minimal config

Place `playwright-spanner-assert.yaml` in your project root:

```yaml
database:
  projectId: my-project
  instanceId: my-instance
  database: my-database
```

That's all you need.

## License

MIT
