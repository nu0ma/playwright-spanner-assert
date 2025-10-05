import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig } from './config-loader';
import { ExpectedDataNotFoundError } from './errors';
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

  const validateDatabaseState = async (expectedDataPath?: string): Promise<void> => {
    const config = await loadConfig({ configPath });
    const expectedFile = await resolveExpectedFile(expectedDataPath, config);
    await runSpalidate({
      config,
      expectedFile,
      onDebug,
    });
  };

  return {
    validateDatabaseState,
  };
}

async function resolveExpectedFile(
  rawPath: string | undefined,
  config: ResolvedPlaywrightSpannerAssertConfig,
): Promise<string> {
  const trimmed = rawPath?.trim() ?? '';
  const searchRoots = trimmed ? [config.configDir, process.cwd()] : [config.configDir];
  const fileName = trimmed || config.expectedData;

  if (!fileName) {
    throw new ExpectedDataNotFoundError('default expected data is not set');
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

  throw new ExpectedDataNotFoundError(fileName);
}

function isWithin(target: string, baseDir: string): boolean {
  const relative = path.relative(path.resolve(baseDir), target);
  return !relative.startsWith('..');
}
