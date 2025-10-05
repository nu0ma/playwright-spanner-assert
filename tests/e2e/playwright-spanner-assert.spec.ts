import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const fixturesDir = path.resolve(__dirname, 'fixtures');
const logPath = path.resolve(__dirname, '.tmp/invocations.json');

async function readInvocations() {
  const raw = await fs.readFile(logPath, 'utf8');
  return JSON.parse(raw) as Array<{ args: string[] }>;
}

test.beforeEach(async () => {
  await fs.rm(logPath, { force: true });
});

test.afterEach(() => {
  delete process.env.PLAYWRIGHT_SPANNER_ASSERT_CONFIG;
  delete require.cache[require.resolve('../../dist')];
});

test('default export validates custom and default expectations', async () => {
  process.env.PLAYWRIGHT_SPANNER_ASSERT_CONFIG = path.join(
    fixturesDir,
    'playwright-spanner-assert.yaml',
  );
  const module = require('../../dist');
  const client = module.default ?? module;

  await client.validateDatabaseState('expected/custom.yaml');
  await client.validateDatabaseState('');

  const invocations = await readInvocations();
  expect(invocations.length).toBe(2);
  const firstArgs = invocations[0].args;
  const secondArgs = invocations[1].args;

  expect(firstArgs).toContain(path.resolve(fixturesDir, 'expected/custom.yaml'));
  expect(secondArgs).toContain(path.resolve(fixturesDir, 'expected/default.yaml'));
});

test('factory produces isolated client with explicit config path', async () => {
  const { createPlaywrightSpannerAssert } = require('../../dist');
  const client = createPlaywrightSpannerAssert({
    configPath: path.join(fixturesDir, 'playwright-spanner-assert.yaml'),
  });

  await client.validateDatabaseState('');

  const invocations = await readInvocations();
  expect(invocations.length).toBe(1);
  const args = invocations[0].args;
  expect(args).toContain(path.resolve(fixturesDir, 'expected/default.yaml'));
});
