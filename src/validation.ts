import { spawn } from 'child_process';
import path from 'path';
import { SpalidateExecutionError } from './errors';
import type { PlaceholderMap, ResolvedPlaywrightSpannerAssertConfig } from './types';

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
  if (config.spalidate?.command?.trim() === '') {
    throw new SpalidateExecutionError('spalidate command cannot be empty');
  }

  const command = config.spalidate?.command ?? DEFAULT_COMMAND;
  const argsTemplate = config.spalidate?.args ?? DEFAULT_ARGS;
  const cwd = config.spalidate?.workingDirectory ?? config.configDir;
  const timeout = config.spalidate?.timeout ?? DEFAULT_TIMEOUT_MS;

  const placeholders: PlaceholderMap = {
    schemaFile: config.schemaFile ?? '',
    expectedFile,
    projectId: config.database.projectId,
    instanceId: config.database.instanceId,
    databaseName: config.database.database,
    configDir: config.configDir,
    expectedDir: path.dirname(expectedFile),
  };

  const args = argsTemplate.map((arg) =>
    arg.replace(/\{(\w+)\}/g, (_, key: string) => placeholders[key] ?? `{${key}}`),
  );

  const env = { ...process.env, ...config.spalidate?.env };

  onDebug?.('spalidate:spawn', { command, args, cwd });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...config.spalidate?.spawnOptions,
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new SpalidateExecutionError(`spalidate timed out after ${timeout}ms`));
    }, timeout);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new SpalidateExecutionError(`Failed to launch spalidate: ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        const signalInfo = signal ? ` (signal: ${signal})` : '';
        reject(
          new SpalidateExecutionError(
            `spalidate exited with non-zero code ${code ?? 'unknown'}${signalInfo}`,
          ),
        );
      }
    });
  });
}
