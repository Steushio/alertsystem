import { kv } from "@vercel/kv";

type Alert = {
  name: string;
  amount: number;
};

export async function pushAlert(token: string, alert: Alert) {
  await kv.rpush(`queue:${token}`, alert);
}

export async function peekAlert(token: string): Promise<Alert | null> {
  const list = await kv.lrange(`queue:${token}`, 0, 0);
  if (!list || list.length === 0) return null;
  return list[0] as unknown as Alert;
}

export async function clearAlert(token: string) {
  await kv.lpop(`queue:${token}`);
}
