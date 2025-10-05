# playwright-spanner-assert

A lightweight utility for triggering Cloud Spanner data validation from Playwright tests. Define schema and database metadata in `playwright-spanner-assert.yaml`, manage expected datasets in YAML files, and delegate the heavy lifting to [spalidate](https://www.npmjs.com/package/spalidate).

## Installation

```bash
npm install playwright-spanner-assert spalidate
```

If you use TypeScript, add the typings as dev dependencies:

```bash
npm install -D typescript @types/node
```

## Configuration

Place `playwright-spanner-assert.yaml` in the project root. Use `playwright-spanner-assert.yaml.example` as a starting point.

```yaml
schemaFile: ./schema/spanner-schema.yaml
expectedData: ./expected/initial-data.yaml
database:
  projectId: my-project
  instanceId: staging
  database: sample
spalidate:
  command: spalidate
  args:
    - --project
    - '{projectId}'
    - --instance
    - '{instanceId}'
    - --database
    - '{databaseName}'
    - '{expectedFile}'
```

Placeholders such as `{schemaFile}` and `{expectedFile}` are expanded before invoking `spalidate`. If you omit `args`, the default sequence shown above is used. With `expectedData` set, `validateDatabaseState('')` falls back to the configured file when the argument is blank.

Expected data files should follow the configuration format that the Go 製 `spalidate` CLI consumes, for example:

```yaml
tables:
  Samples:
    count: 1
    columns:
      Id: '1'
      Name: 'Default Name'
```

## Usage

```ts
import playwrightSpannerAssert from 'playwright-spanner-assert';
import { test } from '@playwright/test';

test.describe('example-01-basic-setup', () => {
  test('Database Validation', async () => {
    await playwrightSpannerAssert.validateDatabaseState('expected-data.yaml');
  });
});
```

To load a configuration file from a custom location, provide the factory with a `configPath`.

```ts
import { createPlaywrightSpannerAssert } from 'playwright-spanner-assert';

const client = createPlaywrightSpannerAssert({
  configPath: './configs/playwright-spanner-assert.yaml',
});
await client.validateDatabaseState('expected-data.yaml');
```

## Advanced options

`createPlaywrightSpannerAssert` に渡せる追加オプションは `onDebug` のみです。`spalidate` の実行は常に 60,000 ms でタイムアウトし、この値を変更するための設定は提供していません。

```ts
import { createPlaywrightSpannerAssert } from 'playwright-spanner-assert';

const client = createPlaywrightSpannerAssert({
  configPath: './configs/playwright-spanner-assert.yaml',
  onDebug: (event, payload) => {
    console.debug('[span-assert]', event, payload);
  },
});

await client.validateDatabaseState('expected-data.yaml');
```

## License

MIT
