import { PlaywrightSpannerAssert } from './playwright-spanner-assert';
export * from './types';
export * from './errors';

const defaultInstance = new PlaywrightSpannerAssert();

export default defaultInstance;
export { PlaywrightSpannerAssert };
