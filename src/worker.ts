import { Env, WorkflowJob } from './lib/types';
import { authenticate, unauthorized } from './lib/auth';
import { handleWebhook } from './handlers/webhooks';
import { consumeQueue } from './queue/consumer';
import { log } from './lib/logger';
import { kvGet, kvSet, kvList } from './lib/kv';

export { WorkflowDurableObject } from './workflow';

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': 'https://creatingfire.org',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default {
  // ── HTTP handler ─────────────────────────────────────────────────────────
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname: path, searchParams } = url;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Public routes ──────────────────────────────────────────────────────

    if (path === '/') {
      return json({
        service: 'creatingfire.org — Orchestration Engine',
        version: '1.0.0',
        status: 'operational',
        env: env.ENVIRONMENT,
      });
    }

    if (path === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Inbound webhooks — authenticated by X-Webhook-Source + extend with HMAC in production
    if (path === '/webhook' && method === 'POST') {
      return handleWebhook(request, env);
    }

    // ── Protected API routes ───────────────────────────────────────────────

    if (!authenticate(request, env)) {
      return unauthorized();
    }

    // POST /workflow — submit a workflow job
    if (path === '/workflow' && method === 'POST') {
      let body: Partial<WorkflowJob> = {};
      try {
        body = await request.json<Partial<WorkflowJob>>();
      } catch {
        return json({ error: 'Invalid JSON body — make sure Content-Type is application/json' }, 400);
      }

      const job: WorkflowJob = {
        id: crypto.randomUUID(),
        domain: body.domain ?? 'system',
        action: body.action ?? 'noop',
        payload: body.payload ?? {},
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      await env.CF_QUEUE.send(job);
      log('info', 'Workflow job submitted', { id: job.id, domain: job.domain, action: job.action });
      return json({ accepted: true, jobId: job.id }, 202);
    }

    // GET /workflow/:id — get workflow status via Durable Object
    if (path.startsWith('/workflow/') && method === 'GET') {
      const jobId = path.split('/')[2];
      if (!jobId) return json({ error: 'Missing job ID' }, 400);

      const doId = env.WORKFLOW_DO.idFromName(jobId);
      const stub = env.WORKFLOW_DO.get(doId);
      const resp = await stub.fetch('https://internal/status');
      const data = await resp.json();
      return json(data, resp.status);
    }

    // GET /workflows?prefix=... — list workflow keys from KV
    if (path === '/workflows' && method === 'GET') {
      const prefix = searchParams.get('prefix') ?? 'workflow:';
      const keys = await kvList(env, prefix);
      return json({ workflows: keys });
    }

    // GET /config/:key — read a config value
    if (path.startsWith('/config/') && method === 'GET') {
      const key = path.slice('/config/'.length);
      const value = await kvGet(env, `config:${key}`);
      if (value === null) return json({ error: 'Not found' }, 404);
      return json({ key, value });
    }

    // POST /config/:key — write a config value
    if (path.startsWith('/config/') && method === 'POST') {
      const key = path.slice('/config/'.length);
      let body: unknown;
      try {
        body = await request.json<unknown>();
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }
      await kvSet(env, `config:${key}`, body);
      return json({ saved: true, key });
    }

    // POST /cron — manual cron trigger (useful for testing)
    if (path === '/cron' && method === 'POST') {
      ctx.waitUntil(runCron(env));
      return json({ triggered: true });
    }

    return json({ error: 'Not Found' }, 404);
  },

  // ── Queue consumer ────────────────────────────────────────────────────────
  async queue(batch: MessageBatch<WorkflowJob>, env: Env): Promise<void> {
    await consumeQueue(batch, env);
  },

  // ── Cron scheduled handler ────────────────────────────────────────────────
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env));
  },
};

// ─── Cron Logic ───────────────────────────────────────────────────────────────

async function runCron(env: Env): Promise<void> {
  log('info', 'Cron triggered', { timestamp: new Date().toISOString() });
  await env.CF_QUEUE.send({
    id: crypto.randomUUID(),
    domain: 'system',
    action: 'health-check',
    payload: { source: 'cron' },
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
}
