import { type SpawnOptionsWithoutStdio } from 'child_process';

export type DatabaseConfig = {
  projectId: string;
  instanceId: string;
  database: string;
};

export type SpalidateConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  spawnOptions?: Omit<SpawnOptionsWithoutStdio, 'env' | 'cwd'>;
  workingDirectory?: string;
  timeout?: number;
};

export type PlaywrightSpannerAssertConfig = {
  database: DatabaseConfig;
  expectedData?: string;
  schemaFile?: string;
  spalidate?: SpalidateConfig;
};

export type ResolvedPlaywrightSpannerAssertConfig = PlaywrightSpannerAssertConfig & {
  schemaFile?: string;
  expectedData?: string;
  configDir: string;
};

export type PlaywrightSpannerAssertOptions = {
  configPath?: string;
};

export type PlaceholderMap = Record<string, string>;

export type PlaywrightSpannerAssertClient = {
  validateDatabaseState: (expectedDataPath?: string) => Promise<void>;
};
