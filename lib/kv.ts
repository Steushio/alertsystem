import { Redis } from "@upstash/redis";

/**
 * Vercel no longer ships a native KV store. Databases created from the Vercel
 * Marketplace (Upstash Redis) expose UPSTASH_REDIS_REST_URL / _TOKEN, while
 * older Vercel KV projects expose KV_REST_API_URL / _TOKEN. Support both.
 */
function readCredentials() {
  return {
    url:
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      "",
    token:
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      "",
  };
}

export function isKvConfigured(): boolean {
  const { url, token } = readCredentials();
  return Boolean(url && token);
}

let client: Redis | null = null;
let cachedUrl = "";
let cachedToken = "";

/**
 * Lazily create the Redis client so importing this module never throws during
 * a build or on routes that do not touch storage.
 */
export function getKv(): Redis {
  const { url, token } = readCredentials();

  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN " +
        "(or KV_REST_API_URL and KV_REST_API_TOKEN) to the project's environment variables."
    );
  }

  if (!client || url !== cachedUrl || token !== cachedToken) {
    client = new Redis({ url, token });
    cachedUrl = url;
    cachedToken = token;
  }

  return client;
}
