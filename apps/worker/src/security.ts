export const SESSION_COOKIE_NAME = 'neverlight_session';
export const CSRF_COOKIE_NAME = 'neverlight_csrf';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

const COOKIE_TOKEN_MAX_LENGTH = 512;

export function createOpaqueToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function createOpaqueId(prefix: string): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `${prefix}_${toHex(bytes)}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`);
  return `{${entries.join(',')}}`;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return [];
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (!key || value.length > COOKIE_TOKEN_MAX_LENGTH) return [];
      return [[key, decodeCookieValue(value)]];
    }),
  );
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly: boolean;
    maxAge: number;
    secure: boolean;
  },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${options.maxAge}`,
  ];
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name: string, secure: boolean, httpOnly: boolean): string {
  return serializeCookie(name, '', { httpOnly, maxAge: 0, secure });
}

export function cookieIsSecure(environment: string | undefined): boolean {
  return environment !== 'local';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function futureIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function requestId(): string {
  return createOpaqueId('req');
}

export async function privacyBucketKey(action: string, identity: string): Promise<string> {
  return sha256Hex(`${action}:${identity}`);
}
