import { BillingPlan, CustomerRecord, CustomerStatus, Env, PLAN_QUOTAS } from './types';
import { kvGet, kvSet, kvList } from './kv';
import { log } from './logger';

// ─── KV key helpers ───────────────────────────────────────────────────────────

/** `apikey:{token}` → CustomerRecord */
export function apikeyKV(token: string): string {
  return `apikey:${token}`;
}

/** `customer:{customerId}` → CustomerRecord (reverse index) */
export function customerKV(customerId: string): string {
  return `customer:${customerId}`;
}

/** `billing:{customerId}:usage:{YYYY-MM}` → number */
export function usageKV(customerId: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `billing:${customerId}:usage:${month}`;
}

/** `checkout:{sessionId}` → { apiKey, customerId } — TTL 1 h */
export function checkoutKV(sessionId: string): string {
  return `checkout:${sessionId}`;
}

// ─── Customer lookup ──────────────────────────────────────────────────────────

export async function getCustomerByToken(env: Env, token: string): Promise<CustomerRecord | null> {
  return kvGet<CustomerRecord>(env, apikeyKV(token));
}

export async function getCustomerById(env: Env, customerId: string): Promise<CustomerRecord | null> {
  return kvGet<CustomerRecord>(env, customerKV(customerId));
}

// ─── Usage tracking ───────────────────────────────────────────────────────────

const USAGE_TTL = 60 * 60 * 24 * 35; // 35 days — outlasts any billing period

export async function incrementUsage(env: Env, customerId: string): Promise<number> {
  const key = usageKV(customerId);
  const current = (await kvGet<number>(env, key)) ?? 0;
  const next = current + 1;
  await kvSet(env, key, next, USAGE_TTL);
  return next;
}

export async function getUsage(env: Env, customerId: string): Promise<number> {
  return (await kvGet<number>(env, usageKV(customerId))) ?? 0;
}

export async function isQuotaExceeded(env: Env, customer: CustomerRecord): Promise<boolean> {
  if (customer.status !== 'active') return true;
  const used = await getUsage(env, customer.customerId);
  return used >= customer.quotaPerMonth;
}

// ─── Provisioning ─────────────────────────────────────────────────────────────

export interface ProvisionOpts {
  email: string;
  plan: BillingPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export async function provisionCustomer(env: Env, opts: ProvisionOpts): Promise<CustomerRecord> {
  const customerId = crypto.randomUUID();
  // Generate a long opaque API key (two UUIDs concatenated, dashes removed)
  const apiKey =
    crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  const customer: CustomerRecord = {
    customerId,
    email: opts.email,
    plan: opts.plan,
    quotaPerMonth: PLAN_QUOTAS[opts.plan],
    stripeCustomerId: opts.stripeCustomerId,
    stripeSubscriptionId: opts.stripeSubscriptionId,
    status: 'active',
    apiKey,
    createdAt: new Date().toISOString(),
  };

  await kvSet(env, apikeyKV(apiKey), customer);
  await kvSet(env, customerKV(customerId), customer);
  log('info', 'Customer provisioned', { customerId, email: opts.email, plan: opts.plan });
  return customer;
}

export async function updateCustomerStatus(
  env: Env,
  stripeCustomerId: string,
  status: CustomerStatus,
): Promise<void> {
  // Scan customer: keys to find by Stripe ID.
  // For scale, add a reverse index `stripecustomer:{stripeId}` → customerId.
  const keys = await kvList(env, 'customer:');
  for (const key of keys) {
    const customer = await kvGet<CustomerRecord>(env, key);
    if (customer?.stripeCustomerId === stripeCustomerId) {
      customer.status = status;
      await kvSet(env, apikeyKV(customer.apiKey), customer);
      await kvSet(env, customerKV(customer.customerId), customer);
      log('info', 'Customer status updated', { customerId: customer.customerId, status });
      return;
    }
  }
  log('warn', 'Customer not found for Stripe status update', { stripeCustomerId, status });
}

export async function listAllCustomers(env: Env): Promise<CustomerRecord[]> {
  const keys = await kvList(env, 'customer:');
  const customers: CustomerRecord[] = [];
  for (const key of keys) {
    const c = await kvGet<CustomerRecord>(env, key);
    if (c) customers.push(c);
  }
  return customers;
}
