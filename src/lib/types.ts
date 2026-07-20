// ─── Cloudflare Bindings ──────────────────────────────────────────────────────

export interface Env {
  CF_KV: KVNamespace;
  CF_QUEUE: Queue<WorkflowJob>;
  CF_R2: R2Bucket;
  WORKFLOW_DO: DurableObjectNamespace;
  /** Set via wrangler secret: API_SECRET (admin key — fallback for single-operator use) */
  API_SECRET: string;
  ENVIRONMENT: string;
  // ── Stripe — set via wrangler secret put ─────────────────────────────────
  /** wrangler secret put STRIPE_SECRET_KEY */
  STRIPE_SECRET_KEY: string;
  /** wrangler secret put STRIPE_WEBHOOK_SECRET */
  STRIPE_WEBHOOK_SECRET: string;
  // ── Stripe Price IDs — set as wrangler.toml [vars] ───────────────────────
  STRIPE_STARTER_PRICE_ID: string;
  STRIPE_PRO_PRICE_ID: string;
  // ── Optional alerting ─────────────────────────────────────────────────────
  /** Slack / Discord / custom webhook URL for cron health reports */
  ALERT_WEBHOOK_URL?: string;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export type BillingPlan = 'free' | 'starter' | 'pro';
export type CustomerStatus = 'active' | 'suspended' | 'cancelled';

/** Jobs allowed per calendar month for each plan */
export const PLAN_QUOTAS: Record<BillingPlan, number> = {
  free: 100,
  starter: 1_000,
  pro: 10_000,
};

export interface CustomerRecord {
  customerId: string;
  email: string;
  plan: BillingPlan;
  quotaPerMonth: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: CustomerStatus;
  /** ****** used in Authorization header */
  apiKey: string;
  createdAt: string;
}

// ─── Workflow Core ────────────────────────────────────────────────────────────

export type WorkflowDomain = 'ai' | 'marketing' | 'education' | 'webhook' | 'system' | 'billing';
export type WorkflowStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface WorkflowJob {
  id: string;
  domain: WorkflowDomain;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: WorkflowStatus;
}

export interface WorkflowStep {
  step: number;
  action: string;
  startedAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export interface WorkflowState {
  job: WorkflowJob;
  steps: WorkflowStep[];
  updatedAt: string;
}
