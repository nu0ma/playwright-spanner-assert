import { createPlaywrightSpannerAssert } from './public-api';

const defaultClient = createPlaywrightSpannerAssert();

export default defaultClient;
export * from './public-api';
