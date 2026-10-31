import { getKv } from "./kv";

export type Alert = {
  name: string;
  amount: number;
};

function queueKey(token: string) {
  return `queue:${token}`;
}

export async function pushAlert(token: string, alert: Alert) {
  // Store as stringified JSON to prevent serialization discrepancies across Redis clients
  await getKv().rpush(queueKey(token), JSON.stringify(alert));
}

export async function peekAlert(token: string): Promise<Alert | null> {
  const list = await getKv().lrange<string>(queueKey(token), 0, 0);
  if (!list || list.length === 0) return null;

  const item = list[0];
  if (typeof item === "string") {
    try {
      const parsed = JSON.parse(item) as Alert;
      return {
        name: typeof parsed.name === "string" && parsed.name ? parsed.name : "Someone",
        amount: Number(parsed.amount) || 0,
      };
    } catch {
      return { name: "Someone", amount: 0 };
    }
  }

  return item as unknown as Alert;
}

export async function clearAlert(token: string) {
  await getKv().lpop(queueKey(token));
}

export async function getQueueLength(token: string): Promise<number> {
  return getKv().llen(queueKey(token));
}
