// ─── Cloudflare Bindings ──────────────────────────────────────────────────────

export interface Env {
  CF_KV: KVNamespace;
  CF_QUEUE: Queue<WorkflowJob>;
  CF_R2: R2Bucket;
  WORKFLOW_DO: DurableObjectNamespace;
  /** Set via wrangler secret: API_SECRET */
  API_SECRET: string;
  ENVIRONMENT: string;
}

// ─── Workflow Core ────────────────────────────────────────────────────────────

export type WorkflowDomain = 'ai' | 'marketing' | 'education' | 'webhook' | 'system';
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
