import { test } from '@playwright/test';
import { Spanner } from '@google-cloud/spanner';
import path from 'path';

const REQUIRED_ENV_VARS = [
  'SPANNER_EMULATOR_HOST',
  'SPANNER_PROJECT',
  'SPANNER_INSTANCE',
  'SPANNER_DATABASE',
];
const missingEnv = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

test.skip(
  missingEnv.length > 0,
  `Spanner emulator tests require env vars: ${missingEnv.join(', ')}`,
);

test.describe.configure({ mode: 'serial' });

const fixturesDir = path.resolve(__dirname, 'fixtures');
const configPath = path.join(fixturesDir, 'playwright-spanner-assert.yaml');

const project = process.env.SPANNER_PROJECT!;
const instance = process.env.SPANNER_INSTANCE!;
const databaseName = process.env.SPANNER_DATABASE!;
const emulatorHost = process.env.SPANNER_EMULATOR_HOST ?? '127.0.0.1:9010';
const adminPort = process.env.SPANNER_EMULATOR_ADMIN_PORT ?? '9020';

process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? project;
process.env.SPANNER_EMULATOR_HOST = emulatorHost;
process.env.CLOUDSDK_API_ENDPOINT_OVERRIDES_SPANNER =
  process.env.CLOUDSDK_API_ENDPOINT_OVERRIDES_SPANNER ?? `http://127.0.0.1:${adminPort}/`;

const spanner = new Spanner({ projectId: project });
const spannerInstance = spanner.instance(instance);
const database = spannerInstance.database(databaseName);

async function runSql(sql: string): Promise<void> {
  await database.run(sql);
}

async function resetSamples(id: string, name: string): Promise<void> {
  await runSql('DELETE FROM Samples WHERE TRUE');
  await runSql(`INSERT INTO Samples (Id, Name) VALUES ('${id}', '${name}')`);
}

test.beforeEach(async () => {
  delete require.cache[require.resolve('../../dist')];
});

test.afterEach(() => {
  delete require.cache[require.resolve('../../dist')];
});

function loadClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createPlaywrightSpannerAssert } = require('../../dist');
  return createPlaywrightSpannerAssert({ configPath });
}

test('validates default dataset against emulator', async () => {
  await resetSamples('1', 'Default Name');
  const client = loadClient();
  await client.validateDatabaseState('');
});

test('validates custom dataset against emulator', async () => {
  await resetSamples('2', 'Custom Name');
  const client = loadClient();
  await client.validateDatabaseState('expected/custom.yaml');
});
