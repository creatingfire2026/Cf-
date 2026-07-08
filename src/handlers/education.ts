import { Env, WorkflowJob } from '../lib/types';
import { log } from '../lib/logger';
import { kvSet } from '../lib/kv';

/**
 * Education & content domain handler.
 */
export async function handleEducation(job: WorkflowJob, env: Env): Promise<unknown> {
  log('info', 'Education handler', { action: job.action, id: job.id });

  switch (job.action) {
    case 'publish-material': {
      const key = `education/${job.id}.json`;
      await env.CF_R2.put(key, JSON.stringify(job.payload));
      await kvSet(env, `education:index:${job.id}`, {
        key,
        meta: job.payload,
        publishedAt: new Date().toISOString(),
      });
      return { status: 'complete', key, jobId: job.id };
    }

    case 'enroll': {
      await kvSet(env, `enroll:${job.id}`, {
        ...job.payload,
        enrolledAt: new Date().toISOString(),
      });
      return { status: 'complete', enrolled: true, jobId: job.id };
    }

    case 'progress': {
      await kvSet(env, `progress:${job.id}`, {
        ...job.payload,
        updatedAt: new Date().toISOString(),
      });
      return { status: 'complete', updated: true, jobId: job.id };
    }

    default:
      throw new Error(`Unknown education action: ${job.action}`);
  }
}
