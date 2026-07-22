import { Env, WorkflowJob } from '../lib/types';
import { log } from '../lib/logger';

/**
 * AI domain handler.
 * Calls an OpenAI-compatible gateway (AI_GATEWAY_URL + AI_GATEWAY_KEY) and
 * stores results in R2.  Outputs are publicly addressable as R2 objects at
 * key `ai-outputs/{jobId}.json`.
 */
export async function handleAI(job: WorkflowJob, env: Env): Promise<unknown> {
  log('info', 'AI handler', { action: job.action, id: job.id });

  switch (job.action) {
    case 'generate': {
      const prompt = (job.payload['prompt'] as string | undefined) ?? '';
      const model = (job.payload['model'] as string | undefined) ?? 'gpt-4o-mini';

      if (!env.AI_GATEWAY_URL || !env.AI_GATEWAY_KEY) {
        // Gateway not configured — record stub so the job still completes
        const key = `ai-outputs/${job.id}.json`;
        const result = {
          status: 'stub',
          message: 'AI gateway not configured. Set AI_GATEWAY_URL and AI_GATEWAY_KEY.',
          prompt,
          jobId: job.id,
        };
        await env.CF_R2.put(key, JSON.stringify(result));
        return result;
      }

      const resp = await fetch(`${env.AI_GATEWAY_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.AI_GATEWAY_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI gateway error ${resp.status}: ${errText}`);
      }

      const aiResponse = await resp.json<{ choices?: Array<{ message?: { content?: string } }> }>();
      const text = aiResponse.choices?.[0]?.message?.content ?? '';

      const key = `ai-outputs/${job.id}.json`;
      const output = {
        status: 'complete',
        jobId: job.id,
        model,
        prompt,
        output: text,
        generatedAt: new Date().toISOString(),
      };
      await env.CF_R2.put(key, JSON.stringify(output));
      log('info', 'AI generate complete', { key, model });
      return { status: 'complete', key, jobId: job.id };
    }

    case 'analyze': {
      const content = (job.payload['content'] as string | undefined) ?? '';
      const instruction = (job.payload['instruction'] as string | undefined) ?? 'Analyze this content.';

      if (!env.AI_GATEWAY_URL || !env.AI_GATEWAY_KEY) {
        const key = `ai-outputs/${job.id}.json`;
        const result = { status: 'stub', message: 'AI gateway not configured.', jobId: job.id };
        await env.CF_R2.put(key, JSON.stringify(result));
        return result;
      }

      const model = (job.payload['model'] as string | undefined) ?? 'gpt-4o-mini';
      const resp = await fetch(`${env.AI_GATEWAY_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.AI_GATEWAY_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: instruction },
            { role: 'user', content },
          ],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI gateway error ${resp.status}: ${errText}`);
      }

      const aiResponse = await resp.json<{ choices?: Array<{ message?: { content?: string } }> }>();
      const analysis = aiResponse.choices?.[0]?.message?.content ?? '';

      const key = `ai-outputs/${job.id}.json`;
      const output = {
        status: 'complete',
        jobId: job.id,
        model,
        analysis,
        analyzedAt: new Date().toISOString(),
      };
      await env.CF_R2.put(key, JSON.stringify(output));
      log('info', 'AI analyze complete', { key });
      return { status: 'complete', key, jobId: job.id };
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
