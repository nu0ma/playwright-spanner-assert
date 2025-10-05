import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import { z } from 'zod';
import { ConfigurationNotFoundError, ParsingError } from './errors';
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
  expectedData: z.string().min(1).optional(),
  database: databaseSchema,
  spalidate: spalidateSchema,
});

export async function loadConfig(
  options: PlaywrightSpannerAssertOptions = {},
): Promise<ResolvedPlaywrightSpannerAssertConfig> {
  const configPath = await resolveConfigPath(options.configPath);
  const raw = await fs.readFile(configPath, 'utf8');
  return parseConfig(raw, configPath);
}

async function resolveConfigPath(explicitPath?: string): Promise<string> {
  if (explicitPath) {
    try {
      await fs.access(explicitPath);
      return explicitPath;
    } catch {
      throw new ConfigurationNotFoundError(explicitPath);
    }
  }

  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (true) {
    const candidatePath = path.join(currentDir, 'playwright-spanner-assert.yaml');
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      if (currentDir === root) {
        break;
      }
      currentDir = path.dirname(currentDir);
    }
  }

  throw new ConfigurationNotFoundError('playwright-spanner-assert.yaml');
}

async function parseConfig(
  raw: string,
  configPath: string,
): Promise<ResolvedPlaywrightSpannerAssertConfig> {
  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(raw, { prettyErrors: true });
  } catch (error) {
    throw new ParsingError(
      `Failed to parse playwright-spanner-assert.yaml: ${(error as Error).message}`,
    );
  }

  const parsed = configSchema.safeParse(parsedYaml);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new ParsingError(`playwright-spanner-assert.yaml validation failed:\n${issues}`);
  }

  const config = parsed.data;

  const configDir = path.dirname(configPath);
  const resolvePath = (value: string | undefined): string | undefined =>
    value ? path.resolve(configDir, value) : undefined;

  return {
    ...config,
    schemaFile: resolvePath(config.schemaFile)!,
    expectedData: resolvePath(config.expectedData),
    database: { ...config.database } satisfies DatabaseConfig,
    spalidate: resolveSpalidate(config.spalidate, configDir),
    configDir,
  } satisfies ResolvedPlaywrightSpannerAssertConfig;
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
