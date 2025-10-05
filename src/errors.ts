export class PlaywrightSpannerAssertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaywrightSpannerAssertError';
  }
}

export class ConfigurationNotFoundError extends PlaywrightSpannerAssertError {
  constructor(path: string) {
    super(`playwright-spanner-assert.yaml が見つかりません: ${path}`);
    this.name = 'ConfigurationNotFoundError';
  }
}

export class MissingFieldError extends PlaywrightSpannerAssertError {
  constructor(field: string) {
    super(`playwright-spanner-assert.yaml の必須フィールドが不足しています: ${field}`);
    this.name = 'MissingFieldError';
  }
}

export class ExpectedDataNotFoundError extends PlaywrightSpannerAssertError {
  constructor(path: string) {
    super(`期待データファイルが見つかりません: ${path}`);
    this.name = 'ExpectedDataNotFoundError';
  }
}

export class SpalidateExecutionError extends PlaywrightSpannerAssertError {
  constructor(message: string) {
    super(message);
    this.name = 'SpalidateExecutionError';
  }
}
