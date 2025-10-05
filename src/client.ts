import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig, resolveExpectedFile } from './config-loader';
import { ExpectedDataNotFoundError } from './errors';
import type {
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
} from './types';
import { runSpalidate } from './validation';

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
