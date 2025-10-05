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
};

export type PlaywrightSpannerAssertConfig = {
  schemaFile: string;
  defaultExpectedData?: string;
  database: DatabaseConfig;
  spalidate?: SpalidateConfig;
};

export type ResolvedPlaywrightSpannerAssertConfig = PlaywrightSpannerAssertConfig & {
  schemaFile: string;
  defaultExpectedData?: string;
  configDir: string;
};

export type PlaywrightSpannerAssertOptions = {
  configPath?: string;
};

export type PlaceholderMap = Record<string, string>;

export type PlaywrightSpannerAssertClient = {
  setConfigPath: (configPath: string) => void;
  validateDatabaseState: (expectedDataPath?: string) => Promise<void>;
};
