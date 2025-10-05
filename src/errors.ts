export type PlaywrightSpannerAssertErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_INVALID'
  | 'CONFIG_MISSING_FIELD'
  | 'EXPECTED_DATA_NOT_FOUND'
  | 'SPALIDATE_FAILED';

export type PlaywrightSpannerAssertError = Error & {
  code: PlaywrightSpannerAssertErrorCode;
  details?: Record<string, unknown>;
};

export function createError(
  name: string,
  code: PlaywrightSpannerAssertErrorCode,
  message: string,
  details?: Record<string, unknown>,
): PlaywrightSpannerAssertError {
  const error = new Error(message) as PlaywrightSpannerAssertError;
  error.name = name;
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}

export const createConfigurationNotFoundError = (path: string) =>
  createError(
    'ConfigurationNotFoundError',
    'CONFIG_NOT_FOUND',
    `playwright-spanner-assert.yaml not found: ${path}`,
    {
      path,
    },
  );

export const createMissingFieldError = (field: string) =>
  createError(
    'MissingFieldError',
    'CONFIG_MISSING_FIELD',
    `Missing required field in playwright-spanner-assert.yaml: ${field}`,
    {
      field,
    },
  );

export const createExpectedDataNotFoundError = (pathValue: string) =>
  createError(
    'ExpectedDataNotFoundError',
    'EXPECTED_DATA_NOT_FOUND',
    `Expected data file not found: ${pathValue}`,
    {
      path: pathValue,
    },
  );

export const createParsingError = (message: string, details?: Record<string, unknown>) =>
  createError('PlaywrightSpannerAssertError', 'CONFIG_INVALID', message, details);

export const createSpalidateExecutionError = (message: string, details?: Record<string, unknown>) =>
  createError('SpalidateExecutionError', 'SPALIDATE_FAILED', message, details);
