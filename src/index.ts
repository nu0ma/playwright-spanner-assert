import { createClient } from './client';

export const defaultClient = createClient();
export default defaultClient;

export { createClient as createPlaywrightSpannerAssert } from './client';

export {
  createConfigurationNotFoundError,
  createError,
  createExpectedDataNotFoundError,
  createMissingFieldError,
  createParsingError,
  createSpalidateExecutionError,
} from './errors';

export type {
  DatabaseConfig,
  PlaywrightSpannerAssertClient,
  PlaywrightSpannerAssertConfig,
  PlaywrightSpannerAssertOptions,
  ResolvedPlaywrightSpannerAssertConfig,
  SpalidateConfig,
} from './types';
