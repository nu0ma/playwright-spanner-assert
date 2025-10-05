import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  createConfigurationNotFoundError,
  createMissingFieldError,
  createParsingError,
} from './errors';
import type {
  DatabaseConfig,
  PlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
} from './types';
import { validateConfigSchema } from './validatebot';

export type ConfigLoader = {
  setConfigPath: (configPath: string | undefined) => void;
  load: (force?: boolean) => Promise<ResolvedPlaywrightSpannerAssertConfig>;
};

export function createConfigLoader(
  options: PlaywrightSpannerAssertOptions = {}
): ConfigLoader {
  let currentOptions = { ...options };
  let cachedConfig: ResolvedPlaywrightSpannerAssertConfig | null = null;
  let cachedPath: string | null = null;
  let cachedMtimeMs: number | null = null;

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

  const parseConfig = async (
    raw: string,
    configPath: string
  ): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    let parsedYaml: unknown;
    try {
      parsedYaml = YAML.parse(raw, { prettyErrors: true });
    } catch (error) {
      throw createParsingError(
        `Failed to parse playwright-spanner-assert.yaml: ${(error as Error).message}`,
        { configPath }
      );
    }

    const parsed = validateConfigSchema(parsedYaml);
    if (!parsed.success) {
      throw createParsingError('playwright-spanner-assert.yaml validation failed', {
        configPath,
        issues: parsed.issues,
      });
    }

    const config = parsed.data;
    assertField(config.schemaFile, 'schemaFile');
    assertField(config.database, 'database');
    assertField(config.database.projectId, 'database.projectId');
    assertField(config.database.instanceId, 'database.instanceId');
    assertField(config.database.database, 'database.database');

    const configDir = path.dirname(configPath);
    const resolvePath = (value: string | undefined): string | undefined =>
      value ? path.resolve(configDir, value) : undefined;

    return {
      ...config,
      schemaFile: resolvePath(config.schemaFile)!,
      defaultExpectedData: resolvePath(config.defaultExpectedData),
      database: { ...config.database } satisfies DatabaseConfig,
      spalidate: resolveSpalidate(config.spalidate, configDir),
      configDir,
    } satisfies ResolvedPlaywrightSpannerAssertConfig;
  };

  const load = async (force = false): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    const configPath = await resolveConfigPath();
    const stat = await fs.stat(configPath);
    const needsReload =
      force ||
      !cachedConfig ||
      cachedPath !== configPath ||
      cachedMtimeMs !== stat.mtimeMs;

    if (!needsReload && cachedConfig) {
      return cachedConfig;
    }

    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = await parseConfig(raw, configPath);
    cachedConfig = parsed;
    cachedPath = configPath;
    cachedMtimeMs = stat.mtimeMs;
    return parsed;
  };

  const setConfigPath = (configPath: string | undefined): void => {
    if (configPath) {
      currentOptions = { ...currentOptions, configPath };
      cachedConfig = null;
      cachedPath = null;
      cachedMtimeMs = null;
    }
  };

  return { setConfigPath, load };
}

function resolveSpalidate(
  cfg: SpalidateConfig | undefined,
  configDir: string
): SpalidateConfig | undefined {
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
