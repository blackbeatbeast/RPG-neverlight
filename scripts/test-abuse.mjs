import process from 'node:process';

const target = process.argv[process.argv.indexOf('--target') + 1];
if (target !== 'preview-safe-suite') {
  throw new Error('Use --target preview-safe-suite.');
}

if (process.env.CI === 'true' && !process.env.PREVIEW_URL) {
  throw new Error('PREVIEW_URL is required in CI; refusing to probe localhost.');
}
const baseUrl = (process.env.PREVIEW_URL ?? 'http://127.0.0.1:8788').replace(/\/$/, '');
const abuseIp = `198.51.100.${20 + (Math.floor(Date.now() / 1000) % 200)}`;
const statuses = [];
const sessions = [];

function cookieValue(header, name) {
  const match = header?.match(new RegExp(`${name}=([^;,]+)`));
  return match?.[1];
}

for (let index = 0; index < 11; index += 1) {
  const response = await fetch(`${baseUrl}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': abuseIp },
  });
  statuses.push(response.status);
  if (response.status === 201 || response.status === 200) {
    const setCookie = response.headers.get('set-cookie') ?? '';
    const session = cookieValue(setCookie, 'neverlight_session');
    const csrf = cookieValue(setCookie, 'neverlight_csrf');
    if (!session || !csrf) throw new Error('Guest response omitted cleanup cookies.');
    sessions.push({ session, csrf });
  } else if (![429, 503].includes(response.status)) {
    throw new Error(`Unexpected abuse response at request ${index + 1}: HTTP ${response.status}`);
  }
}

const firstCap = statuses.findIndex((status) => status === 429 || status === 503);
if (
  sessions.length > 10 ||
  firstCap < 0 ||
  statuses.slice(firstCap + 1).some((status) => status === 200 || status === 201)
) {
  throw new Error(`Abuse cap invariant failed: ${JSON.stringify(statuses)}`);
}

for (const [index, session] of sessions.entries()) {
  const response = await fetch(`${baseUrl}/api/v1/guest/reset`, {
    method: 'POST',
    headers: {
      Cookie: `neverlight_session=${session.session}; neverlight_csrf=${session.csrf}`,
      'Idempotency-Key': `abuse-cleanup-${index}`,
      'X-CSRF-Token': session.csrf,
    },
  });
  if (response.status !== 200) throw new Error(`Cleanup failed with HTTP ${response.status}`);
}

console.log(
  JSON.stringify({
    target,
    requestsSent: statuses.length,
    successfulGuestCreates: sessions.length,
    capResponse: statuses[firstCap],
    statuses,
    cleanupCount: sessions.length,
    invariant: 'finite guest starts; no post-cap successful create',
  }),
);
console.log('Preview-safe abuse test passed: guest-start writes are capped and cleaned up.');
