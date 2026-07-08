import { Env } from './types';

export async function kvGet<T>(env: Env, key: string): Promise<T | null> {
  return env.CF_KV.get<T>(key, 'json');
}

export async function kvSet(
  env: Env,
  key: string,
  value: unknown,
  ttl?: number,
): Promise<void> {
  await env.CF_KV.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined);
}

export async function kvDelete(env: Env, key: string): Promise<void> {
  await env.CF_KV.delete(key);
}

export async function kvList(env: Env, prefix: string): Promise<string[]> {
  const result = await env.CF_KV.list({ prefix });
  return result.keys.map((k) => k.name);
}
