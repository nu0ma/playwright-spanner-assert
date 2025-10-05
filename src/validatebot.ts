import type { PlaywrightSpannerAssertConfig, DatabaseConfig, SpalidateConfig } from './types';

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: ValidationIssue[] };

export function validateConfigSchema(
  input: unknown,
): ValidationResult<PlaywrightSpannerAssertConfig> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(input)) {
    return {
      success: false,
      issues: [
        {
          path: '',
          message: 'Configuration root must be an object',
        },
      ],
    };
  }

  const obj = input as Record<string, unknown>;
  const schemaFile = readString(obj.schemaFile, 'schemaFile', issues, true);
  const defaultExpectedData = readString(
    obj.defaultExpectedData,
    'defaultExpectedData',
    issues,
    false,
  );
  const database = validateDatabase(obj.database, issues);
  const spalidate = validateSpalidate(obj.spalidate, issues);

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: {
      schemaFile: schemaFile!,
      defaultExpectedData: defaultExpectedData ?? undefined,
      database: database!,
      spalidate: spalidate ?? undefined,
    },
  };
}

function validateDatabase(value: unknown, issues: ValidationIssue[]): DatabaseConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({ path: 'database', message: 'database must be an object' });
    return undefined;
  }
  const obj = value as Record<string, unknown>;
  const projectId = readString(obj.projectId, 'database.projectId', issues, true);
  const instanceId = readString(obj.instanceId, 'database.instanceId', issues, true);
  const database = readString(obj.database, 'database.database', issues, true);
  if (projectId && instanceId && database) {
    return { projectId, instanceId, database };
  }
  return undefined;
}

function validateSpalidate(value: unknown, issues: ValidationIssue[]): SpalidateConfig | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isPlainObject(value)) {
    issues.push({ path: 'spalidate', message: 'spalidate must be an object if provided' });
    return undefined;
  }
  const obj = value as Record<string, unknown>;
  const result: SpalidateConfig = {};

  const command = readString(obj.command, 'spalidate.command', issues, false);
  if (command) {
    result.command = command;
  }

  if (obj.args !== undefined) {
    if (Array.isArray(obj.args) && obj.args.every((item) => typeof item === 'string')) {
      result.args = obj.args as string[];
    } else {
      issues.push({
        path: 'spalidate.args',
        message: 'spalidate.args must be an array of strings',
      });
    }
  }

  if (obj.env !== undefined) {
    if (isRecordOfStrings(obj.env)) {
      result.env = obj.env as Record<string, string>;
    } else {
      issues.push({
        path: 'spalidate.env',
        message: 'spalidate.env must be a record of string values',
      });
    }
  }

  if (obj.spawnOptions !== undefined) {
    if (isPlainObject(obj.spawnOptions)) {
      result.spawnOptions = obj.spawnOptions as SpalidateConfig['spawnOptions'];
    } else {
      issues.push({
        path: 'spalidate.spawnOptions',
        message: 'spalidate.spawnOptions must be an object',
      });
    }
  }

  const workingDirectory = readString(
    obj.workingDirectory,
    'spalidate.workingDirectory',
    issues,
    false,
  );
  if (workingDirectory) {
    result.workingDirectory = workingDirectory;
  }

  return result;
}

function readString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  required: boolean,
): string | undefined {
  if (value === undefined || value === null) {
    if (required) {
      issues.push({ path, message: `${path} is required` });
    }
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ path, message: `${path} must be a non-empty string` });
    return undefined;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === 'string');
}
