import { spawn } from 'child_process';
import path from 'path';
import { createSpalidateExecutionError } from './errors';
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
  '{expectedFile}',
];

export type RunSpalidateOptions = {
  config: ResolvedPlaywrightSpannerAssertConfig;
  expectedFile: string;
  timeoutMs?: number;
  onDebug?: (message: string, payload?: Record<string, unknown>) => void;
};

export async function runSpalidate({
  config,
  expectedFile,
  timeoutMs,
  onDebug,
}: RunSpalidateOptions): Promise<void> {
  validateCommand(config.spalidate);
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

  if (onDebug) {
    onDebug('spalidate:spawn', {
      command,
      args,
      cwd,
    });
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...spawnOverrides,
    });

    const timer = timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL');
          reject(
            createSpalidateExecutionError('spalidate timed out', {
              timeoutMs,
              command,
              args,
            }),
          );
        }, timeoutMs)
      : null;

    child.on('error', (error) => {
      if (timer) {
        clearTimeout(timer);
      }
      reject(
        createSpalidateExecutionError(`Failed to launch spalidate: ${error.message}`, {
          command,
          args,
        }),
      );
    });

    child.on('exit', (code, signal) => {
      if (timer) {
        clearTimeout(timer);
      }
      if (code === 0) {
        resolve();
      } else {
        reject(
          createSpalidateExecutionError(
            `spalidate exited with non-zero code (${code ?? 'unknown'})`,
            {
              command,
              args,
              signal,
            },
          ),
        );
      }
    });
  });
}

function validateCommand(spalidate: SpalidateConfig | undefined): void {
  if (spalidate?.command && spalidate.command.trim() === '') {
    throw createSpalidateExecutionError('spalidate command cannot be empty');
  }
}

function buildPlaceholderMap(
  config: ResolvedPlaywrightSpannerAssertConfig,
  expectedFile: string,
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
    return value !== undefined ? value : match;
  });
}

function sanitizeSpawnOptions(
  options: SpalidateConfig['spawnOptions'],
): SpalidateConfig['spawnOptions'] | undefined {
  if (!options) {
    return undefined;
  }
  return options;
}
