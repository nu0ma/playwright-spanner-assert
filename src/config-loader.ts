import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import { z } from 'zod';
import { createConfigurationNotFoundError, createParsingError } from './errors';
import type {
  DatabaseConfig,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
} from './types';
const databaseSchema = z.object({
  projectId: z.string().min(1),
  instanceId: z.string().min(1),
  database: z.string().min(1),
});

const spalidateSchema = z
  .object({
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    spawnOptions: z.any().optional(),
    workingDirectory: z.string().optional(),
  })
  .optional();

const configSchema = z.object({
  schemaFile: z.string().min(1),
  defaultExpectedData: z.string().min(1).optional(),
  database: databaseSchema,
  spalidate: spalidateSchema,
});

export type ConfigLoader = {
  setConfigPath: (configPath: string | undefined) => void;
  load: (force?: boolean) => Promise<ResolvedPlaywrightSpannerAssertConfig>;
};

export function createConfigLoader(options: PlaywrightSpannerAssertOptions = {}): ConfigLoader {
  let currentOptions = { ...options };
  let cached: { path: string; config: ResolvedPlaywrightSpannerAssertConfig } | null = null;

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
    configPath: string,
  ): Promise<ResolvedPlaywrightSpannerAssertConfig> => {
    let parsedYaml: unknown;
    try {
      parsedYaml = YAML.parse(raw, { prettyErrors: true });
    } catch (error) {
      throw createParsingError(
        `Failed to parse playwright-spanner-assert.yaml: ${(error as Error).message}`,
        { configPath },
      );
    }

    const parsed = configSchema.safeParse(parsedYaml);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw createParsingError('playwright-spanner-assert.yaml validation failed', {
        configPath,
        issues,
      });
    }

    const config = parsed.data;

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
    if (!force && cached?.path === configPath) {
      return cached.config;
    }

    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = await parseConfig(raw, configPath);
    cached = { path: configPath, config: parsed };
    return parsed;
  };

  const setConfigPath = (configPath: string | undefined): void => {
    if (configPath) {
      currentOptions = { ...currentOptions, configPath };
      cached = null;
    }
  };

  return { setConfigPath, load };
}

function resolveSpalidate(
  cfg: SpalidateConfig | undefined,
  configDir: string,
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
