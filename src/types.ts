import type { SpawnOptionsWithoutStdio } from 'child_process';

export interface DatabaseConfig {
  projectId: string;
  instanceId: string;
  database: string;
}

export interface SpalidateConfig {
  /**
   * 実行するコマンド。指定がない場合は `npx` を使用します。
   */
  command?: string;
  /**
   * コマンドに渡す引数。`{schemaFile}` や `{expectedFile}` などのプレースホルダを利用できます。
   */
  args?: string[];
  /**
   * コマンドに追加する環境変数。
   */
  env?: Record<string, string>;
  /**
   * `child_process.spawn` に渡す追加オプション。`cwd` と `env` は上書きされます。
   */
  spawnOptions?: Omit<SpawnOptionsWithoutStdio, 'env' | 'cwd'>;
  /**
   * 実行時に利用する作業ディレクトリ。省略時は設定ファイルのディレクトリを使用します。
   */
  workingDirectory?: string;
}

export interface PlaywrightSpannerAssertConfig {
  /** Cloud Spanner のスキーマ定義ファイルへのパス */
  schemaFile: string;
  /** `validateDatabaseState` 呼び出し時にパス未指定の場合の期待データファイル */
  defaultExpectedData?: string;
  /** Cloud Spanner 接続に必要な識別子 */
  database: DatabaseConfig;
  /** spalidate の実行に関する設定 */
  spalidate?: SpalidateConfig;
}

export interface ResolvedPlaywrightSpannerAssertConfig extends PlaywrightSpannerAssertConfig {
  /** 絶対パスへ解決済みのスキーマファイル */
  schemaFile: string;
  /** 絶対パスへ解決済みの期待データファイル */
  defaultExpectedData?: string;
  /** 設定ファイルがあるディレクトリ */
  configDir: string;
}

export interface PlaywrightSpannerAssertOptions {
  /** カスタムの設定ファイルパス。未指定時は `process.env.PLAYWRIGHT_SPANNER_ASSERT_CONFIG` か カレントディレクトリを探索します。 */
  configPath?: string;
}

export type PlaceholderMap = Record<string, string>;
