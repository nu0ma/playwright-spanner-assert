import path from 'path';
import { ConfigLoader } from './config';
import { ExpectedDataNotFoundError } from './errors';
import { fileExists } from './fs-utils';
import { runSpalidate } from './spalidate-runner';
import type {
  ResolvedPlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
} from './types';

export class PlaywrightSpannerAssert {
  private readonly configLoader: ConfigLoader;

  constructor(options: PlaywrightSpannerAssertOptions = {}) {
    this.configLoader = new ConfigLoader(options);
  }

  setConfigPath(configPath: string): void {
    this.configLoader.setConfigPath(configPath);
  }

  async validateDatabaseState(expectedDataPath?: string): Promise<void> {
    const config = await this.configLoader.load();
    const expectedFile = await this.resolveExpectedFile(expectedDataPath, config);
    await runSpalidate({ config, expectedFile });
  }

  async reloadConfig(): Promise<ResolvedPlaywrightSpannerAssertConfig> {
    return this.configLoader.load(true);
  }

  async getConfig(): Promise<ResolvedPlaywrightSpannerAssertConfig> {
    return this.configLoader.load();
  }

  private async resolveExpectedFile(
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
      throw new ExpectedDataNotFoundError(trimmed);
    }

    if (config.defaultExpectedData) {
      if (!(await fileExists(config.defaultExpectedData))) {
        throw new ExpectedDataNotFoundError(config.defaultExpectedData);
      }
      return config.defaultExpectedData;
    }

    throw new ExpectedDataNotFoundError('デフォルトの期待データファイルが設定されていません');
  }
}
