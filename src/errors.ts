export class ConfigurationNotFoundError extends Error {
  constructor(path: string) {
    super(`playwright-spanner-assert.yaml not found: ${path}`);
    this.name = 'ConfigurationNotFoundError';
  }
}

export class ParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParsingError';
  }
}

export class ExpectedDataNotFoundError extends Error {
  constructor(pathValue: string) {
    super(`Expected data file not found: ${pathValue}`);
    this.name = 'ExpectedDataNotFoundError';
  }
}

export class SpalidateExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpalidateExecutionError';
  }
}
