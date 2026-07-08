import { Env, WorkflowJob } from '../lib/types';
import { log } from '../lib/logger';

/**
 * AI domain handler.
 * Extend each case with your model endpoints and generation logic.
 */
export async function handleAI(job: WorkflowJob, env: Env): Promise<unknown> {
  log('info', 'AI handler', { action: job.action, id: job.id });

  switch (job.action) {
    case 'generate': {
      // Extend: call your AI model API here and store result in R2
      return { status: 'queued', message: 'AI generation job accepted', jobId: job.id };
    }

    case 'analyze': {
      return { status: 'queued', message: 'AI analysis job accepted', jobId: job.id };
    }

    case 'publish': {
      const key = `ai-outputs/${job.id}.json`;
      await env.CF_R2.put(key, JSON.stringify(job.payload));
      log('info', 'AI output published to R2', { key });
      return { status: 'complete', key, jobId: job.id };
    }

    default:
      throw new Error(`Unknown AI action: ${job.action}`);
  }
}
