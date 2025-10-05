import path from 'path';
import { createConfigLoader } from './config-loader';
import {
  createExpectedDataNotFoundError,
} from './errors';
import { ensureWithinBase } from './path-utils';
import type {
  ConfigLoader,
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
} from './types';
import { runSpalidate } from './spalidate-runner';

export type CreateClientOptions = PlaywrightSpannerAssertOptions & {
  configLoader?: ConfigLoader;
  defaultExpectedDataFallback?: boolean;
  timeoutMs?: number;
  onDebug?: (message: string, payload?: Record<string, unknown>) => void;
};

export function createClient(options: CreateClientOptions = {}): PlaywrightSpannerAssertClient {
  const {
    configLoader: providedLoader,
    timeoutMs,
    onDebug,
    ...loaderOptions
  } = options;
  const configLoader = providedLoader ?? createConfigLoader(loaderOptions);

  const setConfigPath = (configPath: string): void => {
    configLoader.setConfigPath(configPath);
  };

  const validateDatabaseState = async (expectedDataPath?: string): Promise<void> => {
    const config = await configLoader.load();
    const expectedFile = await resolveExpectedFile(expectedDataPath, config);
    await runSpalidate({
      config,
      expectedFile,
      timeoutMs,
      onDebug,
    });
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

async function resolveExpectedFile(
  rawPath: string | undefined,
  config: ResolvedPlaywrightSpannerAssertConfig
): Promise<string> {
  const trimmed = rawPath?.trim() ?? '';
  const candidates: string[] = [];

  if (trimmed.length > 0) {
    candidates.push(path.resolve(config.configDir, trimmed));
    candidates.push(path.resolve(process.cwd(), trimmed));
  } else if (config.defaultExpectedData) {
    candidates.push(config.defaultExpectedData);
  }

  for (const candidate of candidates) {
    let guarded: string;
    try {
      guarded = ensureWithinBase(candidate, { baseDir: config.configDir });
    } catch {
      throw createExpectedDataNotFoundError(candidate);
    }
    try {
      await fsAccess(guarded);
      return guarded;
    } catch {
      continue;
    }
  }

  const messagePath = trimmed.length > 0 ? trimmed : config.defaultExpectedData ?? 'unknown';
  throw createExpectedDataNotFoundError(messagePath);
}

async function fsAccess(targetPath: string): Promise<void> {
  const { promises: fs } = await import('fs');
  await fs.access(targetPath);
}
