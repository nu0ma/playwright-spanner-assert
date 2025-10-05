import { spawn, type SpawnOptionsWithoutStdio } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';

type DatabaseConfig = {
  projectId: string;
  instanceId: string;
  database: string;
};

type SpalidateConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  spawnOptions?: Omit<SpawnOptionsWithoutStdio, 'env' | 'cwd'>;
  workingDirectory?: string;
};

type PlaywrightSpannerAssertConfig = {
  schemaFile: string;
  defaultExpectedData?: string;
  database: DatabaseConfig;
  spalidate?: SpalidateConfig;
};

type ResolvedPlaywrightSpannerAssertConfig = PlaywrightSpannerAssertConfig & {
  schemaFile: string;
  defaultExpectedData?: string;
  configDir: string;
};

type PlaywrightSpannerAssertOptions = {
  configPath?: string;
};

type PlaceholderMap = Record<string, string>;

type PlaywrightSpannerAssertClient = {
  setConfigPath: (configPath: string) => void;
  validateDatabaseState: (expectedDataPath?: string) => Promise<void>;
  reloadConfig: () => Promise<ResolvedPlaywrightSpannerAssertConfig>;
  getConfig: () => Promise<ResolvedPlaywrightSpannerAssertConfig>;
};

type ConfigLoader = {
  setConfigPath: (configPath: string | undefined) => void;
  load: (force?: boolean) => Promise<ResolvedPlaywrightSpannerAssertConfig>;
};

const DEFAULT_COMMAND = 'npx';
const DEFAULT_ARGS = [
  'spalidate',
  'validate',
  '--schema',
  '{schemaFile}',
  '--project',
  '{projectId}',
  '--instance',
  '{instanceId}',
  '--database',
  '{databaseName}',
  '--expected',
  '{expectedFile}',
];

function createError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function createConfigurationNotFoundError(path: string): Error {
  return createError('ConfigurationNotFoundError', `playwright-spanner-assert.yaml not found: ${path}`);
}

function createMissingFieldError(field: string): Error {
  return createError(
    'MissingFieldError',
    `Missing required field in playwright-spanner-assert.yaml: ${field}`
  );
}

function createExpectedDataNotFoundError(pathValue: string): Error {
  return createError('ExpectedDataNotFoundError', `Expected data file not found: ${pathValue}`);
}

function createParsingError(message: string): Error {
  return createError('PlaywrightSpannerAssertError', message);
}

function createSpalidateExecutionError(message: string): Error {
  return createError('SpalidateExecutionError', message);
}

function createConfigLoader(options: PlaywrightSpannerAssertOptions = {}): ConfigLoader {
  let currentOptions = { ...options };
  let cachedConfig: ResolvedPlaywrightSpannerAssertConfig | null = null;

  const resolveConfigPath = async (): Promise<string> => {
    const candidate =
      currentOptions.configPath ||
      process.env.PLAYWRIGHT_SPANNER_ASSERT_CONFIG ||
      path.join(process.cwd(), 'playwright-spanner-assert.yaml');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      throw createConfigurationNotFoundError(candidate);
    }
  };

  const parseConfig = async (configPath: string): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    const raw = await fs.readFile(configPath, 'utf8');
    let parsed: PlaywrightSpannerAssertConfig | null = null;
    try {
      parsed = YAML.parse(raw) as PlaywrightSpannerAssertConfig;
    } catch (error) {
      throw createParsingError(
        `Failed to parse playwright-spanner-assert.yaml: ${(error as Error).message}`
      );
    }

    if (!parsed) {
      throw createParsingError('playwright-spanner-assert.yaml is empty or invalidly formatted');
    }

    assertField(parsed.schemaFile, 'schemaFile');
    assertField(parsed.database, 'database');
    assertField(parsed.database.projectId, 'database.projectId');
    assertField(parsed.database.instanceId, 'database.instanceId');
    assertField(parsed.database.database, 'database.database');

    const configDir = path.dirname(configPath);
    const resolvePath = (value: string | undefined): string | undefined =>
      value ? path.resolve(configDir, value) : undefined;

    const resolvedSpalidate = resolveSpalidate(parsed.spalidate, configDir);

    return {
      ...parsed,
      schemaFile: resolvePath(parsed.schemaFile)!,
      defaultExpectedData: resolvePath(parsed.defaultExpectedData),
      database: { ...parsed.database },
      spalidate: resolvedSpalidate,
      configDir,
    };
  };

  const load = async (force = false): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    if (!force && cachedConfig) {
      return cachedConfig;
    }
    const configPath = await resolveConfigPath();
    cachedConfig = await parseConfig(configPath);
    return cachedConfig;
  };

  const setConfigPath = (configPath: string | undefined): void => {
    if (configPath) {
      currentOptions = { ...currentOptions, configPath };
      cachedConfig = null;
    }
  };

  return { setConfigPath, load };
}

function resolveSpalidate(cfg: SpalidateConfig | undefined, configDir: string): SpalidateConfig | undefined {
  if (!cfg) {
    return undefined;
  }
  const resolved: SpalidateConfig = { ...cfg };
  if (cfg.workingDirectory) {
    resolved.workingDirectory = path.resolve(configDir, cfg.workingDirectory);
  }
  return resolved;
}

function assertField<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw createMissingFieldError(name);
  }
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runSpalidate(options: {
  config: ResolvedPlaywrightSpannerAssertConfig;
  expectedFile: string;
}): Promise<void> {
  const { config, expectedFile } = options;
  const command = config.spalidate?.command ?? DEFAULT_COMMAND;
  const argsTemplate = config.spalidate?.args ?? DEFAULT_ARGS;
  const cwd = config.spalidate?.workingDirectory ?? config.configDir;
  const placeholderValues = buildPlaceholderMap(config, expectedFile);
  const args = argsTemplate.map((value) => replacePlaceholders(value, placeholderValues));
  const env = {
    ...process.env,
    ...config.spalidate?.env,
  };
  const spawnOverrides = sanitizeSpawnOptions(config.spalidate?.spawnOptions);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...spawnOverrides,
    });

    child.on('error', (error) => {
      reject(createSpalidateExecutionError(`Failed to launch spalidate: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          createSpalidateExecutionError(
            `spalidate exited with non-zero code (${code ?? 'unknown'})`
          )
        );
      }
    });
  });
}

function buildPlaceholderMap(
  config: ResolvedPlaywrightSpannerAssertConfig,
  expectedFile: string
): PlaceholderMap {
  return {
    schemaFile: config.schemaFile,
    expectedFile,
    projectId: config.database.projectId,
    instanceId: config.database.instanceId,
    databaseName: config.database.database,
    configDir: config.configDir,
    expectedDir: path.dirname(expectedFile),
  };
}

function replacePlaceholders(template: string, placeholders: PlaceholderMap): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = placeholders[key];
    return value !== undefined ? value : match;
  });
}

function sanitizeSpawnOptions(
  options: SpalidateConfig['spawnOptions']
): Record<string, unknown> | undefined {
  if (!options) {
    return undefined;
  }
  const sanitized: Record<string, unknown> = { ...options };
  delete sanitized.cwd;
  delete sanitized.env;
  return sanitized;
}

async function resolveExpectedFile(
  rawPath: string | undefined,
  config: ResolvedPlaywrightSpannerAssertConfig
): Promise<string> {
  const trimmed = rawPath?.trim() ?? '';
  if (trimmed.length > 0) {
    const candidates = [
      path.resolve(config.configDir, trimmed),
      path.resolve(process.cwd(), trimmed),
    ];
    for (const candidate of candidates) {
      if (await fileExists(candidate)) {
        return candidate;
      }
    }
    throw createExpectedDataNotFoundError(trimmed);
  }

  if (config.defaultExpectedData) {
    if (!(await fileExists(config.defaultExpectedData))) {
      throw createExpectedDataNotFoundError(config.defaultExpectedData);
    }
    return config.defaultExpectedData;
  }

  throw createExpectedDataNotFoundError('Default expected data file is not configured');
}

function createPlaywrightSpannerAssert(
  options: PlaywrightSpannerAssertOptions = {}
): PlaywrightSpannerAssertClient {
  const configLoader = createConfigLoader(options);

  const setConfigPath = (configPath: string): void => {
    configLoader.setConfigPath(configPath);
  };

  const validateDatabaseState = async (expectedDataPath?: string): Promise<void> => {
    const config = await configLoader.load();
    const expectedFile = await resolveExpectedFile(expectedDataPath, config);
    await runSpalidate({ config, expectedFile });
  };

  const reloadConfig = async (): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    return configLoader.load(true);
  };

  const getConfig = async (): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    return configLoader.load();
  };

  return {
    setConfigPath,
    validateDatabaseState,
    reloadConfig,
    getConfig,
  };
}

const defaultClient = createPlaywrightSpannerAssert();

export type {
  DatabaseConfig,
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
};

export {
  createConfigurationNotFoundError,
  createExpectedDataNotFoundError,
  createMissingFieldError,
  createParsingError,
  createPlaywrightSpannerAssert,
  createSpalidateExecutionError,
};

export default defaultClient;
