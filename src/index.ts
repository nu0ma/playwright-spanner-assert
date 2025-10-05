import { createPlaywrightSpannerAssert } from './public-api';

const client = createPlaywrightSpannerAssert();

export default client;
export * from './public-api';
