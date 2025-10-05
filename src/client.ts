import { promises as fs } from 'fs';
import path from 'path';
import { createConfigLoader } from './config-loader';
import { createExpectedDataNotFoundError } from './errors';
import type {
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
} from './types';
import { runSpalidate } from './spalidate-runner';

export type CreateClientOptions = PlaywrightSpannerAssertOptions & {
  onDebug?: (message: string, payload?: Record<string, unknown>) => void;
};

export function createClient(options: CreateClientOptions = {}): PlaywrightSpannerAssertClient {
  const { onDebug, configPath } = options;
  const configLoader = createConfigLoader({ configPath });

  const setConfigPath = (configPath: string): void => {
    configLoader.setConfigPath(configPath);
  };

  const validateDatabaseState = async (expectedDataPath?: string): Promise<void> => {
    const config = await configLoader.load();
    const expectedFile = await resolveExpectedFile(expectedDataPath, config);
    await runSpalidate({
      config,
      expectedFile,
      onDebug,
    });
  };

  return {
    setConfigPath,
    validateDatabaseState,
  };
}

async function resolveExpectedFile(
  rawPath: string | undefined,
  config: ResolvedPlaywrightSpannerAssertConfig,
): Promise<string> {
  const trimmed = rawPath?.trim() ?? '';
  const searchRoots = trimmed ? [config.configDir, process.cwd()] : [config.configDir];
  const fileName = trimmed || config.defaultExpectedData;

  if (!fileName) {
    throw createExpectedDataNotFoundError('default expected data is not set');
  }

  for (const root of searchRoots) {
    const absolute = path.resolve(root, fileName);
    if (!isWithin(absolute, config.configDir)) {
      continue;
    }
    try {
      await fs.access(absolute);
      return absolute;
    } catch {
      // try next candidate
    }
  }

  throw createExpectedDataNotFoundError(fileName);
}

function isWithin(target: string, baseDir: string): boolean {
  const relative = path.relative(path.resolve(baseDir), target);
  return !relative.startsWith('..');
}
