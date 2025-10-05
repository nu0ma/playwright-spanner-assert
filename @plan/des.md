# Playwright Spanner Assert の実行フロー概要

1. エントリーポイント
   - `src/index.ts:1` で `createPlaywrightSpannerAssert()` を呼び出してデフォルトクライアントを生成し、デフォルトエクスポートとパブリック API を公開する。
   - 利用側はデフォルトエクスポート、または `createPlaywrightSpannerAssert` 関数を明示的に取得してクライアントを作成する。

2. クライアント生成 (`src/client.ts`)
   - `createClient()` は任意の `configPath` と `onDebug` フックを受け取り、内部で `createConfigLoader()` を構築する（外部からローダーを差し替えることも可能）。
   - 主要メソッドは以下の通り。
     - `setConfigPath(path)` はローダーへ委譲し、以後の読み込み対象ファイルを切り替える。
     - `getConfig()` はキャッシュを尊重して設定を読み込む。
     - `reloadConfig()` はキャッシュを無効化して再読み込みする。
     - `validateDatabaseState(expectedDataPath)` が中核で、設定を取得 → 期待データファイルを解決 → `runSpalidate()` を実行する。

3. 期待データファイル解決 (`resolveExpectedFile`)
   - 文字列が空白のみの場合は即座に `ExpectedDataNotFoundError` を送出する。
   - 検索ルートは設定ディレクトリ（`configDir`）を優先し、必要に応じて `process.cwd()` を補助的に探索する。ただし `configDir` 配下に収まらないパスは `path.relative` の判定で拒否する。
   - ファイル存在確認には `fs.access` を使用。最初に見つかったパスを返し、見つからない場合は `ExpectedDataNotFoundError` を送出する。

4. 設定ローダー (`src/config-loader.ts`)
   - 設定ファイルパスは以下の優先順位で決定する：明示的 `configPath` → 環境変数 `PLAYWRIGHT_SPANNER_ASSERT_CONFIG` → カレントディレクトリの `playwright-spanner-assert.yaml`。
   - ファイル未存在時は `ConfigurationNotFoundError` を送出。
   - 読み込んだ YAML を `zod` スキーマでバリデーションし、`schemaFile` や `spalidate.workingDirectory` などは設定ファイルの所在ディレクトリを基準に絶対パスへ解決する。
   - 成功した設定は `{ path, config }` としてキャッシュし、同一パスに対しては再利用する。`load(true)` でキャッシュを破棄して再読込。

5. Spalidate 実行 (`src/spalidate-runner.ts`)
   - コマンドは設定の `spalidate.command` が優先され、未指定なら `spalidate` を利用。引数は `commandArgs` → 既定の `--project {projectId}` など → `extraArgs` の順で構成され、必要に応じてレガシーな `args` で完全上書きもできる。
   - プレースホルダは設定と期待データから `schemaFile`・`projectId`・`expectedFile` などをマッピングした上で `{key}` を置換する。
   - 実行時は `child_process.spawn` を用い、`stdio: 'inherit'` で出力をそのまま流す。Windows では `shell: true` を指定。追加の環境変数や `spawnOptions` もマージされる。
   - 実行前に `onDebug` フックがあれば `command`・`args`・`cwd` を通知する。
   - 60 秒のタイムアウトを設け、子プロセスが終了しない場合は強制終了して `SpalidateExecutionError` を送出。非ゼロ終了コードや起動失敗時も同様にエラー変換する。

6. エラー種別 (`src/errors.ts`)
   - 設定ファイルの欠如・不正、必須フィールド不足、期待データ未発見、`spalidate` 実行失敗などを専用コード付きで例外化し、利用側が原因を判別しやすい構造になっている。

以上の流れで、ライブラリは Playwright テストから Cloud Spanner の状態検証を自動化する。利用者は YAML 設定と期待データを整備し、テスト内で `validateDatabaseState(expectedPath)` を呼び出すだけで `spalidate` コマンドを安全に起動できるようになっている。
