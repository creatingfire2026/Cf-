import { Env, WorkflowJob, WorkflowState, WorkflowStep } from './lib/types';
import { handleAI } from './handlers/ai';
import { handleMarketing } from './handlers/marketing';
import { handleEducation } from './handlers/education';
import { handleBillingJob } from './handlers/billing';
import { log } from './lib/logger';

const STATE_KEY = 'state';

/**
 * WorkflowDurableObject — stateful, per-job workflow runner.
 *
 * Each job gets its own Durable Object instance (keyed by job ID).
 * State (steps, results, errors) persists across retries and restarts.
 *
 * Routes:
 *   POST /execute  — run the job
 *   GET  /status   — read current state
 */
export class WorkflowDurableObject {
  private readonly state: DurableObjectState;
  private readonly env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/execute' && request.method === 'POST') {
      return this.execute(request);
    }
    if (url.pathname === '/status' && request.method === 'GET') {
      return this.getStatus();
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async execute(request: Request): Promise<Response> {
    const job: WorkflowJob = await request.json();

    const existing = await this.state.storage.get<WorkflowState>(STATE_KEY);
    const workflowState: WorkflowState = existing ?? {
      job: { ...job, status: 'running' },
      steps: [],
      updatedAt: new Date().toISOString(),
    };

    workflowState.job.status = 'running';
    workflowState.updatedAt = new Date().toISOString();
    await this.state.storage.put(STATE_KEY, workflowState);

    const step: WorkflowStep = {
      step: workflowState.steps.length + 1,
      action: job.action,
      startedAt: new Date().toISOString(),
    };

    try {
      let result: unknown;

      switch (job.domain) {
        case 'ai':
          result = await handleAI(job, this.env);
          break;
        case 'marketing':
          result = await handleMarketing(job, this.env);
          break;
        case 'education':
          result = await handleEducation(job, this.env);
          break;
        case 'billing':
          result = await handleBillingJob(job, this.env);
          break;
        case 'system':
          result = { handled: true, domain: 'system', action: job.action };
          break;
        default:
          result = { handled: false, domain: job.domain };
      }

      step.completedAt = new Date().toISOString();
      step.result = result;
      workflowState.job.status = 'complete';
    } catch (err) {
      log('error', 'Workflow step failed', { jobId: job.id, error: String(err) });
      step.completedAt = new Date().toISOString();
      step.error = String(err);
      workflowState.job.status = 'failed';
    }

    workflowState.steps.push(step);
    workflowState.updatedAt = new Date().toISOString();
    await this.state.storage.put(STATE_KEY, workflowState);

    return new Response(JSON.stringify(workflowState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getStatus(): Promise<Response> {
    const workflowState = await this.state.storage.get<WorkflowState>(STATE_KEY);
    if (!workflowState) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(workflowState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
