import { BillingPlan, Env, WorkflowJob } from '../lib/types';
import { provisionCustomer, updateCustomerStatus, listAllCustomers, getUsage, checkoutKV } from '../lib/billing';
import { verifyStripeSignature, reportUsageRecord, getSubscription } from '../lib/stripe';
import { kvGet } from '../lib/kv';
import { log } from '../lib/logger';

// ─── Stripe event shapes (minimal) ───────────────────────────────────────────

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

// ─── Webhook handler (called from src/handlers/webhooks.ts) ──────────────────

/**
 * Verifies the Stripe-Signature header and routes the event to the correct handler.
 * `rawBody` must be the unmodified request body string — do NOT parse before calling.
 */
export async function handleStripeWebhook(
  rawBody: string,
  sigHeader: string,
  env: Env,
): Promise<Response> {
  const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    log('warn', 'Stripe signature verification failed');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  log('info', 'Stripe event received', { type: event.type, id: event.id });

  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutCompleted(event.data.object, env);
      break;
    case 'customer.subscription.deleted':
      await onSubscriptionDeleted(event.data.object, env);
      break;
    case 'invoice.payment_failed':
      await onPaymentFailed(event.data.object, env);
      break;
    case 'customer.subscription.updated':
      await onSubscriptionUpdated(event.data.object, env);
      break;
    default:
      log('info', 'Unhandled Stripe event', { type: event.type });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function onCheckoutCompleted(
  session: Record<string, unknown>,
  env: Env,
): Promise<void> {
  const email = (session['customer_email'] as string | null) ?? '';
  const stripeCustomerId = (session['customer'] as string | null) ?? undefined;
  const subscriptionId = (session['subscription'] as string | null) ?? undefined;
  const sessionId = (session['id'] as string | null) ?? '';

  // Read the plan from metadata (set when creating the Checkout Session)
  const metadata = (session['metadata'] as Record<string, string> | null) ?? {};
  const plan: BillingPlan = (metadata['plan'] as BillingPlan) ?? 'starter';

  const customer = await provisionCustomer(env, {
    email,
    plan,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
  });

  // Store API key temporarily so the success page can retrieve it
  // checkout:{sessionId} → apiKey — TTL 1 h
  await env.CF_KV.put(
    checkoutKV(sessionId),
    JSON.stringify({ apiKey: customer.apiKey, customerId: customer.customerId }),
    { expirationTtl: 3600 },
  );

  log('info', 'Checkout completed, customer provisioned', {
    customerId: customer.customerId,
    plan,
  });
}

async function onSubscriptionDeleted(
  subscription: Record<string, unknown>,
  env: Env,
): Promise<void> {
  const stripeCustomerId = subscription['customer'] as string;
  await updateCustomerStatus(env, stripeCustomerId, 'cancelled');
}

async function onPaymentFailed(
  invoice: Record<string, unknown>,
  env: Env,
): Promise<void> {
  const stripeCustomerId = invoice['customer'] as string;
  await updateCustomerStatus(env, stripeCustomerId, 'suspended');
  log('warn', 'Payment failed, customer suspended', { stripeCustomerId });
}

async function onSubscriptionUpdated(
  subscription: Record<string, unknown>,
  env: Env,
): Promise<void> {
  const stripeCustomerId = subscription['customer'] as string;
  const status = subscription['status'] as string;
  if (status === 'active') {
    await updateCustomerStatus(env, stripeCustomerId, 'active');
  } else if (status === 'canceled' || status === 'unpaid') {
    await updateCustomerStatus(env, stripeCustomerId, 'suspended');
  }
}

// ─── Billing workflow job handler ─────────────────────────────────────────────

/**
 * Handles `billing` domain workflow jobs dispatched by the queue or cron.
 */
export async function handleBillingJob(job: WorkflowJob, env: Env): Promise<unknown> {
  log('info', 'Billing job handler', { action: job.action, id: job.id });

  switch (job.action) {
    case 'cron-report': {
      return cronBillingReport(env);
    }

    case 'retrieve-key': {
      // Called from GET /signup/success?session_id=... — retrieve provisioned API key
      const sessionId = job.payload['sessionId'] as string | undefined;
      if (!sessionId) throw new Error('Missing sessionId in payload');
      const entry = await kvGet<{ apiKey: string; customerId: string }>(
        env,
        checkoutKV(sessionId),
      );
      if (!entry) throw new Error('Session not found or expired');
      return { apiKey: entry.apiKey, customerId: entry.customerId };
    }

    default:
      throw new Error(`Unknown billing action: ${job.action}`);
  }
}

// ─── Cron: billing report ─────────────────────────────────────────────────────

async function cronBillingReport(env: Env): Promise<unknown> {
  const customers = await listAllCustomers(env);
  let totalJobs = 0;
  let activeCount = 0;
  const usageRows: Array<{ customerId: string; email: string; plan: string; used: number; quota: number }> = [];

  for (const customer of customers) {
    if (customer.status !== 'active') continue;
    activeCount++;
    const used = await getUsage(env, customer.customerId);
    totalJobs += used;
    usageRows.push({
      customerId: customer.customerId,
      email: customer.email,
      plan: customer.plan,
      used,
      quota: customer.quotaPerMonth,
    });

    // Emit metered usage record to Stripe if customer has a subscription
    if (customer.stripeSubscriptionId) {
      try {
        const sub = await getSubscription(env, customer.stripeSubscriptionId);
        const item = sub.items.data[0];
        if (item) {
          await reportUsageRecord(env, item.id, used);
        }
      } catch (err) {
        log('warn', 'Failed to report usage to Stripe', {
          customerId: customer.customerId,
          error: String(err),
        });
      }
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    activeCustomers: activeCount,
    totalJobsThisMonth: totalJobs,
    usage: usageRows,
  };

  // Post to alert webhook if configured
  if (env.ALERT_WEBHOOK_URL) {
    try {
      await fetch(env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `creatingfire.org — Monthly usage report`,
          attachments: [{ text: JSON.stringify(summary, null, 2) }],
        }),
      });
    } catch (err) {
      log('warn', 'Alert webhook failed', { error: String(err) });
    }
  }

  log('info', 'Cron billing report complete', summary);
  return summary;
}
