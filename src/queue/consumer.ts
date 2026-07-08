import { Env, WorkflowJob } from '../lib/types';
import { log } from '../lib/logger';

/**
 * Cloudflare Queue consumer.
 * Each message routes to the correct Durable Object workflow instance.
 */
export async function consumeQueue(
  batch: MessageBatch<WorkflowJob>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body;
    log('info', 'Processing queue message', { id: job.id, domain: job.domain, action: job.action });

    try {
      const doId = env.WORKFLOW_DO.idFromName(job.id);
      const stub = env.WORKFLOW_DO.get(doId);

      const resp = await stub.fetch('https://internal/execute', {
        method: 'POST',
        body: JSON.stringify(job),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Durable Object returned ${resp.status}: ${text}`);
      }

      message.ack();
    } catch (err) {
      log('error', 'Queue message failed', { id: job.id, error: String(err) });
      message.retry();
    }
  }
}
