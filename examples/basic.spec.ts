import { test } from '@playwright/test';
import playwrightSpannerAssert from 'playwright-spanner-assert';

test.describe('example-01-basic-setup', () => {
  test('Database Validation', async () => {
    await playwrightSpannerAssert.validateDatabaseState('expected-data.yaml');
    await playwrightSpannerAssert.validateDatabaseState('');
  });
});
