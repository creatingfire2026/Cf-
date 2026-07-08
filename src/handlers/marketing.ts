import { Env, WorkflowJob } from '../lib/types';
import { log } from '../lib/logger';

// 90 days TTL for tracking events
const TRACK_TTL = 60 * 60 * 24 * 90;

/**
 * Marketing & commercial domain handler.
 */
export async function handleMarketing(job: WorkflowJob, env: Env): Promise<unknown> {
  log('info', 'Marketing handler', { action: job.action, id: job.id });

  switch (job.action) {
    case 'campaign': {
      return { status: 'queued', message: 'Campaign workflow accepted', jobId: job.id };
    }

    case 'publish-content': {
      const key = `marketing/${job.id}.json`;
      await env.CF_R2.put(key, JSON.stringify(job.payload));
      return { status: 'complete', key, jobId: job.id };
    }

    case 'track': {
      const key = `track:${job.id}`;
      await env.CF_KV.put(
        key,
        JSON.stringify({ ...job.payload, recordedAt: new Date().toISOString() }),
        { expirationTtl: TRACK_TTL },
      );
      return { status: 'complete', tracked: true, jobId: job.id };
    }

    default:
      throw new Error(`Unknown marketing action: ${job.action}`);
  }
}
