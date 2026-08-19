import process from 'node:process';

if (process.env.CI === 'true' && !process.env.PREVIEW_URL) {
  throw new Error('PREVIEW_URL is required in CI; refusing to probe localhost.');
}
const baseUrl = (process.env.PREVIEW_URL ?? 'http://127.0.0.1:8788').replace(/\/$/, '');
const expectedEnvironment = process.env.PREVIEW_EXPECTED_ENVIRONMENT ?? 'preview';
const timeoutMs = 5_000;

async function getJson(pathname) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

const health = await getJson('/api/health');
if (health.ok !== true || health.environment !== expectedEnvironment) {
  throw new Error(
    `Preview health mismatch: expected ${expectedEnvironment}, received ${JSON.stringify({ environment: health.environment, ok: health.ok })}`,
  );
}
const operations = await getJson('/api/v1/operations');
if (!['normal', 'degraded', 'read-only', 'maintenance'].includes(operations.mode)) {
  throw new Error(`Unknown operational mode: ${operations.mode}`);
}
if (
  typeof operations.writable !== 'boolean' ||
  typeof operations.budget?.requestLimit !== 'number'
) {
  throw new Error('Preview operations payload is missing the budget contract.');
}

console.log(
  JSON.stringify({
    environment: health.environment,
    mode: operations.mode,
    reason: operations.reason,
    requestLimit: operations.budget.requestLimit,
    writeLimit: operations.budget.writeLimit,
    writable: operations.writable,
    version: health.version,
  }),
);
console.log('Preview smoke passed: health and operational budget contract are readable.');
