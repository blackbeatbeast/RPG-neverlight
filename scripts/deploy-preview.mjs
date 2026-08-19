import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerRoot = path.join(root, 'apps', 'worker');
const sourceConfig = path.join(workerRoot, 'wrangler.jsonc');
const dryRun = process.argv.includes('--dry-run');
const previewDatabaseId = process.env.PREVIEW_D1_DATABASE_ID;
const previewDatabaseName = process.env.PREVIEW_D1_DATABASE_NAME ?? 'neverlight-preview';
const workerName = process.env.PREVIEW_WORKER_NAME ?? 'project-neverlight-preview';
const productionWorkerName = process.env.PRODUCTION_WORKER_NAME ?? 'project-neverlight-worker';

if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName)) {
  throw new Error('PREVIEW_WORKER_NAME must be a lowercase DNS-safe name of 1-63 characters.');
}
if (!/^neverlight-preview(?:-[a-z0-9-]+)?$/.test(previewDatabaseName)) {
  throw new Error('PREVIEW_D1_DATABASE_NAME must be a neverlight-preview database name.');
}
if (workerName.toLowerCase() === productionWorkerName.toLowerCase()) {
  throw new Error('Preview Worker must not reuse PRODUCTION_WORKER_NAME.');
}
if (
  !dryRun &&
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previewDatabaseId ?? '')
) {
  throw new Error(
    'PREVIEW_D1_DATABASE_ID is required for a remote preview deploy; use the isolated non-production D1 UUID.',
  );
}
if (
  previewDatabaseId &&
  process.env.PRODUCTION_D1_DATABASE_ID &&
  previewDatabaseId.toLowerCase() === process.env.PRODUCTION_D1_DATABASE_ID.toLowerCase()
) {
  throw new Error('Preview D1 must not reuse PRODUCTION_D1_DATABASE_ID.');
}

let config = fs.readFileSync(sourceConfig, 'utf8');
if (!config.includes('PREVIEW_D1_DATABASE_ID_REQUIRED')) {
  throw new Error('wrangler.jsonc is missing the isolated preview environment.');
}
config = config
  .replaceAll(
    '"project-neverlight-preview"',
    JSON.stringify(dryRun ? `${workerName}-dry-run` : workerName),
  )
  .replaceAll('"neverlight-preview"', JSON.stringify(previewDatabaseName))
  .replaceAll(
    '"PREVIEW_D1_DATABASE_ID_REQUIRED"',
    JSON.stringify(previewDatabaseId ?? '00000000-0000-0000-0000-000000000000'),
  );

const tempConfig = path.join(workerRoot, `.wrangler.preview.${process.pid}.jsonc`);
fs.writeFileSync(tempConfig, config);

console.log(
  JSON.stringify({
    action: dryRun ? 'preview-dry-run' : 'preview-deploy',
    d1: 'isolated-non-production',
    environment: 'preview',
    worker: dryRun ? `${workerName}-dry-run` : workerName,
  }),
);

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
let result;
try {
  result = spawnSync(
    command,
    [
      'exec',
      'wrangler',
      'deploy',
      '--env',
      'preview',
      '--config',
      tempConfig,
      '--strict',
      ...(dryRun ? ['--dry-run'] : []),
    ],
    {
      cwd: workerRoot,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  );
} finally {
  fs.rmSync(tempConfig, { force: true });
}
if (result.error) {
  console.error(`Wrangler process failed to start: ${result.error.message}`);
}
process.exit(result.status ?? 1);
