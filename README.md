# playwright-spanner-assert

A simple utility for validating Cloud Spanner data from Playwright tests.

## Quick Start

### 1. Install

```bash
npm install playwright-spanner-assert spalidate
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

```bash
npm install playwright-spanner-assert spalidate
```

[spalidate](https://www.npmjs.com/package/spalidate) is a Cloud Spanner data validation tool and is required as a peer dependency.

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

### Optional settings

```yaml
database:
  projectId: my-project
  instanceId: my-instance
  database: my-database

# Default expected data file (optional)
expectedData: ./expected/initial-data.yaml
```

With `expectedData` set, you can omit the argument in `validateDatabaseState('')`.

## Usage

### Basic usage

```ts
import { test } from '@playwright/test';
import playwrightSpannerAssert from 'playwright-spanner-assert';

test('database validation', async () => {
  await playwrightSpannerAssert.validateDatabaseState('expected/data.yaml');
});
```

### Using a custom config file

```ts
import { createPlaywrightSpannerAssert } from 'playwright-spanner-assert';

const client = createPlaywrightSpannerAssert({
  configPath: './config/spanner-test.yaml',
});

await client.validateDatabaseState('expected/data.yaml');
```

### Expected data file format

Follow the [spalidate](https://www.npmjs.com/package/spalidate) format:

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

## Advanced

### Enable debug logging

```ts
const client = createPlaywrightSpannerAssert({
  onDebug: (event, payload) => {
    console.log('[debug]', event, payload);
  },
});
```

### Timeout

spalidate execution times out after 60 seconds (not configurable).

## License

MIT
