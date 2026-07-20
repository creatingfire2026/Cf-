import { Env } from './types';

const STRIPE_API = 'https://api.stripe.com/v1';

// ─── Request helpers ──────────────────────────────────────────────────────────

function stripeHeaders(env: Env): Headers {
  return new Headers({
    Authorization: `******
    'Content-Type': 'application/x-www-form-urlencoded',
  });
}

function encodeForm(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function stripePost<T>(env: Env, path: string, data: Record<string, string>): Promise<T> {
  const resp = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: stripeHeaders(env),
    body: encodeForm(data),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Stripe API error (${path}): ${err}`);
  }
  return resp.json<T>();
}

async function stripeGet<T>(env: Env, path: string): Promise<T> {
  const resp = await fetch(`${STRIPE_API}${path}`, { headers: stripeHeaders(env) });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Stripe API error (${path}): ${err}`);
  }
  return resp.json<T>();
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createCheckoutSession(
  env: Env,
  opts: {
    email: string;
    priceId: string;
    plan: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<CheckoutSession> {
  return stripePost<CheckoutSession>(env, '/checkout/sessions', {
    customer_email: opts.email,
    'line_items[0][price]': opts.priceId,
    'line_items[0][quantity]': '1',
    mode: 'subscription',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: 'true',
    'metadata[plan]': opts.plan,
  });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  items: {
    data: Array<{
      id: string;
      price: { id: string; nickname: string | null };
    }>;
  };
}

export async function getSubscription(
  env: Env,
  subscriptionId: string,
): Promise<StripeSubscription> {
  return stripeGet<StripeSubscription>(env, `/subscriptions/${subscriptionId}`);
}

// ─── Usage records (for metered billing) ─────────────────────────────────────

export async function reportUsageRecord(
  env: Env,
  subscriptionItemId: string,
  quantity: number,
): Promise<void> {
  await stripePost(env, `/subscription_items/${subscriptionItemId}/usage_records`, {
    quantity: String(quantity),
    action: 'set',
    timestamp: String(Math.floor(Date.now() / 1000)),
  });
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verifies a Stripe webhook signature using HMAC-SHA256.
 * Uses the Web Crypto API (available in all Cloudflare Workers runtimes).
 * https://stripe.com/docs/webhooks/signatures
 */
export async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  // Parse: t=timestamp,v1=signature[,v1=signature...]
  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(',')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const k = part.slice(0, eqIdx);
    const v = part.slice(eqIdx + 1);
    // Only capture the first occurrence of each key
    if (!(k in parts)) parts[k] = v;
  }

  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time string comparison to prevent timing attacks
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
