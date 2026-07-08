import { Env } from '../lib/types';
import { log } from '../lib/logger';

/**
 * Inbound webhook intake — accepts payloads from external systems
 * and enqueues them for async workflow processing.
 */
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // non-JSON body is fine, treat as empty payload
  }

  const source = request.headers.get('X-Webhook-Source') ?? 'unknown';
  const id = crypto.randomUUID();

  log('info', 'Webhook received', { source, id });

  await env.CF_QUEUE.send({
    id,
    domain: 'webhook',
    action: 'process',
    payload: { source, body },
    createdAt: new Date().toISOString(),
    status: 'pending',
  });

  return new Response(JSON.stringify({ accepted: true, id }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
}
