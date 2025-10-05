import type {
  DatabaseConfig,
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
} from './types';
import {
  createConfigurationNotFoundError,
  createError,
  createExpectedDataNotFoundError,
  createMissingFieldError,
  createParsingError,
  createSpalidateExecutionError,
} from './errors';
import { createClient } from './client';

export {
  createConfigurationNotFoundError,
  createError,
  createExpectedDataNotFoundError,
  createMissingFieldError,
  createParsingError,
  createSpalidateExecutionError,
  createClient as createPlaywrightSpannerAssert,
};

export type {
  DatabaseConfig,
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
};
