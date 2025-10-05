# playwright-spanner-assert

Playwright のテストから Cloud Spanner のデータ検証を呼び出すための軽量ユーティリティです。設定ファイル（`playwright-spanner-assert.yaml`）でスキーマやデータベース情報を定義し、期待データは YAML ファイルで管理します。検証処理自体は [spalidate](https://www.npmjs.com/package/spalidate) に委譲します。

## インストール

```bash
npm install playwright-spanner-assert spalidate
```

TypeScript を利用する場合は以下も追加してください。

```bash
npm install -D typescript @types/node
```

## 設定ファイル

プロジェクトルートに `playwright-spanner-assert.yaml` を配置します。雛型は `playwright-spanner-assert.yaml.example` を参照してください。

```yaml
schemaFile: ./schema/spanner-schema.yaml
defaultExpectedData: ./expected/initial-data.yaml
database:
  projectId: my-project
  instanceId: staging
  database: sample
spalidate:
  command: npx
  args:
    - spalidate
    - validate
    - --schema
    - "{schemaFile}"
    - --project
    - "{projectId}"
    - --instance
    - "{instanceId}"
    - --database
    - "{databaseName}"
    - --expected
    - "{expectedFile}"
```

`spalidate.args` では `{schemaFile}` や `{expectedFile}` などのプレースホルダが利用できます。未指定の場合は上記の既定値が使われます。`defaultExpectedData` を設定すると `validateDatabaseState('')` のように空文字で呼び出した場合にも既定ファイルを利用できます。

## 使い方

```ts
import playwrightSpannerAssert from 'playwright-spanner-assert';
import { test } from '@playwright/test';

test.describe('example-01-basic-setup', () => {
  test('Database Validation', async () => {
    await playwrightSpannerAssert.validateDatabaseState('expected-data.yaml');
    await playwrightSpannerAssert.validateDatabaseState(''); // defaultExpectedData を利用
  });
});
```

設定ファイルの場所を変更したい場合は環境変数 `PLAYWRIGHT_SPANNER_ASSERT_CONFIG` か `PlaywrightSpannerAssert` クラスを直接利用してください。

```ts
import { PlaywrightSpannerAssert } from 'playwright-spanner-assert';

const client = new PlaywrightSpannerAssert({ configPath: './configs/playwright-spanner-assert.yaml' });
await client.validateDatabaseState('expected-data.yaml');
```

## ライセンス

MIT
