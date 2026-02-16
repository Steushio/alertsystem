import { kv } from "@vercel/kv";

export type AlertConfig = {
  font: string;
  color: string;
  duration: number;
  template: string;
  gif?: string;
  sound?: string;
};

export async function getConfig(userId: string): Promise<AlertConfig> {
  const config = await kv.get<AlertConfig>(`config:${userId}`);

  if (!config) {
    return {
      font: "Poppins",
      color: "#ffffff",
      duration: 5,
      template: "{name} tipped ₹{amount}",
    };
  }

  return config;
}

export async function saveConfig(userId: string, config: AlertConfig) {
  await kv.set(`config:${userId}`, config);
}
