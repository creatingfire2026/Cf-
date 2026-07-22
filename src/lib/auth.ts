import { CustomerRecord, Env } from './types';
import { getCustomerByToken } from './billing';

export interface AuthResult {
  ok: boolean;
  /** null means the request authenticated as the admin/operator key */
  customer: CustomerRecord | null;
}

/**
 * Authenticates the ****** in the Authorization header.
 *
 * Lookup order:
 *  1. Check KV for a per-customer API key (`apikey:{token}` → CustomerRecord).
 *  2. Fall back to the operator-level API_SECRET env secret.
 *
 * Set the operator key with: wrangler secret put API_SECRET
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return { ok: false, customer: null };
  const spaceIdx = authHeader.indexOf(' ');
  if (spaceIdx === -1) return { ok: false, customer: null };
  const scheme = authHeader.slice(0, spaceIdx);
  const token = authHeader.slice(spaceIdx + 1).trim();
  if (scheme !== 'Bearer' || !token) return { ok: false, customer: null };

  // 1. Per-customer key lookup
  const customer = await getCustomerByToken(env, token);
  if (customer) return { ok: true, customer };

  // 2. Admin/operator fallback (constant-time comparison)
  const adminKey = env.API_SECRET ?? '';
  if (token.length === adminKey.length) {
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ adminKey.charCodeAt(i);
    }
    if (diff === 0) return { ok: true, customer: null };
  }

  return { ok: false, customer: null };
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function quotaExceeded(): Response {
  return new Response(
    JSON.stringify({ error: 'Monthly quota exceeded. Upgrade your plan at https://creatingfire.org' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );
}
