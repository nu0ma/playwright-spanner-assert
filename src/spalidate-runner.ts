import { spawn } from 'child_process';
import path from 'path';
import { createSpalidateExecutionError } from './errors';
import type {
  PlaceholderMap,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
} from './types';

const DEFAULT_COMMAND = 'spalidate';
const DEFAULT_ARGS = [
  '--project',
  '{projectId}',
  '--instance',
  '{instanceId}',
  '--database',
  '{databaseName}',
  '{expectedFile}',
];

const DEFAULT_TIMEOUT_MS = 60_000;

export type RunSpalidateOptions = {
  config: ResolvedPlaywrightSpannerAssertConfig;
  expectedFile: string;
  onDebug?: (message: string, payload?: Record<string, unknown>) => void;
};

export async function runSpalidate({
  config,
  expectedFile,
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
  const spawnOverrides = config.spalidate?.spawnOptions ?? {};

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

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(
        createSpalidateExecutionError('spalidate timed out', {
          timeoutMs: DEFAULT_TIMEOUT_MS,
          command,
          args,
        }),
      );
    }, DEFAULT_TIMEOUT_MS);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        createSpalidateExecutionError(`Failed to launch spalidate: ${error.message}`, {
          command,
          args,
        }),
      );
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
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
