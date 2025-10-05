import { spawn } from 'child_process';
import path from 'path';
import { SpalidateExecutionError } from './errors';
import type {
  PlaceholderMap,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
} from './types';

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
  '{expectedFile}'
];

interface RunOptions {
  config: ResolvedPlaywrightSpannerAssertConfig;
  expectedFile: string;
}

export async function runSpalidate({ config, expectedFile }: RunOptions): Promise<void> {
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
      reject(new SpalidateExecutionError(`spalidate の起動に失敗しました: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new SpalidateExecutionError(`spalidate が非ゼロ終了コード (${code ?? 'unknown'}) を返しました`));
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
    if (value === undefined) {
      return match;
    }
    return value;
  });
}

function sanitizeSpawnOptions(options: SpalidateConfig['spawnOptions']): Record<string, unknown> | undefined {
  if (!options) {
    return undefined;
  }
  const sanitized: Record<string, unknown> = { ...options };
  delete sanitized.cwd;
  delete sanitized.env;
  return sanitized;
}
