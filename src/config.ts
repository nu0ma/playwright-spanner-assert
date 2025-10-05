import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  ConfigurationNotFoundError,
  MissingFieldError,
  PlaywrightSpannerAssertError,
} from './errors';
import type {
  ResolvedPlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
  SpalidateConfig,
} from './types';

export class ConfigLoader {
  private readonly options: PlaywrightSpannerAssertOptions;
  private cachedConfig: ResolvedPlaywrightSpannerAssertConfig | null = null;
  private cachedPath: string | null = null;

  constructor(options: PlaywrightSpannerAssertOptions = {}) {
    this.options = { ...options };
  }

  setConfigPath(configPath: string | undefined): void {
    if (configPath) {
      this.options.configPath = configPath;
      this.cachedConfig = null;
      this.cachedPath = null;
    }
  }

  async load(force = false): Promise<ResolvedPlaywrightSpannerAssertConfig> {
    if (!force && this.cachedConfig) {
      return this.cachedConfig;
    }

    const configPath = await this.resolveConfigPath();
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = this.parseConfig(raw, configPath);
    this.cachedConfig = parsed;
    this.cachedPath = configPath;
    return parsed;
  }

  clear(): void {
    this.cachedConfig = null;
    this.cachedPath = null;
  }

  private async resolveConfigPath(): Promise<string> {
    const candidate =
      this.options.configPath ||
      process.env.PLAYWRIGHT_SPANNER_ASSERT_CONFIG ||
      path.join(process.cwd(), 'playwright-spanner-assert.yaml');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      throw new ConfigurationNotFoundError(candidate);
    }
  }

  private parseConfig(raw: string, configPath: string): ResolvedPlaywrightSpannerAssertConfig {
    let parsed: PlaywrightSpannerAssertConfig | null = null;
    try {
      parsed = YAML.parse(raw) as PlaywrightSpannerAssertConfig;
    } catch (error) {
      throw new PlaywrightSpannerAssertError(`playwright-spanner-assert.yaml の解析に失敗しました: ${(error as Error).message}`);
    }

    if (!parsed) {
      throw new PlaywrightSpannerAssertError('playwright-spanner-assert.yaml が空、もしくは不正な形式です');
    }

    this.assertField(parsed.schemaFile, 'schemaFile');
    this.assertField(parsed.database, 'database');
    this.assertField(parsed.database.projectId, 'database.projectId');
    this.assertField(parsed.database.instanceId, 'database.instanceId');
    this.assertField(parsed.database.database, 'database.database');

    const configDir = path.dirname(configPath);
    const resolvePath = (value: string | undefined): string | undefined =>
      value ? path.resolve(configDir, value) : undefined;

    const resolvedSpalidate = this.resolveSpalidate(parsed.spalidate, configDir);

    return {
      ...parsed,
      schemaFile: resolvePath(parsed.schemaFile)!,
      defaultExpectedData: resolvePath(parsed.defaultExpectedData),
      database: { ...parsed.database },
      spalidate: resolvedSpalidate,
      configDir,
    };
  }

  private resolveSpalidate(cfg: SpalidateConfig | undefined, configDir: string): SpalidateConfig | undefined {
    if (!cfg) {
      return undefined;
    }
    const resolved: SpalidateConfig = { ...cfg };
    if (cfg.workingDirectory) {
      resolved.workingDirectory = path.resolve(configDir, cfg.workingDirectory);
    }
    return resolved;
  }

  private assertField<T>(value: T | null | undefined, name: string): asserts value is T {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      throw new MissingFieldError(name);
    }
  }
}
